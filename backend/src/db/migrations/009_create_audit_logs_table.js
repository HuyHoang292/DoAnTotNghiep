exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.string('user_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('target_table', 50).notNullable();
    table.string('target_id', 36).nullable();
    table.json('old_data').nullable();
    table.json('new_data').nullable();
    table.string('ip_address', 45).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};