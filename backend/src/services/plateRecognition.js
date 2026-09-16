/**
 * plateRecognition.js
 *
 * Pipeline 2 bước nhận diện biển số xe Việt Nam:
 *
 *   Bước 1 – Model detect biển số:
 *     Roboflow: vietnam-license-plate-hjswj/2
 *     → Tìm bounding box vùng biển số trong ảnh
 *     → sharp: crop + scale lên để ảnh rõ hơn
 *
 *   Bước 2 – Model OCR ký tự:
 *     Roboflow: ocr-oy9a7/1  (KHÔNG dùng prefix workspace w251ocr)
 *     → Detect từng ký tự (class = "0","1","A","B",...)
 *     → Phân loại 2 hàng (biển 2 dòng) vs 1 hàng
 *     → Sort theo tọa độ x → ghép chuỗi biển số
 */

const sharp = require('sharp');
const { trustSystemCa } = require('../utils/trustSystemCa');

trustSystemCa();

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || '';
const ROBOFLOW_API_URL = (process.env.ROBOFLOW_API_URL || 'https://serverless.roboflow.com').replace(/\/$/, '');
// Model 1: detect vùng biển số
const PLATE_MODEL = process.env.ROBOFLOW_MODEL || 'vietnam-license-plate-hjswj';
const PLATE_VERSION = process.env.ROBOFLOW_VERSION || '2';
// Model 2: OCR ký tự — model id Universe là ocr-oy9a7/1
const OCR_MODEL = process.env.ROBOFLOW_OCR_MODEL || 'ocr-oy9a7';
const OCR_VERSION = process.env.ROBOFLOW_OCR_VER || '1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripDataUrl(img) {
  if (!img || typeof img !== 'string') return '';
  const i = img.indexOf(',');
  return img.startsWith('data:') && i !== -1 ? img.slice(i + 1) : img.replace(/\s/g, '');
}

