/**
 * plateRecognition.js
 *
 * Pipeline 2 bước nhận diện biển số xe Việt Nam dùng AI service nội bộ:
 *
 *   Bước 1 – Model detect biển số (detect_plate.pt):
 *     → Tìm bounding box vùng biển số trong ảnh
 *
 *   Bước 2 – Model OCR ký tự (read_characters.pt):
 *     → Detect từng ký tự trên vùng biển số đã crop
 *     → plate_utils.py ghép ký tự → chuỗi thô
 *
 * Cả 2 model chạy trong AI service (FastAPI) tại AI_SERVICE_URL.
 *
 * ─── Cấu trúc biển số Việt Nam (Thông tư 24/2023/TT-BCA) ──────────────────
 *
 *  Ô tô / xe tải / xe khách (biển 1 hàng):
 *    Biển cũ  4 số : DD L-NNNN         vd: 30A-1234
 *    Biển mới 5 số : DD L-NNN.NN       vd: 30F-123.45
 *    Seri 2 chữ   : DD LL-NNN.NN       vd: 51DA-123.45  (DA, HC, KT, LD, MA, TĐ…)
 *
 *  Xe máy (biển 2 hàng, hàng trên: DD+seri, hàng dưới: số):
 *    Seri cũ 4 số : DD LN-NNNN         vd: 29S1-1234
 *    Seri mới 5 số: DD LN-NNN.NN       vd: 29X1-123.45
 *    Seri LL 5 số : DD LL-NNN.NN       vd: 29AB-123.45
 *
 *  Ký tự bị loại khỏi seri: I, J, O, Q, W  (dễ nhầm; R dành cho rơ moóc)
 *  Ký tự số tỉnh: 11–99 (không có 00, hầu hết từ 11–99, một số tỉnh dùng 2 mã)
 */

