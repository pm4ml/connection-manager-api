/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const PKIEngine = require('#src/pki_engine/VaultPKIEngine');
const { vault: vaultConfig, vaultPaths } = require('#src/constants/Constants');
const { logger } = require('#src/log/logger');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  logger.info('starting JWS Vault Migration: dbId → dfspId');
  let pkiEngine;

  try {
    pkiEngine = new PKIEngine(vaultConfig);
    await pkiEngine.connect();
    logger.info('✅ Vault connected successfully');

    // Query all DFSPs from database
    const dfsps = await knex('dfsps').select('id', 'dfsp_id');
    const dfspMap = new Map(dfsps.map(d => [String(d.id), d.dfsp_id]));
    logger.verbose(`📊 Found ${dfsps.length} DFSPs in database`);

    // List all JWS certificate keys in Vault
    const allKeys = await pkiEngine.listSecrets(vaultPaths.JWS_CERTS);
    const numericKeys = allKeys.filter(key => /^\d+$/.test(key));
    if (numericKeys.length === 0) {
      logger.info('✅ No numeric keys found - migration not needed!');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const dbId of numericKeys) {
      try {
        const dfspId = dfspMap.get(dbId);

        if (!dfspId) {
          logger.warn(`⚠️  Skipping dbId ${dbId}: No DFSP found in database`);
          skipped++;
          continue;
        }

        // Check if target already exists
        const existingKeys = await pkiEngine.listSecrets(vaultPaths.JWS_CERTS);
        if (existingKeys.includes(dfspId)) {
          logger.warn(`⚠️  Skipping dbId ${dbId} → ${dfspId}: Target already exists`);
          skipped++;
          continue;
        }

        const certData = await pkiEngine.getSecret(`${vaultPaths.JWS_CERTS}/${dbId}`);
        await pkiEngine.setSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`, certData);

        logger.verbose(`✅ Migrated: dbId ${dbId} → dfspId ${dfspId}`);
        migrated++;
        // Note: Old numeric keys are kept as backup (per user decision)
      } catch (error) {
        logger.warn(`❌ Error migrating dbId ${dbId}:`, error.message);
        errors++;
      }
    }

    logger.info(`migration completed: `, { migrated, skipped, errors });
    if (errors > 0) {
      throw new Error(`Migration completed with ${errors} error(s)`);
    }

  } catch (error) {
    logger.error('❌ MIGRATION FAILED: ', error);
    throw error;
  } finally {
    // Disconnect from Vault
    if (pkiEngine) {
      pkiEngine?.disconnect();
      logger.info('🔌 Vault disconnected');
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  logger.warn('⚠️  Rollback not supported for Vault migration');
};
