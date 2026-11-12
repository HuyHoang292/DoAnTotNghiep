exports.up = async function (knex) {
  await knex.schema.alterTable('violations', (table) => {
    // Khung đỏ quanh xe vi phạm trên ảnh bằng chứng, toạ độ theo tỉ lệ 0..1: { x1, y1, x2, y2 }
    table.json('plate_box').nullable();
  });

  await knex.schema.alterTable('notifications', (table) => {
    table.string('violation_id', 36).nullable().references('id').inTable('violations').onDelete('CASCADE');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.datetime('read_at').nullable();
    table.index(['user_id', 'is_read']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('notifications', (table) => {
    table.dropForeign('violation_id');
    table.dropIndex(['user_id', 'is_read']);
    table.dropColumn('violation_id');
    table.dropColumn('is_read');
    table.dropColumn('read_at');
  });

  await knex.schema.alterTable('violations', (table) => {
    table.dropColumn('plate_box');
  });
};
