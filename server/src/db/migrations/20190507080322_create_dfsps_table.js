exports.up = function (knex, Promise) {
  return knex.schema.createTable('dfsps', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.string('name', 512).notNullable();
    table.string('identifier', 512).defaultTo(null);
    table.foreign('env_id', 'FK_DF_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_DF_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsps');
};
