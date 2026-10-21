exports.up = function(knex) {
  return knex.schema.table('users', (table) => {
    table.boolean('password_changed').defaultTo(false).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('password_changed');
  });
};
