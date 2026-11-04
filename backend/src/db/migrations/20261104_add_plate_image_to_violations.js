exports.up = function (knex) {
  return knex.schema.alterTable('violations', (table) => {
    // Ảnh cận biển số (hoặc cận xe nếu không tìm thấy biển), để người xem đối chiếu dễ hơn ảnh toàn cảnh
    table.text('plate_image_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('violations', (table) => {
    table.dropColumn('plate_image_url');
  });
};
