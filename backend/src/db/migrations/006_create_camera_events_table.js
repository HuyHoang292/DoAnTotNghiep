exports.up = function(knex) {
  return knex.schema.createTable('camera_events', (table) => {
    table.string('id', 36).primary();
    table.string('camera_id', 36).notNullable().references('id').inTable('cameras').onDelete('CASCADE');
    table.double('video_timestamp').notNullable();
    table.string('detected_plate_text', 20).nullable();
    table.float('ocr_confidence').nullable();
    table.json('bounding_box').notNullable();
    table.boolean('is_violation').notNullable().defaultTo(false);
    table.enum('violation_type', ['RED_LIGHT', 'WRONG_LANE', 'SPEEDING', 'ILLEGAL_PARKING', 'HELMET_LESS', 'WRONG_WAY']).nullable();
    table.text('snapshot_url').nullable();
    table.string('promoted_violation_id', 36).nullable().references('id').inTable('violations').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('camera_events');
};