exports.up = function(knex) {
  return knex.schema.createTable('notifications', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('invoice_id', 36).nullable().references('id').inTable('invoices').onDelete('CASCADE');
    table.enum('channel', ['EMAIL', 'SMS', 'APP_PUSH']).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.enum('status', ['PENDING', 'SENT', 'FAILED']).notNullable().defaultTo('PENDING');
    table.datetime('sent_at').nullable();
    table.text('error_log').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('notifications');
};