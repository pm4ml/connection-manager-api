// pass DFSP_SEED=DFSP1:KES,DFSP2:MWK,DFSP3:UGX to seed the dfsp with the given monetary zones
exports.seed = (knex) =>
    process.env.DFSP_SEED &&
    knex('dfsps').insert(
        process.env.DFSP_SEED.split(',')
        .map(dfsp => dfsp.split(':').map(s => s.trim()))
        .map(([dfsp_id, monetaryZoneId]) => ({
            dfsp_id,
            name: dfsp_id,
            monetaryZoneId,
            security_group: `Application/DFSP:${dfsp_id}`,
        }))
    ).onConflict('dfsp_id').merge();
