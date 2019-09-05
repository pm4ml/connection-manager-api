
exports.up = function (knex, Promise) {
  return knex.schema.table('dfsp_cas', function (table) {
    table.dropColumn('root_certificate_state');
    table.dropColumn('root_certificate_validation');
    table.dropColumn('intermediate_chain_state');
    table.dropColumn('intermediate_chain_validation');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('dfsp_cas', function (table) {
    table.string('root_certificate_state', 512);
    table.text('root_certificate_validation');
    table.string('intermediate_chain_state', 512);
    table.text('intermediate_chain_validation');
  });
};
