exports.up = function (knex, Promise) {
  return knex.schema.createTable('hub_issuer_cas', (table) => {
    table.increments('id').primary();
    table.integer('env_id', 11).unsigned();
    table.string('type', 512).notNullable();
    table.string('name', 512).notNullable();
    table.text('root_cert');
    table.text('chain');
    table.json('root_cert_info');
    table.json('chain_info');
    table.json('validations').defaultTo(null);
    table.string('validationState', 512).defaultTo(null);
    table.foreign('env_id', 'FK_ISSUERCAS_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_ISSUERCAS_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('hub_issuer_cas');
};
