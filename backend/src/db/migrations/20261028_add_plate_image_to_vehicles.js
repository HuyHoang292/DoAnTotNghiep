exports.up = function(knex) {
  return knex.schema.table('vehicles', (table) => {
    table.text('plate_image_url').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('vehicles', (table) => {
    table.dropColumn('plate_image_url');
  });
};
