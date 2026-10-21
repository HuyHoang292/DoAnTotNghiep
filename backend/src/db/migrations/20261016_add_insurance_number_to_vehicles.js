exports.up = function(knex) {
  return knex.schema.table('vehicles', (table) => {
    table.string('insurance_number', 50).nullable().unique();
  });
};

exports.down = function(knex) {
  return knex.schema.table('vehicles', (table) => {
    table.dropColumn('insurance_number');
  });
};
