exports.up = function(knex) {
  return knex.schema.createTable('cameras', (table) => {
    table.string('id', 36).primary();
    table.string('camera_code', 50).notNullable().unique();
    table.string('location_name', 255).notNullable();
    table.double('latitude').nullable();
    table.double('longitude').nullable();
    table.string('road_segment', 100).nullable();
    table.text('rtsp_stream_url').nullable();
    table.text('hls_stream_url').nullable();
    table.enum('status', ['ONLINE', 'OFFLINE', 'MAINTENANCE']).notNullable().defaultTo('ONLINE');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cameras');
};