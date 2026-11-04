const db = require('../../db/knex');
const { mapCamera, mapCameraEvent } = require('../../utils/mappers');
const { isStoredVideoUrl } = require('../../services/imageStorage');
const cameraMonitoring = require('../../services/cameraMonitoring');
const { now } = require('./helpers');

// Gắn / gỡ video mẫu cho camera (videoUrl rỗng = gỡ video)
exports.updateCameraVideo = async (req, res) => {
  try {
    const camera = await db('cameras').where('id', req.params.id).first();
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy camera.' });
    }

    const videoUrl = String(req.body?.videoUrl ?? '').trim();
    if (videoUrl && !isStoredVideoUrl(videoUrl)) {
      return res.status(400).json({ message: 'Link video phải là video trên Cloudinary của hệ thống (…/video/upload/…).' });
    }

    await db('cameras').where('id', camera.id).update({ video_url: videoUrl || null, updated_at: now() });
    const updated = await db('cameras').where('id', camera.id).first();
    return res.json({ camera: mapCamera(updated) });
  } catch (error) {
    console.error('Update camera video error:', error);
    return res.status(500).json({ message: 'Không thể cập nhật video camera.' });
  }
};

function parseStopLine(input) {
  const line = {};
  for (const key of ['x1', 'y1', 'x2', 'y2']) {
    const value = Number(input?.[key]);
    if (input?.[key] === null || !Number.isFinite(value) || value < 0 || value > 1) return null;
    line[key] = value;
  }
  if (line.x1 === line.x2 && line.y1 === line.y2) return null;
  line.travelSide = Number(input?.travelSide);
  return line.travelSide === 1 || line.travelSide === -1 ? line : null;
}

function parseSignalConfig(input) {
  if (input?.mode === 'VISION') {
    const roi = {};
    for (const key of ['x1', 'y1', 'x2', 'y2']) {
      const value = Number(input.roi?.[key]);
      if (input.roi?.[key] === null || !Number.isFinite(value) || value < 0 || value > 1) return null;
      roi[key] = value;
    }
    return roi.x2 > roi.x1 && roi.y2 > roi.y1 ? { mode: 'VISION', roi } : null;
  }
  const signal = {
    mode: 'SIMULATED',
    green: Number(input?.green),
    yellow: Number(input?.yellow),
    red: Number(input?.red),
    offset: Number(input?.offset ?? 0),
  };
  const valid = [signal.green, signal.yellow, signal.red, signal.offset].every(Number.isFinite)
    && signal.green > 0 && signal.yellow >= 0 && signal.red > 0 && signal.offset >= 0;
  return valid ? signal : null;
}

// Lưu vạch dừng và nguồn tín hiệu đèn của camera
exports.updateCameraRedLightConfig = async (req, res) => {
  try {
    const camera = await db('cameras').where('id', req.params.id).first();
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy camera.' });
    }

    const stopLine = parseStopLine(req.body?.stopLine);
    if (!stopLine) {
      return res.status(400).json({ message: 'Vạch dừng không hợp lệ.' });
    }
    const signalConfig = parseSignalConfig(req.body?.signalConfig);
    if (!signalConfig) {
      return res.status(400).json({ message: 'Cấu hình đèn không hợp lệ: cần khoanh vùng đèn, hoặc thời gian đèn xanh và đỏ phải lớn hơn 0.' });
    }

    await db('cameras').where('id', camera.id).update({
      stop_line: JSON.stringify(stopLine),
      signal_config: JSON.stringify(signalConfig),
      updated_at: now(),
    });
    const updated = await db('cameras').where('id', camera.id).first();
    // Đang giám sát thì áp dụng cấu hình mới ngay
    if (updated.monitoring) await cameraMonitoring.startMonitoring(updated);
    return res.json({ camera: mapCamera(updated) });
  } catch (error) {
    console.error('Update camera red light config error:', error);
    return res.status(500).json({ message: 'Không thể lưu cấu hình.' });
  }
};

// Bật giám sát liên tục: AI theo dõi camera và tự ghi nhận vi phạm
exports.startCameraMonitoring = async (req, res) => {
  try {
    const camera = await db('cameras').where('id', req.params.id).first();
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy camera.' });
    }
    if (!camera.video_url || !camera.stop_line || !camera.signal_config) {
      return res.status(400).json({ message: 'Camera cần có video, vạch dừng và cấu hình đèn trước khi giám sát.' });
    }

    await cameraMonitoring.startMonitoring(camera);
    await db('cameras').where('id', camera.id).update({ monitoring: true, updated_at: now() });
    const updated = await db('cameras').where('id', camera.id).first();
    return res.json({ camera: mapCamera(updated) });
  } catch (error) {
    console.error('Start camera monitoring error:', error);
    return res.status(502).json({ message: error.message || 'Không bật được giám sát.' });
  }
};

exports.stopCameraMonitoring = async (req, res) => {
  try {
    const camera = await db('cameras').where('id', req.params.id).first();
    if (!camera) {
      return res.status(404).json({ message: 'Không tìm thấy camera.' });
    }

    await db('cameras').where('id', camera.id).update({ monitoring: false, updated_at: now() });
    await cameraMonitoring.stopMonitoring(camera.id);
    const updated = await db('cameras').where('id', camera.id).first();
    return res.json({ camera: mapCamera(updated) });
  } catch (error) {
    console.error('Stop camera monitoring error:', error);
    return res.status(500).json({ message: 'Không tắt được giám sát.' });
  }
};

// Trạng thái giám sát và các vi phạm AI vừa ghi nhận
exports.getCameraMonitoring = async (req, res) => {
  try {
    const events = await db('camera_events')
      .where({ camera_id: req.params.id, is_violation: true })
      .orderBy('created_at', 'desc')
      .limit(12);
    return res.json({
      status: await cameraMonitoring.getStatus(req.params.id),
      events: events.map(mapCameraEvent),
    });
  } catch (error) {
    console.error('Get camera monitoring error:', error);
    return res.status(500).json({ message: 'Không tải được trạng thái giám sát.' });
  }
};

// Khung hình mới nhất đã vẽ khung xe; dùng fetch kèm token nên không cần đưa token lên URL
exports.getCameraLiveFrame = async (req, res) => {
  try {
    const frame = await cameraMonitoring.getFrame(req.params.id);
    if (!frame) return res.status(204).end();
    res.set('Cache-Control', 'no-store');
    return res.type('image/jpeg').send(frame);
  } catch (error) {
    return res.status(204).end();
  }
};
