exports.up = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.string('security_group', 256);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.dropColumn('security_group');
  });
};
