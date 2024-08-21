exports.up = function (knex, Promise) {
  return knex.schema.createTable('fxp_supported_currencies', (table) => {
    table.increments('id').primary();
    table.integer('dfspId').unsigned().notNullable();
    table.string('monetaryZoneId', 3);
    table.foreign('monetaryZoneId').references('monetaryZoneId').inTable('monetaryZone');
    table.foreign('dfspId', 'FK_CURR_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('dfspId', 'FK_CURR_DFSP_ID_idx');
    table.unique(['dfspId', 'monetaryZoneId']);
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('fxp_supported_currencies');
};
