exports.up = function(knex) {
  return knex.schema.createTable('fines', (table) => {
    table.string('violation_type', 50).primary(); // Khóa chính là violation_type
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.decimal('min_amount', 12, 2).notNullable();
    table.decimal('max_amount', 12, 2).notNullable();
    table.decimal('default_amount', 12, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('fines');
};