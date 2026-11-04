exports.up = function(knex) {
  return knex.schema.createTable('login_history', (table) => {
    table.increments('id').primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    // SUCCESS: đăng nhập thành công, FAILED: sai mật khẩu / tài khoản bị khóa
    table.enum('status', ['SUCCESS', 'FAILED']).notNullable();
    table.string('failure_reason', 100).nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.timestamp('logged_in_at').notNullable().defaultTo(knex.fn.now());
    // Thời điểm công dân bấm đăng xuất (null nếu chưa đăng xuất)
    table.timestamp('logged_out_at').nullable();
    table.index(['user_id', 'logged_in_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('login_history');
};
