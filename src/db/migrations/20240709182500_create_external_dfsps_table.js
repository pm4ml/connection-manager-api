exports.up = function (knex, Promise) {
  return knex.schema.createTable('external_dfsps', (table) => {
    table.increments('id').primary();
    table.string('external_dfsp_id').notNullable().defaultTo(null);
    table.string('source_dfsp_id').notNullable().defaultTo(null);
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('external_dfsp_id', 'EXTERNAL_DFSP_ID_idx');
    table.unique(['external_dfsp_id']);
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('external_dfsps');
};
