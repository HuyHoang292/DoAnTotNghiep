exports.up = function(knex) {
  return knex.schema.table('cameras', (table) => {
    // Video mẫu (Cloudinary) dùng để mô phỏng luồng camera
    table.text('video_url').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('cameras', (table) => {
    table.dropColumn('video_url');
  });
};
