
exports.up = function (knex, Promise) {
  return knex.schema.createTable('dfsp_cas', (table) => {
    table.increments('id').primary();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.text('root_certificate');
    table.string('root_certificate_state', 512);
    table.text('root_certificate_validation');
    table.text('intermediate_chain');
    table.string('intermediate_chain_state', 512);
    table.text('intermediate_chain_validation');
    table.foreign('dfsp_id', 'FK_DFSPCAS_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('dfsp_id', 'FK_DFSPCAS_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsp_cas');
};
