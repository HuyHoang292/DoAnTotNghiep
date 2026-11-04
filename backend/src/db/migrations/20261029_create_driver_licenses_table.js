exports.up = function(knex) {
  return knex.schema.createTable('driver_licenses', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    // Số giấy phép lái xe (GPLX gồm 12 chữ số)
    table.string('license_number', 20).notNullable().unique();
    // Hạng bằng lái: hỗ trợ cả hạng cũ (A1, A2, B2, FC...) và hạng mới theo luật 2024 (A, B, C1, CE...)
    table.string('license_class', 10).notNullable();
    table.date('issue_date').notNullable();
    // Null nếu bằng không thời hạn (ví dụ hạng A1, A2)
    table.date('expiry_date').nullable();
    table.string('issued_by', 100).nullable();
    table.enum('status', ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED']).notNullable().defaultTo('ACTIVE');
    table.timestamps(true, true);
    // Một người không có 2 bằng cùng hạng
    table.unique(['user_id', 'license_class']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('driver_licenses');
};
