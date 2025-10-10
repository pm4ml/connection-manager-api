/**
 * Copyright 2025 ModusBox, Inc.
 * Licensed under the Apache License, Version 2.0
 */

const { respondWithCode } = require('../utils/writer');

exports.getHealth = async (ctx) => {
  const { db } = ctx;

  try {
    // Perform a simple database query to verify connectivity
    await db.raw('SELECT 1');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error) {
    return respondWithCode(503, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
};
