/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

const { knex } = require('../db/database');

exports.createID = async () => {
  const [{ id }] = await knex.raw(`
    SET @update_id := 0;
    UPDATE gid SET id = id + 1, id = (SELECT @update_id := id) LIMIT 1;
    SELECT @update_id;
  `);
  return id;
};

if (process.env.TEST) {
  exports.globalId = 1;
  exports.createID = async () => exports.globalId++;
}
