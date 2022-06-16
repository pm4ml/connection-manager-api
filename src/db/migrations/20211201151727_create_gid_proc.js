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
  knex.raw(`
    CREATE PROCEDURE create_gid()
    BEGIN
        SET @update_id := 0;
        UPDATE gid
        SET id = id + 1,
            id = (SELECT @update_id := id)
        LIMIT 1;
        SELECT @update_id as id;
    END
  `);

exports.down = (knex) =>
  knex.raw('DROP PROCEDURE IF EXISTS create_gid');
