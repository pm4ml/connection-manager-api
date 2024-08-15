exports.up = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.boolean('isProxy');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.dropColumn('isProxy');
  });
};
