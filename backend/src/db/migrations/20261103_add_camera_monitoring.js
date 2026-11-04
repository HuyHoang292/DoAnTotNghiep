// Chuyển từ phân tích video theo lần sang giám sát liên tục, và gắn 2 video có đèn thật cho camera mẫu
const DEMO_CAMERAS = [
  {
    id: 'cam-001',
    video_url: 'https://res.cloudinary.com/swmrzf85/video/upload/v1793343082/Traffic.mp4',
    stop_line: { x1: 0, y1: 0.833, x2: 0.81, y2: 0.833, travelSide: -1 },
    signal_config: { mode: 'VISION', roi: { x1: 0.972, y1: 0.262, x2: 1, y2: 0.378 } },
  },
  {
    id: 'cam-002',
    video_url: 'https://res.cloudinary.com/swmrzf85/video/upload/v1793343080/Traffic1.mp4',
    stop_line: { x1: 0.12, y1: 0.593, x2: 0.778, y2: 0.593, travelSide: -1 },
    signal_config: { mode: 'VISION', roi: { x1: 0.962, y1: 0.012, x2: 0.992, y2: 0.128 } },
  },
];

exports.up = async function (knex) {
  await knex.schema.dropTableIfExists('camera_analysis_jobs');
  await knex.schema.alterTable('cameras', (table) => {
    table.boolean('monitoring').notNullable().defaultTo(false);
  });

  for (const camera of DEMO_CAMERAS) {
    await knex('cameras').where('id', camera.id).update({
      video_url: camera.video_url,
      stop_line: JSON.stringify(camera.stop_line),
      signal_config: JSON.stringify(camera.signal_config),
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('cameras', (table) => {
    table.dropColumn('monitoring');
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
};
