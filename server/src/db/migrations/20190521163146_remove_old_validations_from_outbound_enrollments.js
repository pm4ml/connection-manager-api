
exports.up = function (knex, Promise) {
  return knex.schema.table('outbound_enrollments', function (table) {
    table.dropColumn('signing_validation_result');
    table.dropColumn('key_validation_result');
    table.dropColumn('key_validation_output');
    table.dropColumn('signing_validation_output');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('outbound_enrollments', function (table) {
    table.string('key_validation_result', 512).defaultTo(null);
    table.text('key_validation_output').defaultTo(null);
    table.string('signing_validation_result', 512).defaultTo(null);
    table.text('signing_validation_output').defaultTo(null);
  });
};