const FormData = require('form-data');
const axios = require('axios');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000')
  .replace(/\/$/, '')
  .replace(/^["']|["']$/g, '');

// ─── Helpers cơ bản ───────────────────────────────────────────────────────────

function stripDataUrl(img) {
  if (!img || typeof img !== 'string') return '';
  const i = img.indexOf(',');
  return img.startsWith('data:') && i !== -1 ? img.slice(i + 1) : img.replace(/\s/g, '');
}

/** Chuẩn hóa về chữ hoa, bỏ mọi ký tự không phải A-Z 0-9 (kể cả dấu - và .) */
function normalizePlate(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ─── Phân loại & format biển số ──────────────────────────────────────────────

/**
 * Các pattern hợp lệ của biển số dân sự Việt Nam (dạng đã normalize, không có - và .):
 *
 *  Ô tô 1 chữ seri:
 *    DD L NNNN   → 7 ký tự   (biển cũ 4 số)
 *    DD L NNNNN  → 8 ký tự   (biển mới 5 số)
 *
 *  Ô tô 2 chữ seri đặc biệt (DA, HC, KT, LD, MA, TĐ, KH...):
 *    DD LL NNNNN → 9 ký tự
 *
 *  Xe máy seri LN (1 chữ + 1 số):
 *    DD LN NNNN  → 8 ký tự   (biển cũ 4 số)
 *    DD LN NNNNN → 9 ký tự   (biển mới 5 số)
 *
 *  Xe máy seri LL (2 chữ):
 *    DD LL NNNNN → 9 ký tự   (biển mới 5 số, tương tự ô tô 2 chữ)
 *
 * Chú ý: seri xe máy LN và ô tô 2 chữ LL đều cho 9 ký tự → phân biệt
 * bằng vị trí: pos[2]=chữ, pos[3]=số → xe máy LN; pos[2]=pos[3]=chữ → LL.
 *
 * Regex dùng named groups để dễ format:
 *   (?<p>\d{2})   = mã tỉnh
 *   (?<s>...)     = seri
 *   (?<n>\d{4,5}) = số thứ tự
 */
const PLATE_PATTERNS = [
  // Ô tô 1 chữ seri – 4 hoặc 5 số
  { re: /^(?<p>\d{2})(?<s>[A-HK-NPR-Z])(?<n>\d{4,5})$/, type: 'car' },
  // Xe máy seri 1 chữ + 1 số – 4 hoặc 5 số
  { re: /^(?<p>\d{2})(?<s>[A-HK-NPR-Z]\d)(?<n>\d{4,5})$/, type: 'moto_ln' },
  // Xe máy / ô tô seri 2 chữ – 5 số  (LL series: DA, HC, KT, LD, MA, AB…)
  { re: /^(?<p>\d{2})(?<s>[A-HK-NPR-Z]{2})(?<n>\d{4,5})$/, type: 'moto_ll' },
];

function matchPlate(normalized) {
  for (const { re, type } of PLATE_PATTERNS) {
    const m = normalized.match(re);
    if (m) return { ...m.groups, type };
  }
  return null;
}

function looksLikePlate(t) {
  return matchPlate(normalizePlate(t)) !== null;
}

/**
 * Format chuỗi đã normalize thành dạng hiển thị chuẩn Việt Nam:
 *   30F12345  → 30F-123.45
 *   30A1234   → 30A-1234
 *   29X11234  → 29X1-1234     (xe máy LN 4 số)
 *   29X112345 → 29X1-123.45   (xe máy LN 5 số)
 *   51DA12345 → 51DA-123.45   (seri 2 chữ)
 */
function formatVietnamPlate(raw) {
  const s = normalizePlate(raw);
  const groups = matchPlate(s);
  if (!groups) return s; // không nhận ra → trả nguyên

  const { p, s: seri, n } = groups;
  if (n.length === 5) {
    return `${p}${seri}-${n.slice(0, 3)}.${n.slice(3)}`;
  }
  // 4 số: không có dấu chấm
  return `${p}${seri}-${n}`;
}

// ─── Sửa lỗi OCR theo luật vị trí ký tự biển Việt Nam ───────────────────────

/**
 * OCR hay nhầm chữ-số tại các vị trí cố định.
 * Áp dụng theo từng vị trí trong chuỗi đã normalize (không dấu - .).
 *
 * Vị trí 0, 1  → bắt buộc là số  (mã tỉnh DD)
 * Vị trí 2     → bắt buộc là chữ (ký tự đầu seri)
 * Vị trí 3     → chữ (ô tô LL) hoặc số (xe máy LN) hoặc số (ô tô 1 chữ)
 *               → thử cả 2 rồi để looksLikePlate() phán quyết
 * Vị trí 4+    → bắt buộc là số (số thứ tự)
 *
 * Bảng nhầm lẫn thường gặp:
 *   Số bị đọc thành chữ : 0→O, 1→I/L, 2→Z, 5→S, 8→B, 6→G
 *   Chữ bị đọc thành số : O→0, I→1, L→1, Z→2, S→5, B→8, G→6
 */
const TO_DIGIT = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
const TO_LETTER = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '4': 'A', '6': 'G' };

function coerceVietnamPlate(raw) {
  const s = normalizePlate(raw);
  if (s.length < 7 || s.length > 10) return s;

  const c = s.split('');

  // Vị trí 0, 1: phải là số
  c[0] = TO_DIGIT[c[0]] ?? c[0];
  c[1] = TO_DIGIT[c[1]] ?? c[1];

  // Vị trí 2: phải là chữ
  c[2] = TO_LETTER[c[2]] ?? c[2];

  // Vị trí 3: thử 2 khả năng – giữ nguyên để looksLikePlate() quyết định
  // (sẽ thử cả phiên bản chữ lẫn số ở pickPlateText)

  // Vị trí 4 trở đi: phải là số
  for (let i = 4; i < c.length; i++) {
    c[i] = TO_DIGIT[c[i]] ?? c[i];
  }

  return c.join('');
}

/**
 * Từ raw OCR string, thử các biến thể sửa lỗi và trả về biển số đã format,
 * hoặc '' nếu không match được pattern nào.
 */
function pickPlateText(raw) {
  const s = normalizePlate(raw);
  if (!s) return '';

  // Biến thể 1: giữ nguyên
  // Biến thể 2: coerce theo luật vị trí
  const coerced = coerceVietnamPlate(s);

  // Biến thể 3: vị trí 3 ép thành số (ô tô 1 chữ seri)
  const asDigit3 = (() => {
    const c = coerced.split('');
    if (c.length > 3) c[3] = TO_DIGIT[c[3]] ?? c[3];
    return c.join('');
  })();

  // Biến thể 4: vị trí 3 ép thành chữ (xe máy LL hoặc ô tô 2 chữ seri)
  const asLetter3 = (() => {
    const c = coerced.split('');
    if (c.length > 3) c[3] = TO_LETTER[c[3]] ?? c[3];
    return c.join('');
  })();

  for (const candidate of [s, coerced, asDigit3, asLetter3]) {
    if (looksLikePlate(candidate)) {
      return formatVietnamPlate(candidate);
    }
  }
  return '';
}

// ─── Gọi AI service nội bộ ───────────────────────────────────────────────────

/**
 * Gửi ảnh base64 lên AI service FastAPI (POST /api/ai/detect-plate)
 * Trả về mảng detections từ 2 model YOLO nội bộ.
 */
async function callAiService(base64) {
  const imgBuf = Buffer.from(base64, 'base64');

  const form = new FormData();
  form.append('file', imgBuf, {
    filename: 'plate.jpg',
    contentType: 'image/jpeg',
  });

  let response;
  try {
    response = await axios.post(`${AI_SERVICE_URL}/api/ai/detect-plate`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.detail || err?.response?.data?.message || err.message;
    throw new Error(
      status
        ? `AI service lỗi HTTP ${status}: ${msg}`
        : `Không kết nối được AI service (${AI_SERVICE_URL}). Hãy chắc chắn AI service đang chạy.`,
    );
  }

  const data = response.data;
  if (!data?.success) throw new Error('AI service trả về lỗi.');
  return Array.isArray(data.detections) ? data.detections : [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function recognizePlateFromImage(imageDataUrl) {
  const base64 = stripDataUrl(imageDataUrl);
  if (!base64) throw new Error('Không nhận được ảnh để nhận diện.');

  // Gọi AI service — mỗi detection đã bao gồm plate_text và ocr_confidence
  const detections = await callAiService(base64);

  if (!detections || detections.length === 0) {
    return buildResult('', '', 0, [], []);
  }

  // Sắp xếp theo confidence của khung biển cao nhất
  const ranked = [...detections].sort(
    (a, b) => (b.plate_detection_confidence || 0) - (a.plate_detection_confidence || 0),
  );

  let plateText = '';
  let rawText = '';
  let confidence = 0;

  for (const det of ranked) {
    const raw = String(det.plate_text || '').toUpperCase().replace(/\s/g, '');
    rawText = rawText || raw;
    confidence = confidence || Number(det.plate_detection_confidence || 0);

    const matched = pickPlateText(raw);
    if (matched) {
      plateText = matched;
      confidence = Number(det.plate_detection_confidence || 0);
      rawText = raw;
      break;
    }
  }

  // Nếu không match định dạng, vẫn trả về rawText của khung tốt nhất
  if (!rawText && ranked[0]) {
    rawText = String(ranked[0].plate_text || '').toUpperCase().replace(/\s/g, '');
    confidence = Number(ranked[0].plate_detection_confidence || 0);
  }

  const detectionList = ranked.slice(0, 5).map((d) => ({
    class: 'license-plate',
    confidence: Number(d.plate_detection_confidence || 0),
    x: (d.bbox?.x1 + d.bbox?.x2) / 2 || 0,
    y: (d.bbox?.y1 + d.bbox?.y2) / 2 || 0,
    width: (d.bbox?.x2 - d.bbox?.x1) || 0,
    height: (d.bbox?.y2 - d.bbox?.y1) || 0,
  }));

  return buildResult(plateText, rawText, confidence, detectionList, []);
}

function buildResult(plateText, rawText, confidence, detections, ocrChars = []) {
  const formatted = looksLikePlate(plateText) ? formatVietnamPlate(plateText) : '';
  return {
    plateText: formatted,
    rawText: rawText || '',
    confidence,
    detections,
    characters: ocrChars,
  };
}

module.exports = {
  normalizePlate,
  formatVietnamPlate,
  looksLikePlate,
  recognizePlateFromImage,
};
