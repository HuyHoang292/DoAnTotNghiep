exports.up = function(knex) {
  return knex.schema.createTable('violations', (table) => {
    table.string('id', 36).primary();
    table.string('camera_id', 36).notNullable().references('id').inTable('cameras').onDelete('RESTRICT');
    table.string('vehicle_id', 36).nullable().references('id').inTable('vehicles').onDelete('SET NULL');
    table.string('detected_plate_text', 20).notNullable();
    table.string('corrected_plate_text', 20).nullable();
    table.float('ocr_confidence').notNullable();
    table.enum('violation_type', ['RED_LIGHT', 'WRONG_LANE', 'SPEEDING', 'ILLEGAL_PARKING', 'HELMET_LESS', 'WRONG_WAY']).notNullable();
    table.text('evidence_image_url').notNullable();
    table.text('evidence_video_url').nullable();
    table.datetime('detected_at').notNullable();
    table.enum('status', ['AI_PENDING', 'OFFICER_VERIFIED', 'REJECTED', 'INVOICED']).notNullable().defaultTo('AI_PENDING');
    table.text('rejection_reason').nullable();
    table.string('verified_by', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.datetime('verified_at').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('violations');
};