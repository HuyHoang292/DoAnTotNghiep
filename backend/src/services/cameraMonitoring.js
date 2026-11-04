/**
 * cameraMonitoring.js
 *
 * Yêu cầu AI service giám sát liên tục các camera đang bật, định kỳ lấy vi phạm mới về,
 * lưu vào camera_events và tạo vi phạm AI_PENDING chờ cán bộ duyệt.
 */

const crypto = require('crypto');
const axios = require('axios');
const db = require('../db/knex');
const { pickPlateText, normalizePlate } = require('./plateRecognition');
const { uploadImage } = require('./imageStorage');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000')
  .replace(/\/$/, '')
  .replace(/^["']|["']$/g, '');

const SYNC_INTERVAL_MS = 2000;
// Video mẫu phát lặp lại: cùng thời điểm và cùng vị trí là xe đã ghi nhận ở vòng trước
const REPEAT_WINDOW_SECONDS = 0.4;
const REPEAT_MAX_DISTANCE = 0.08;
// Cùng một biển số trong khoảng này là một xe bị đếm lại do đổi ID theo dõi
const SAME_PLATE_WINDOW_SECONDS = 10;
// detected_plate_text không được rỗng; cán bộ phải nhập lại trước khi xác minh
const UNREAD_PLATE = 'CHUA-DOC-DUOC';

// Vị trí đã lấy sự kiện của từng camera: { session, seq }
const cursors = new Map();
let syncing = false;

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

// 8 ký tự như 75H18065 khớp cả biển ô tô (75H-180.65) lẫn xe máy (75H1-8065); AI đã biết loại xe nên tách đúng
function formatForVehicle(plate, vehicleClass) {
  const moto = normalizePlate(plate).match(/^(\d{2}[A-Z]\d)(\d{4})$/);
  return vehicleClass === 'motorcycle' && moto ? `${moto[1]}-${moto[2]}` : plate;
}

// OCR hay đọc thiếu ký tự chứ ít khi đọc thừa, nên ưu tiên chuỗi dài nhất; bằng nhau thì ưu tiên
// chuỗi không phải tự sửa ký tự, rồi mới tới thứ hạng theo số lần đọc được
function bestPlate(candidates, vehicleClass) {
  const valid = (candidates || [])
    .map((candidate, rank) => {
      const picked = pickPlateText(candidate.text);
      const raw = normalizePlate(candidate.text);
      return picked && { candidate, rank, picked, length: raw.length, exact: normalizePlate(picked) === raw };
    })
    .filter(Boolean)
    .sort((a, b) => b.length - a.length || Number(b.exact) - Number(a.exact) || a.rank - b.rank);

  if (valid.length === 0) return { plate: UNREAD_PLATE, confidence: 0, image: null };
  const { candidate, picked } = valid[0];
  return {
    plate: formatForVehicle(picked, vehicleClass),
    confidence: Number(candidate.confidence) || 0,
    image: candidate.image,
  };
}

function boxCenter(box, size) {
  return { x: (box.x1 + box.x2) / 2 / size.width, y: (box.y1 + box.y2) / 2 / size.height };
}

async function findDuplicate(cameraId, videoUrl, event, plate) {
  const nearby = await db('camera_events')
    .where({ camera_id: cameraId, source_video_url: videoUrl })
    .whereBetween('video_timestamp', [
      event.video_timestamp - SAME_PLATE_WINDOW_SECONDS,
      event.video_timestamp + SAME_PLATE_WINDOW_SECONDS,
    ]);

  const center = boxCenter(event.bbox, event.frame_size);
  return nearby.find((row) => {
    if (plate !== UNREAD_PLATE && row.detected_plate_text === plate) return true;
    if (Math.abs(row.video_timestamp - event.video_timestamp) > REPEAT_WINDOW_SECONDS) return false;
    const other = boxCenter(parseJson(row.bounding_box), event.frame_size);
    return Math.hypot(center.x - other.x, center.y - other.y) <= REPEAT_MAX_DISTANCE;
  });
}

// Vi phạm ghi nhận trước khi có ảnh cận sẽ được bổ sung khi video lặp lại tới đúng xe đó
async function backfillCloseup(eventRow, closeup) {
  if (!eventRow.promoted_violation_id) return;
  const violation = await db('violations').where('id', eventRow.promoted_violation_id).first();
  if (!violation || violation.plate_image_url) return;
  const { url } = await uploadImage(closeup, { subfolder: 'camera-events', publicId: `${eventRow.id}-closeup` });
  await db('violations').where('id', violation.id).update({ plate_image_url: url, updated_at: new Date() });
}

// Lần trước chưa đọc được biển mà lần này đọc được: cập nhật cho vi phạm còn chờ duyệt
async function backfillPlate(eventRow, plate, confidence) {
  if (plate === UNREAD_PLATE || !eventRow.promoted_violation_id) return;
  const violation = await db('violations')
    .where({ id: eventRow.promoted_violation_id, status: 'AI_PENDING', detected_plate_text: UNREAD_PLATE })
    .first();
  if (!violation) return;

  const vehicle = await findVehicle(plate);
  const now = new Date();
  await db('violations').where('id', violation.id).update({
    detected_plate_text: plate,
    ocr_confidence: confidence,
    vehicle_id: vehicle?.id || null,
    updated_at: now,
  });
  await db('camera_events').where('id', eventRow.id).update({ detected_plate_text: plate, ocr_confidence: confidence });
}

function findVehicle(plate) {
  return db('vehicles')
    .whereRaw(
      "UPPER(REPLACE(REPLACE(REPLACE(license_plate, ' ', ''), '.', ''), '-', '')) = ?",
      [normalizePlate(plate)],
    )
    .first();
}

async function saveEvent(camera, event) {
  const { plate, confidence, image } = bestPlate(event.plate_candidates, event.vehicle_class);
  const closeup = image || event.closeup;
  const duplicate = await findDuplicate(camera.id, camera.video_url, event, plate);
  if (duplicate) {
    await backfillCloseup(duplicate, closeup);
    await backfillPlate(duplicate, plate, confidence);
    return;
  }

  const eventId = crypto.randomUUID();
  const violationId = crypto.randomUUID();
  const { url: snapshotUrl } = await uploadImage(event.snapshot, { subfolder: 'camera-events', publicId: eventId });
  const { url: plateImageUrl } = await uploadImage(closeup, { subfolder: 'camera-events', publicId: `${eventId}-closeup` });

  const vehicle = plate === UNREAD_PLATE ? null : await findVehicle(plate);

  const now = new Date();
  await db.transaction(async (trx) => {
    await trx('violations').insert({
      id: violationId,
      camera_id: camera.id,
      vehicle_id: vehicle?.id || null,
      detected_plate_text: plate,
      ocr_confidence: confidence,
      violation_type: 'RED_LIGHT',
      evidence_image_url: snapshotUrl,
      plate_image_url: plateImageUrl,
      evidence_video_url: `${camera.video_url}#t=${Math.max(0, event.video_timestamp - 2).toFixed(1)}`,
      detected_at: now,
      status: 'AI_PENDING',
      source: 'AI',
      created_at: now,
      updated_at: now,
    });
    await trx('camera_events').insert({
      id: eventId,
      camera_id: camera.id,
      video_timestamp: event.video_timestamp,
      detected_plate_text: plate === UNREAD_PLATE ? null : plate,
      ocr_confidence: plate === UNREAD_PLATE ? null : confidence,
      bounding_box: JSON.stringify({ ...event.bbox }),
      is_violation: true,
      violation_type: 'RED_LIGHT',
      snapshot_url: snapshotUrl,
      promoted_violation_id: violationId,
      signal_state: event.signal_state,
      vehicle_class: event.vehicle_class,
      track_id: event.track_id,
      source_video_url: camera.video_url,
      created_at: now,
    });
  });
}

async function startMonitoring(camera) {
  try {
    await axios.post(
      `${AI_SERVICE_URL}/api/ai/monitors/${camera.id}`,
      { video_url: camera.video_url, stop_line: parseJson(camera.stop_line), signal: parseJson(camera.signal_config) },
      { timeout: 30000 },
    );
  } catch (error) {
    throw new Error(
      error.response
        ? `AI service lỗi HTTP ${error.response.status}.`
        : `Không kết nối được AI service (${AI_SERVICE_URL}). Hãy chắc chắn AI service đang chạy.`,
    );
  }
  cursors.delete(camera.id);
}

async function stopMonitoring(cameraId) {
  cursors.delete(cameraId);
  await axios.delete(`${AI_SERVICE_URL}/api/ai/monitors/${cameraId}`, { timeout: 10000 })
    .catch((error) => console.error('Cannot stop camera monitor:', error.message));
}

async function syncCamera(camera) {
  let info;
  try {
    ({ data: info } = await axios.get(`${AI_SERVICE_URL}/api/ai/monitors/${camera.id}`, { timeout: 10000 }));
  } catch (error) {
    // AI service khởi động lại nên mất luồng giám sát: bật lại vì camera vẫn đang ở trạng thái giám sát
    if (error.response?.status === 404) await startMonitoring(camera);
    return;
  }

  const cursor = cursors.get(camera.id);
  const after = cursor?.session === info.session ? cursor.seq : 0;
  if (info.last_seq <= after) return;

  const { data } = await axios.get(
    `${AI_SERVICE_URL}/api/ai/monitors/${camera.id}/events`,
    { params: { after }, timeout: 30000 },
  );
  for (const event of data.events) {
    await saveEvent(camera, event);
    cursors.set(camera.id, { session: data.session, seq: event.seq });
  }
}

async function syncAll() {
  if (syncing) return;
  syncing = true;
  try {
    const cameras = await db('cameras').where('monitoring', true);
    for (const camera of cameras) {
      try {
        await syncCamera(camera);
      } catch (error) {
        console.error(`Camera monitoring sync error (${camera.id}):`, error.message);
      }
    }
  } catch (error) {
    console.error('Camera monitoring sync error:', error.message);
  } finally {
    syncing = false;
  }
}

function startMonitoringLoop() {
  setInterval(syncAll, SYNC_INTERVAL_MS).unref();
}

async function getStatus(cameraId) {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/api/ai/monitors/${cameraId}`, { timeout: 5000 });
    return {
      status: data.status,
      error: data.error,
      loops: data.loops,
      videoTime: data.video_time,
      signalState: data.signal_state,
      crossedAllowed: data.crossed_allowed,
      violations: data.violations,
      processingFps: data.processing_fps,
    };
  } catch (error) {
    return { status: error.response?.status === 404 ? 'STOPPED' : 'AI_OFFLINE' };
  }
}

async function getFrame(cameraId) {
  const response = await axios.get(`${AI_SERVICE_URL}/api/ai/monitors/${cameraId}/frame`, {
    responseType: 'arraybuffer',
    timeout: 5000,
  });
  return response.status === 200 ? Buffer.from(response.data) : null;
}

module.exports = { bestPlate, startMonitoring, stopMonitoring, startMonitoringLoop, getStatus, getFrame, UNREAD_PLATE };
