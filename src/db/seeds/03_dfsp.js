// pass DFSP_SEED=DFSP1:KES,DFSP2:MWK,DFSP3:UGX to seed the dfsp with the given monetary zones
exports.seed = async (knex) => {
    if (process.env.DFSP_SEED) {
        const Constants = require('../../constants/Constants');
        const { createCSRAndDFSPOutboundEnrollment, getDFSPOutboundEnrollments } = require('../../service/DfspOutboundService');
        const PKIEngine = require('../../pki_engine/VaultPKIEngine');
        const dfsps = process.env.DFSP_SEED.split(',')
            .map(dfsp => dfsp.split(':').map(s => s.trim()));

        await knex('dfsps').insert(
            dfsps.map(([dfsp_id, monetaryZoneId]) => ({
                dfsp_id,
                name: dfsp_id,
                monetaryZoneId: monetaryZoneId || null,
                security_group: `Application/DFSP:${dfsp_id}`,
            }))
        ).onConflict('dfsp_id').merge();

        const pkiEngine = new PKIEngine(Constants.vault);
        await pkiEngine.connect();
        for (const [dfsp_id] of dfsps) {
            const exists = await getDFSPOutboundEnrollments({pkiEngine}, dfsp_id);
            if (exists.length === 0) {
                await createCSRAndDFSPOutboundEnrollment(
                    {pkiEngine},
                    dfsp_id,
                    Constants.clientCsrParameters
                );
            }
        }
    }
};
