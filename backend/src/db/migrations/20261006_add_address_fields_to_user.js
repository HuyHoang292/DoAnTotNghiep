exports.up = function(knex) {
  return knex.schema.table('users', (table) => {
    table.string('address', 255).nullable(); // Địa chỉ chi tiết (số nhà, tên đường...)
    table.string('ward', 100).nullable();     // Phường / Xã
    table.string('city', 100).nullable();     // Thành phố
    table.string('province', 100).nullable(); // Tỉnh 
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('address');
    table.dropColumn('ward');
    table.dropColumn('city');
    table.dropColumn('province');
  });
};