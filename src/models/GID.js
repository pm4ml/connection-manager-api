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
  const result = await knex.raw('CALL create_gid');
  return result?.[0]?.[0]?.[0]?.id;
};

if (eval(process.env.TEST)) {
  exports.globalId = 1;
  exports.createID = async () => exports.globalId++;
}
