
exports.up = function (knex, Promise) {
  return knex.schema.createTable('outbound_enrollments', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.text('dfsp_ca_bundle');
    table.text('csr');
    table.text('key');
    table.text('cert');
    table.json('cert_info');
    table.json('csr_info');
    table.string('state', 512).defaultTo(null); ;
    table.string('key_validation_result', 512).defaultTo(null);
    table.text('key_validation_output').defaultTo(null);
    table.string('signing_validation_result', 512).defaultTo(null);
    table.text('signing_validation_output').defaultTo(null);
    table.foreign('dfsp_id', 'FK_OUTENROL_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.foreign('env_id', 'FK_OUTENROL_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_OUTENROL_ENV_ID_idx');
    table.index('dfsp_id', 'FK_OUTENROL_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('outbound_enrollments');
};
