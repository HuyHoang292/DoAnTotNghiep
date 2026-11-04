// Cấu hình mẫu cho video demo: vạch phủ làn xe đi ra xa camera, đèn giả lập xanh 20s - vàng 3s - đỏ 20s
const DEMO_VIDEO = '%/v1793185017/2026-10-28_17-54-28.mp4';
const DEMO_STOP_LINE = { x1: 0.225, y1: 0.56, x2: 0.573, y2: 0.56, travelSide: -1 };
const DEMO_SIGNAL = { green: 20, yellow: 3, red: 20, offset: 0 };

exports.up = async function (knex) {
  await knex.schema.alterTable('cameras', (table) => {
    table.json('stop_line').nullable();
    table.json('signal_config').nullable();
  });

  await knex.schema.alterTable('camera_events', (table) => {
    table.string('signal_state', 10).nullable();
    table.string('vehicle_class', 20).nullable();
    table.integer('track_id').nullable();
    table.text('source_video_url').nullable();
  });

  await knex.schema.createTable('camera_analysis_jobs', (table) => {
    table.string('id', 36).primary();
    table.string('camera_id', 36).notNullable().references('id').inTable('cameras').onDelete('CASCADE');
    table.string('ai_job_id', 36).notNullable();
    table.enum('status', ['RUNNING', 'DONE', 'FAILED']).notNullable().defaultTo('RUNNING');
    table.float('progress').notNullable().defaultTo(0);
    table.text('video_url').notNullable();
    table.integer('crossed_green').notNullable().defaultTo(0);
    table.integer('violations_created').notNullable().defaultTo(0);
    table.integer('duplicates_skipped').notNullable().defaultTo(0);
    table.text('error').nullable();
    table.string('created_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  await knex('cameras')
    .where('video_url', 'like', DEMO_VIDEO)
    .update({ stop_line: JSON.stringify(DEMO_STOP_LINE), signal_config: JSON.stringify(DEMO_SIGNAL) });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('camera_analysis_jobs');
  await knex.schema.alterTable('camera_events', (table) => {
    table.dropColumn('signal_state');
    table.dropColumn('vehicle_class');
    table.dropColumn('track_id');
    table.dropColumn('source_video_url');
  });
  await knex.schema.alterTable('cameras', (table) => {
    table.dropColumn('stop_line');
    table.dropColumn('signal_config');
  });
};
