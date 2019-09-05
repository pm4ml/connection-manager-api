
exports.up = function (knex, Promise) {
  return knex.schema.createTable('hub_endpoint_items', (table) => {
    table.increments('id').primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.string('state', 512).defaultTo(null);
    table.string('direction', 512).defaultTo(null);
    table.string('value', 1024).defaultTo(null);
    table.string('type', 10).defaultTo(null);
    table.datetime('created_date').notNullable().defaultTo(knex.fn.now());
    table.string('created_by', 1024).defaultTo(null);
    table.foreign('env_id', 'FK_ENDITEM_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_ENDITEM_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('hub_endpoint_items');
};
