exports.up = function(knex) {
  return knex.schema.createTable('invoices', (table) => {
    table.string('id', 36).primary();
    table.string('violation_id', 36).notNullable().unique().references('id').inTable('violations').onDelete('RESTRICT');
    table.string('invoice_code', 50).notNullable().unique();
    table.decimal('amount', 12, 2).notNullable();
    table.date('issue_date').notNullable();
    table.date('due_date').notNullable();
    table.enum('status', ['UNPAID', 'PAID', 'OVERDUE', 'CANCELLED']).notNullable().defaultTo('UNPAID');
    table.string('payment_method', 50).nullable();
    table.string('transaction_id', 100).nullable();
    table.datetime('paid_at').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('invoices');
};