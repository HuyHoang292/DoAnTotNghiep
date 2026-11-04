const db = require('../../db/knex');

function now() {
  return db.fn.now();
}

module.exports = { now };
