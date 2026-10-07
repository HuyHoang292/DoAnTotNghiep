exports.up = function(knex) {
  return knex.schema.table('users', (table) => {
    // Thêm cột giới tính (ví dụ: 'MALE', 'FEMALE', 'OTHER'), có thể để nullable hoặc tuỳ chỉnh theo nhu cầu
    table.enum('gender', ['MALE', 'FEMALE', 'OTHER']).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', (table) => {
    // Xóa cột gender nếu thực hiện rollback migration
    table.dropColumn('gender');
  });
};