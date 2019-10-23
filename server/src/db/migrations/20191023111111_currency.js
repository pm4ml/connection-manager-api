
'use strict';

exports.up = async (knex) => {
  return knex.schema.hasTable('currency').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('currency', (t) => {
        t.string('currencyId', 3).primary().notNullable();
        t.string('name', 128).defaultTo(null).nullable();
        t.integer('scale').unsigned().defaultTo(4).notNullable();
        t.boolean('isActive').defaultTo(true).notNullable();
        t.dateTime('createdDate').defaultTo(knex.fn.now()).notNullable();
        t.boolean('enabled').defaultTo(false).notNullable();
      });
    }
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('currency');
};
