exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.string('id', 36).primary();
    table.string('full_name', 100).notNullable();
    table.string('national_id', 20).notNullable().unique();
    table.string('email', 100).unique();
    table.string('phone', 20).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['CITIZEN', 'OFFICER', 'ADMIN']).notNullable().defaultTo('CITIZEN');
    table.enum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).notNullable().defaultTo('ACTIVE');
    table.string('badge_number', 50).nullable();
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};