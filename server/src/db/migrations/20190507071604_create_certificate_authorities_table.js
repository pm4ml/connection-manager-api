
exports.up = function (knex, Promise) {
  return knex.schema.createTable('certificate_authorities', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.text('cert').notNullable();
    table.text('csr').notNullable();
    table.json('cert_info');
    table.json('csr_info');
    table.text('key').notNullable();
    table.tinyint('current', 4).notNullable().defaultTo(0);
    table.json('ca_config');
    table.string('engine_type', 512);
    table.foreign('env_id', 'FK_CA_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('certificate_authorities');
};
