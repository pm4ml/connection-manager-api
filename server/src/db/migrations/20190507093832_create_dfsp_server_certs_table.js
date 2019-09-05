
exports.up = function (knex, Promise) {
  return knex.schema.createTable('dfsp_server_certs', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.text('root_cert');
    table.text('chain');
    table.text('server_cert');
    table.json('root_cert_info');
    table.json('chain_info');
    table.json('server_cert_info');
    table.json('validations');
    table.string('validationState', 512).defaultTo(null);
    table.string('state', 512).defaultTo(null);
    table.foreign('dfsp_id', 'FK_DFSC_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.foreign('env_id', 'FK_DFSC_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_DFSC_ENV_ID_idx');
    table.index('dfsp_id', 'FK_DFSC_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsp_server_certs');
};
