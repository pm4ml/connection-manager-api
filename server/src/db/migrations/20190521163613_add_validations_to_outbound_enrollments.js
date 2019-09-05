
exports.up = function (knex, Promise) {
  return knex.schema.table('outbound_enrollments', function (table) {
    table.json('validations').defaultTo(null);
    table.string('validationState', 512).defaultTo(null);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('outbound_enrollments', function (table) {
    table.dropColumn('validations');
    table.dropColumn('validationState');
  });
};
