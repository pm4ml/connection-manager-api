/**
 * Copyright 2025 ModusBox, Inc.
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

const utils = require('../utils/writer');
const HealthService = require('../service/HealthService');

module.exports.getHealth = function getHealth (req, res) {
  HealthService.getHealth(req.context)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
