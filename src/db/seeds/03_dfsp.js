const Constants = require('../../constants/Constants');
const { createCSRAndDFSPOutboundEnrollment } = require('../../service/DfspOutboundService');
const PKIEngine = require('../../pki_engine/VaultPKIEngine');

// pass DFSP_SEED=DFSP1:KES,DFSP2:MWK,DFSP3:UGX to seed the dfsp with the given monetary zones
exports.seed = async (knex) => {
    if (process.env.DFSP_SEED) {
        const dfsps = process.env.DFSP_SEED.split(',')
            .map(dfsp => dfsp.split(':').map(s => s.trim()));

        await knex('dfsps').insert(
            dfsps.map(([dfsp_id, monetaryZoneId]) => ({
                dfsp_id,
                name: dfsp_id,
                monetaryZoneId,
                security_group: `Application/DFSP:${dfsp_id}`,
            }))
        ).onConflict('dfsp_id').merge();

        const pkiEngine = new PKIEngine(Constants.vault);
        await pkiEngine.connect();
        for (const [dfsp_id] of dfsps) await createCSRAndDFSPOutboundEnrollment({pkiEngine}, dfsp_id);
    }
};
