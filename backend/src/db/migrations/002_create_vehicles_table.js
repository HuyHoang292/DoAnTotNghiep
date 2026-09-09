exports.up = function(knex) {
  return knex.schema.createTable('vehicles', (table) => {
    table.string('id', 36).primary();
    table.string('license_plate', 20).notNullable().unique();
    table.string('owner_id', 36).notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.enum('vehicle_type', ['CAR', 'MOTORBIKE', 'TRUCK', 'BUS', 'OTHER']).notNullable();
    table.enum('plate_color', ['WHITE', 'BLUE', 'YELLOW', 'RED']).notNullable().defaultTo('WHITE');
    table.string('brand', 50).nullable();
    table.string('model', 50).nullable();
    table.string('color', 30).nullable();
    table.string('chassis_number', 50).unique().nullable();
    table.string('engine_number', 50).unique().nullable();
    table.date('registered_at').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('vehicles');
};