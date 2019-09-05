
exports.up = function (knex, Promise) {
  return knex.schema.createTable('dfsp_endpoint_items', (table) => {
    table.increments('id').primary();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.string('state', 512).defaultTo(null);
    table.string('direction', 512).defaultTo(null);
    table.string('value', 1024).defaultTo(null);
    table.string('type', 10).defaultTo(null);
    table.datetime('created_date').notNullable().defaultTo(knex.fn.now());
    table.string('created_by', 1024).defaultTo(null);
    table.foreign('dfsp_id', 'FK_ENDITEM_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('dfsp_id', 'FK_ENDITEM_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsp_endpoint_items');
};
