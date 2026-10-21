exports.up = function(knex) {
  return knex.schema.table('users', (table) => {
    table.boolean('must_change_password').defaultTo(false).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('must_change_password');
  });
};
