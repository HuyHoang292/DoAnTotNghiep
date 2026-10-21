exports.up = async function (knex) {
  const hasSource = await knex.schema.hasColumn('violations', 'source');
  if (!hasSource) {
    await knex.schema.alterTable('violations', (table) => {
      table.enum('source', ['AI', 'OFFICER']).notNullable().defaultTo('AI');
    });
  }

  const camera = await knex('cameras').where('id', 'cam-officer-manual').first();
  if (!camera) {
    await knex('cameras').insert({
      id: 'cam-officer-manual',
      camera_code: 'OFFICER_MANUAL',
      location_name: 'Ghi nhận trực tiếp bởi cán bộ',
      road_segment: 'Hiện trường',
      status: 'ONLINE',
    });
  }

  const fines = [
    {
      violation_type: 'WRONG_LANE',
      title: 'Đi sai làn đường',
      description: 'Điều khiển phương tiện không đúng phần đường, làn đường quy định',
      min_amount: 800000.0,
      max_amount: 1200000.0,
      default_amount: 1000000.0,
    },
    {
      violation_type: 'SPEEDING',
      title: 'Chạy quá tốc độ',
      description: 'Điều khiển phương tiện chạy quá tốc độ quy định',
      min_amount: 2000000.0,
      max_amount: 4000000.0,
      default_amount: 3000000.0,
    },
    {
      violation_type: 'ILLEGAL_PARKING',
      title: 'Đỗ xe trái quy định',
      description: 'Dừng, đỗ xe không đúng nơi quy định',
      min_amount: 400000.0,
      max_amount: 1000000.0,
      default_amount: 800000.0,
    },
    {
      violation_type: 'HELMET_LESS',
      title: 'Không đội mũ bảo hiểm',
      description: 'Người điều khiển, người ngồi trên xe mô tô không đội mũ bảo hiểm',
      min_amount: 200000.0,
      max_amount: 400000.0,
      default_amount: 300000.0,
    },
    {
      violation_type: 'WRONG_WAY',
      title: 'Đi ngược chiều',
      description: 'Điều khiển phương tiện đi ngược chiều của đường một chiều, đi ngược chiều trên đường có dải phân cách',
      min_amount: 4000000.0,
      max_amount: 6000000.0,
      default_amount: 5000000.0,
    },
  ];

  for (const fine of fines) {
    const exists = await knex('fines').where('violation_type', fine.violation_type).first();
    if (!exists) {
      await knex('fines').insert(fine);
    }
  }
};

exports.down = async function (knex) {
  const hasSource = await knex.schema.hasColumn('violations', 'source');
  if (hasSource) {
    await knex.schema.alterTable('violations', (table) => {
      table.dropColumn('source');
    });
  }
};
