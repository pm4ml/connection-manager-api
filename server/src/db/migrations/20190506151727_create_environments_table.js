exports.up = function (knex, Promise) {
  return knex.schema.createTable('environments', (table) => {
    table.increments('id').primary();
    table.string('name', 512).notNullable();
    table.string('CN', 512).defaultTo(null);
    table.string('C', 512).defaultTo(null);
    table.string('L', 512).defaultTo(null);
    table.string('O', 512).defaultTo(null);
    table.string('OU', 512).defaultTo(null);
    table.string('ST', 512).defaultTo(null);
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('environments');
};
