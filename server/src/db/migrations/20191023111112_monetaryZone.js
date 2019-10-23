'use strict';

exports.up = async (knex) => {
  return knex.schema.hasTable('monetaryZone').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('monetaryZone', (t) => {
        t.string('monetaryZoneId', 3).primary().notNullable();
        t.foreign('monetaryZoneId').references('currencyId').inTable('currency');
        t.string('name', 256).notNullable();
        t.string('description', 512).defaultTo(null).nullable();
        t.boolean('isActive').defaultTo(true).notNullable();
        t.dateTime('createdDate').defaultTo(knex.fn.now()).notNullable();
        t.string('createdBy', 128).defaultTo('admin').notNullable();
      });
    }
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('monetaryZone');
};