function normalizePlate(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Format sang dạng chuẩn Việt Nam:
 *   30F12345  → 30F-123.45
 *   51G112345 → 51G1-234.56
 */
function formatVietnamPlate(raw) {
  const s = normalizePlate(raw);
  const m = s.match(/^(\d{2})([A-Z]{1,2})(\d{4,6})$/);
  if (!m) return s;
  const [, province, series, digits] = m;
  if (digits.length >= 5) {
    return `${province}${series}-${digits.slice(0, digits.length - 2)}.${digits.slice(-2)}`;
  }
  return `${province}${series}-${digits}`;
}

function looksLikePlate(t) {
  return /^\d{2}[A-Z]{1,2}\d{4,6}$/.test(normalizePlate(t));
}

function predictionClass(p) {
  return String(p?.class ?? p?.class_name ?? '').trim();
}

/** Sửa nhầm lẫn OCR theo vị trí ký tự biển Việt Nam. */
function coerceVietnamPlate(raw) {
  const s = normalizePlate(raw);
  if (s.length < 7 || s.length > 10) return s;

  const digitish = { O: '0', D: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
  const letterish = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '4': 'A', '6': 'G' };

  const chars = s.split('');
  chars[0] = digitish[chars[0]] || chars[0];
  chars[1] = digitish[chars[1]] || chars[1];
  chars[2] = letterish[chars[2]] || chars[2];

  const rest = chars.slice(3);
  const letterCount = rest.filter((c) => /[A-Z]/.test(c)).length;
  const coercedRest = rest.map((c, idx) => {
    if (idx === 0 && /[A-Z0-9]/.test(c)) return c;
    if (/[A-Z]/.test(c) && letterCount <= 1 && idx === 0) return c;
    return digitish[c] || c;
  });

  return chars.slice(0, 3).join('') + coercedRest.join('');
}

function boxIou(a, b) {
  const ax1 = a.x - a.w / 2;
  const ay1 = a.y - a.h / 2;
  const ax2 = a.x + a.w / 2;
  const ay2 = a.y + a.h / 2;
  const bx1 = b.x - b.w / 2;
  const by1 = b.y - b.h / 2;
  const bx2 = b.x + b.w / 2;
  const by2 = b.y + b.h / 2;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

function nmsChars(items) {
  const sorted = [...items].sort((a, b) => b.conf - a.conf);
  const kept = [];
  for (const item of sorted) {
    if (kept.some((k) => boxIou(k, item) > 0.45)) continue;
    kept.push(item);
  }
  return kept;
}

// ─── Roboflow call ────────────────────────────────────────────────────────────

async function callRoboflow(model, version, base64, confidence = 0.25) {
  if (!ROBOFLOW_API_KEY) throw new Error('Chưa cấu hình ROBOFLOW_API_KEY trong .env');

  const confParam = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const url =
    `${ROBOFLOW_API_URL}/${encodeURIComponent(model)}/${encodeURIComponent(version)}` +
    `?api_key=${encodeURIComponent(ROBOFLOW_API_KEY)}&confidence=${confParam}&overlap=30`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: base64,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.detail || `Roboflow HTTP ${res.status}`);
  return Array.isArray(data?.predictions) ? data.predictions : [];
}

// ─── Bước 1: detect + crop vùng biển số ──────────────────────────────────────

async function detectPlateBox(base64) {
  return callRoboflow(PLATE_MODEL, PLATE_VERSION, base64, 0.25);
}

async function cropPlate(imgBuf, pred, imgW, imgH) {
  const PAD_X = 0.04;
  const PAD_Y = 0.08;
  const bw = Number(pred.width || 0);
  const bh = Number(pred.height || 0);
  const cx = Number(pred.x || 0);
  const cy = Number(pred.y || 0);

  const left = Math.max(0, Math.floor(cx - bw / 2 - bw * PAD_X));
  const top = Math.max(0, Math.floor(cy - bh / 2 - bh * PAD_Y));
  const right = Math.min(imgW, Math.ceil(cx + bw / 2 + bw * PAD_X));
  const bottom = Math.min(imgH, Math.ceil(cy + bh / 2 + bh * PAD_Y));
  const width = right - left;
  const height = bottom - top;
  if (width < 8 || height < 8) return null;

  const targetW = Math.max(400, width * 2);
  const targetH = Math.round(height * (targetW / width));

  return sharp(imgBuf)
    .extract({ left, top, width, height })
    .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ─── Bước 2: OCR ký tự từ crop biển số ───────────────────────────────────────

async function ocrPlateChars(cropBase64) {
  return callRoboflow(OCR_MODEL, OCR_VERSION, cropBase64, 0.2);
}

function extractChar(className) {
  const raw = String(className || '').trim().toUpperCase();
  if (/^[A-Z0-9]$/.test(raw)) return raw;
  const m = raw.match(/([A-Z0-9])$/);
  return m ? m[1] : '';
}

/**
 * Ghép danh sách ký tự detection thành chuỗi biển số:
 * - Biển 1 hàng: sort theo x
 * - Biển 2 hàng: chia thành top/bottom, ghép riêng rồi concat
 */
function assembleChars(chars) {
  if (!chars.length) return '';

  const items = nmsChars(
    chars
      .map((c) => ({
        ch: extractChar(predictionClass(c)),
        x: Number(c.x),
        y: Number(c.y),
        w: Number(c.width),
        h: Number(c.height),
        conf: Number(c.confidence || 0),
      }))
      .filter((c) => c.ch),
  );
  if (!items.length) return '';

  const ys = items.map((i) => i.y);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin;
  const avgH = items.reduce((s, i) => s + i.h, 0) / items.length;

  // 1 hàng: tâm ký tự lệch ít. 2 hàng: lệch khoảng 1 chiều cao ký tự.
  const isTwoLine = yRange > avgH * 0.7 && items.length >= 6;

  let result = '';
  if (isTwoLine) {
    const midY = yMin + yRange / 2;
    const top = items.filter((i) => i.y < midY).sort((a, b) => a.x - b.x);
    const bot = items.filter((i) => i.y >= midY).sort((a, b) => a.x - b.x);
    result = top.map((i) => i.ch).join('') + bot.map((i) => i.ch).join('');
  } else {
    result = items.sort((a, b) => a.x - b.x).map((i) => i.ch).join('');
  }

  return result;
}

function pickPlateText(assembled) {
  const candidates = [assembled, coerceVietnamPlate(assembled)];
  for (const c of candidates) {
    if (looksLikePlate(c)) return formatVietnamPlate(c);
  }
  return '';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function recognizePlateFromImage(imageDataUrl) {
  const base64 = stripDataUrl(imageDataUrl);
  if (!base64) throw new Error('Không nhận được ảnh để nhận diện.');

  const imgBuf = Buffer.from(base64, 'base64');
  const meta = await sharp(imgBuf).metadata();
  const imgW = meta.width || 640;
  const imgH = meta.height || 640;

  const plateBoxes = await detectPlateBox(base64);
  const rankedBoxes = [...plateBoxes].sort(
    (a, b) => Number(b.confidence || 0) - Number(a.confidence || 0),
  );
  const bestBox = rankedBoxes[0] || null;

  let plateText = '';
  let rawText = '';
  let ocrChars = [];
  let confidence = bestBox ? Number(bestBox.confidence || 0) : 0;

  if (!bestBox) {
    console.log('[Plate] No box detected, trying full-frame OCR');
    try {
      const chars = await ocrPlateChars(base64);
      ocrChars = chars;
      rawText = assembleChars(chars);
      plateText = pickPlateText(rawText);
    } catch (err) {
      console.error('[OCR full-frame error]', err.message);
    }
    return buildResult(plateText, rawText, confidence, [], ocrChars);
  }

  for (const box of rankedBoxes.slice(0, 3)) {
    try {
      const cropBuf = await cropPlate(imgBuf, box, imgW, imgH);
      if (!cropBuf) continue;

      const cropBase64 = cropBuf.toString('base64');
      const chars = await ocrPlateChars(cropBase64);
      ocrChars = chars;

      console.log(
        `[OCR] box conf=${(Number(box.confidence || 0) * 100).toFixed(0)}%`,
        `chars detected:`,
        chars.length,
        chars.map((c) => `${predictionClass(c)}(${(Number(c.confidence || 0) * 100).toFixed(0)}%)`).join(' '),
      );

      const assembled = assembleChars(chars);
      rawText = assembled;
      const matched = pickPlateText(assembled);

      if (matched) {
        plateText = matched;
        confidence = Number(box.confidence || 0);
        break;
      }
    } catch (err) {
      console.error('[OCR crop error]', err.message);
    }
  }

  return buildResult(
    plateText,
    rawText,
    confidence,
    rankedBoxes.slice(0, 5).map((p) => ({
      class: predictionClass(p) || 'license-plate',
      confidence: Number(p.confidence || 0),
      x: Number(p.x || 0),
      y: Number(p.y || 0),
      width: Number(p.width || 0),
      height: Number(p.height || 0),
    })),
    ocrChars,
  );
}

function buildResult(plateText, rawText, confidence, detections, ocrChars = []) {
  const formatted = looksLikePlate(plateText) ? formatVietnamPlate(plateText) : '';
  return {
    plateText: formatted,
    rawText: rawText || '',
    confidence,
    detections,
    characters: ocrChars.slice(0, 20).map((p) => ({
      class: predictionClass(p),
      confidence: Number(p.confidence || 0),
    })),
  };
}

module.exports = {
  normalizePlate,
  formatVietnamPlate,
  looksLikePlate,
  recognizePlateFromImage,
};
