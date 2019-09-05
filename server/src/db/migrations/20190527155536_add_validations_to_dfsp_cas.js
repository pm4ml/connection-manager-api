
exports.up = function (knex, Promise) {
  return knex.schema.table('dfsp_cas', function (table) {
    table.json('validations').defaultTo(null);
    table.string('validationState', 512).defaultTo(null);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('dfsp_cas', function (table) {
    table.dropColumn('validations');
    table.dropColumn('validationState');
  });
};
