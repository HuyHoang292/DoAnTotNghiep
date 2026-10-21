exports.up = function(knex) {
  return knex.schema
    .table('vehicles', (table) => {
      table.enum('verification_status', ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED']).notNullable().defaultTo('PENDING');
      table.text('citizen_feedback').nullable();
      table.timestamp('verified_at').nullable();
    })
    .createTable('vehicle_verification_history', (table) => {
      table.string('id', 36).primary();
      table.string('vehicle_id', 36).notNullable().references('id').inTable('vehicles').onDelete('CASCADE');
      table.enum('action', ['APPROVED', 'REJECTED', 'REVISION_REQUESTED']).notNullable();
      table.text('feedback').nullable();
      table.string('actor_id', 36).notNullable().references('id').inTable('users').onDelete('RESTRICT');
      table.timestamps(true, true);
      table.index('vehicle_id');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('vehicle_verification_history')
    .table('vehicles', (table) => {
      table.dropColumn('verification_status');
      table.dropColumn('citizen_feedback');
      table.dropColumn('verified_at');
    });
};
