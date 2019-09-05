
exports.seed = async function (knex) {
  try {
    let insertResult = await knex('environments').insert([
      {
        name: 'DEMO_ENV_1',
        CN: 'dev1.centralhub.modusbox.live',
        C: 'CI',
        L: 'Abidjan',
        O: 'Modusbox',
        OU: 'Modusbox dev',
        ST: 'Abidjan'
      }
    ]);
    console.log('insertResult: ', insertResult);
    let environmentId = insertResult[0];

    let insertOrangeResult = await knex('dfsps').insert([
      { env_id: environmentId,
        name: 'Orange CI',
        dfsp_id: 'Orange CI',
        security_group: 'Application/DFSP:Orange-CI' }
    ]);
    console.log('insertOrangeResult: ', insertOrangeResult);

    let insertMTNResult = await knex('dfsps').insert([
      { env_id: environmentId,
        name: 'MTN CI',
        dfsp_id: 'MTN CI',
        security_group: 'Application/DFSP:MTN-CI' }
    ]);
    console.log('insertMTNResult: ', insertMTNResult);

    let insertDFSP1Result = await knex('dfsps').insert([
      { env_id: environmentId,
        name: 'DFSP1',
        dfsp_id: 'DFSP 1',
        security_group: 'Application/DFSP:DFSP1' }
    ]);
    console.log('insertDFSP1Result: ', insertDFSP1Result);

    let insertDFSP2Result = await knex('dfsps').insert([
      { env_id: environmentId,
        name: 'DFSP2',
        dfsp_id: 'DFSP 2',
        security_group: 'Application/DFSP:DFSP2' }
    ]);
    console.log('insertDFSP2Result: ', insertDFSP2Result);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return -1001;
    else {
      console.log(`Uploading seeds for environments has failed with the following error: ${err}`);
      return -1000;
    }
  }
};
