exports.up = function(knex) {
  return knex.schema.table('violations', (table) => {
    // Bổ sung cột due_date sau cột verified_at (có thể nullable vì chỉ tính sau khi duyệt)
    table.datetime('due_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('violations', (table) => {
    // Xóa cột due_date nếu rollback migration
    table.dropColumn('due_date');
  });
};