const db = require('../../db/knex');
const { mapDriverLicense } = require('../../utils/mappers');

exports.listDriverLicenses = async (req, res) => {
  try {
    const rows = await db('driver_licenses')
      .where('user_id', req.user.id)
      .orderBy('issue_date', 'desc');
    return res.json({ licenses: rows.map(mapDriverLicense) });
  } catch (error) {
    console.error('Citizen driver licenses error:', error);
    return res.status(500).json({ message: 'Không thể tải giấy phép lái xe.' });
  }
};
