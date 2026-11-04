const db = require('../../db/knex');
const { mapVehicle, mapOwner, mapViolation, mapInvoice } = require('../../utils/mappers');
const { normalizePlate, recognizePlateFromImage } = require('../../services/plateRecognition');
const { uploadImage, isDataUrlImage } = require('../../services/imageStorage');

async function lookupByPlate(plateInput) {
  const key = normalizePlate(plateInput);
  if (!key) return null;

  const vehicles = await db('vehicles as veh')
    .leftJoin('users as u', 'u.id', 'veh.owner_id')
    .select('veh.*', 'u.full_name', 'u.national_id', 'u.email', 'u.phone', 'u.role', 'u.status', 'u.id as owner_row_id');

  const vehicleRow = vehicles.find((row) => normalizePlate(row.license_plate) === key) || null;
  const vehicle = vehicleRow ? mapVehicle(vehicleRow) : null;
  const owner = vehicleRow
    ? mapOwner({
        id: vehicleRow.owner_id,
        full_name: vehicleRow.full_name,
        national_id: vehicleRow.national_id,
        email: vehicleRow.email,
        phone: vehicleRow.phone,
        role: vehicleRow.role,
        status: vehicleRow.status,
      })
    : null;

  const violationRows = await db('violations as v')
    .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
    .leftJoin('cameras as c', 'c.id', 'v.camera_id')
    .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
    .select(
      'v.*',
      'veh.license_plate',
      'c.location_name',
      'f.title as fine_title',
      'f.description as fine_description',
      'f.min_amount',
      'f.max_amount',
      'f.default_amount'
    )
    .modify((query) => {
      query.where(function () {
        this.whereRaw(
          "REPLACE(REPLACE(REPLACE(UPPER(v.detected_plate_text), ' ', ''), '.', ''), '-', '') = ?",
          [key],
        );
        if (vehicle) {
          this.orWhere('v.vehicle_id', vehicle.id);
        }
      });
    })
    .orderBy('v.detected_at', 'desc');

  const violations = violationRows.map(mapViolation);
  const invoices = violations.length
    ? await db('invoices')
        .whereIn('violation_id', violations.map((item) => item.id))
        .select('*')
        .orderBy('issue_date', 'desc')
    : [];

  return {
    plate: vehicle?.licensePlate || plateInput,
    vehicle,
    owner,
    violations,
    invoices: invoices.map(mapInvoice),
  };
}

exports.lookupPlate = async (req, res) => {
  try {
    const plate = String(req.query.plate || req.params.plate || '').trim();
    if (!plate) {
      return res.status(400).json({ message: 'Vui lòng nhập biển số xe.' });
    }
    const result = await lookupByPlate(plate);
    return res.json(result);
  } catch (error) {
    console.error('Lookup plate error:', error);
    return res.status(500).json({ message: 'Không thể tra cứu biển số.' });
  }
};

exports.scanPlate = async (req, res) => {
  try {
    const image = req.body?.image;
    if (!image) {
      return res.status(400).json({ message: 'Thiếu ảnh camera để nhận diện.' });
    }

    const recognized = await recognizePlateFromImage(image);
    if (!recognized.plateText) {
      const hasBox = recognized.detections && recognized.detections.length > 0;
      const hasChars = Boolean(recognized.rawText);
      return res.status(422).json({
        message: hasChars
          ? `Đã đọc được ký tự "${recognized.rawText}" nhưng chưa khớp định dạng biển số Việt Nam. Hãy sửa lại ô nhập rồi bấm Tra cứu.`
          : hasBox
            ? `Đã phát hiện vùng biển số (confidence ${Math.round((recognized.confidence || 0) * 100)}%) nhưng chưa đọc được ký tự. Hãy đưa camera gần hơn, đảm bảo ánh sáng đủ và biển số nằm trong khung vuông.`
            : 'Không tìm thấy biển số trong ảnh. Hãy canh biển số vào khung vuông xanh và giữ yên tay.',
        ...recognized,
        plate: recognized.rawText || '',
        vehicle: null,
        owner: null,
        violations: [],
        invoices: [],
      });
    }

    const result = await lookupByPlate(recognized.plateText);
    return res.json({
      ...recognized,
      ...result,
      plate: result?.vehicle?.licensePlate || recognized.plateText,
    });
  } catch (error) {
    console.error('Scan plate error:', error);
    return res.status(500).json({
      message: error.message || 'Không thể nhận diện biển số.',
    });
  }
};

// Tải ảnh biển số lên Cloudinary và cho AI service đọc biển số cùng lúc.
// Đọc biển số thất bại vẫn trả về URL ảnh để cán bộ tự nhập tay.
exports.uploadPlateImage = async (req, res) => {
  try {
    const image = req.body?.image;
    const purpose = req.body?.purpose === 'vehicles' ? 'vehicles' : 'violations';
    if (!isDataUrlImage(image)) {
      return res.status(400).json({ message: 'Ảnh không hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP).' });
    }

    const [uploaded, recognized] = await Promise.allSettled([
      uploadImage(image, { subfolder: purpose }),
      recognizePlateFromImage(image),
    ]);

    if (uploaded.status === 'rejected') {
      console.error('Upload plate image error:', uploaded.reason);
      return res.status(502).json({
        message: `Không tải được ảnh lên kho lưu trữ: ${uploaded.reason?.message || 'lỗi không xác định'}`,
      });
    }

    const result = recognized.status === 'fulfilled' ? recognized.value : null;
    const plateText = result?.plateText || '';
    let message = '';
    if (recognized.status === 'rejected') {
      const reason = String(recognized.reason?.message || 'AI service lỗi').replace(/\.+$/, '');
      message = `Đã lưu ảnh nhưng chưa đọc được biển số: ${reason}. Hãy nhập tay.`;
    } else if (!plateText) {
      message = result?.rawText
        ? `Đọc được "${result.rawText}" nhưng chưa khớp định dạng biển số Việt Nam. Hãy kiểm tra và sửa lại.`
        : 'Đã lưu ảnh nhưng không tìm thấy biển số trong ảnh. Hãy nhập tay.';
    }

    return res.json({
      imageUrl: uploaded.value.url,
      plateText,
      rawText: result?.rawText || '',
      confidence: result?.confidence || 0,
      message,
    });
  } catch (error) {
    console.error('Upload plate image error:', error);
    return res.status(500).json({ message: 'Không thể xử lý ảnh biển số.' });
  }
};
