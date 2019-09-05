
exports.up = function (knex, Promise) {
  return knex.schema.table('inbound_enrollments', function (table) {
    table.integer('hub_issuer_ca_id', 11).unsigned();
    table.foreign('hub_issuer_ca_id', 'FK_HUB_ISSUER_CA_ID').references('hub_issuer_cas.id').onDelete('NO ACTION').onUpdate('NO ACTION');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('inbound_enrollments', function (table) {
    table.dropColumn('hub_issuer_ca_id');
  });
};
