/**
 * imageStorage.js
 *
 * Lưu ảnh lên Cloudinary, database chỉ giữ URL trả về (secure_url).
 * Muốn đổi sang S3 / MinIO sau này chỉ cần viết lại file này.
 */

const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || 'doantotnghiep';
const SUBFOLDERS = ['vehicles', 'violations', 'camera-events'];
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

function isDataUrlImage(value) {
  return typeof value === 'string' && DATA_URL_RE.test(value);
}

/** Chỉ chấp nhận URL ảnh nằm trong tài khoản Cloudinary của hệ thống */
function isStoredImageUrl(value) {
  if (typeof value !== 'string' || !process.env.CLOUDINARY_CLOUD_NAME) return false;
  return value.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
}

/** Chỉ chấp nhận URL video nằm trong tài khoản Cloudinary của hệ thống */
function isStoredVideoUrl(value) {
  if (typeof value !== 'string' || !process.env.CLOUDINARY_CLOUD_NAME) return false;
  return value.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/`);
}

/**
 * Upload ảnh data URL base64 (data:image/jpeg;base64,...) lên Cloudinary.
 * Trả về { url, publicId }.
 */
async function uploadImage(dataUrl, { subfolder = 'violations', publicId } = {}) {
  if (!isConfigured()) {
    throw new Error('Chưa cấu hình Cloudinary (CLOUDINARY_* trong .env).');
  }
  if (!isDataUrlImage(dataUrl)) {
    throw new Error('Ảnh không hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP).');
  }
  const folder = SUBFOLDERS.includes(subfolder) ? subfolder : 'violations';

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `${FOLDER}/${folder}`,
    public_id: publicId,
    resource_type: 'image',
    // Thu nhỏ ảnh trước khi lưu để tiết kiệm dung lượng
    transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function deleteImage(publicId) {
  if (publicId && isConfigured()) await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadImage, deleteImage, isDataUrlImage, isStoredImageUrl, isStoredVideoUrl };
