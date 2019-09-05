exports.up = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.renameColumn('identifier', 'dfsp_id');
    table.unique(['env_id', 'dfsp_id']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('dfsps', function (table) {
    table.dropUnique(['env_id', 'dfsp_id']);
    table.renameColumn('dfsp_id', 'identifier');
  });
};
