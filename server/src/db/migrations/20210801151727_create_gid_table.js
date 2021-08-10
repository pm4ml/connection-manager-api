/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

exports.up = (knex) =>
  knex.schema.createTable('gid', (table) => {
    table.bigInteger('id');
  })
    .then(() => knex('gid').insert({ id: 1 }));

exports.down = (knex) => knex.schema.dropTableIfExists('gid');
