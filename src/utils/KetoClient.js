const { Configuration, RelationshipApi } = require('@ory/keto-client');

class KetoClient {
  constructor(writeUrl, readUrl, hubObject) {
    this.write = new RelationshipApi(new Configuration({ basePath: writeUrl }));
    this.read = new RelationshipApi(new Configuration({ basePath: readUrl }));
    this.hubObject = hubObject;
  }

  async _put(body) {
    try {
      await this.write.createRelationship({ createRelationshipBody: body });
    } catch (error) {
      if (error.response?.status !== 409) throw error; // 409 = already exists
    }
  }

  // Dfsp:<id>#parent@Hub:<hubObject>
  async createDfsp (dfspId) {
    await this._put({
      namespace: 'Dfsp',
      object: dfspId,
      relation: 'parent',
      subject_set: { namespace: 'Hub', object: this.hubObject, relation: '' },
    });
  }

  // Dfsp:<id>#members@<userId>  (userId = Kratos identity id, or Hydra client_id for machines)
  async addDfspMember (userId, dfspId) {
    await this._put({ namespace: 'Dfsp', object: dfspId, relation: 'members', subject_id: userId });
  }

  async removeDfspMember (userId, dfspId) {
    await this.write.deleteRelationships({ namespace: 'Dfsp', object: dfspId, relation: 'members', subjectId: userId });
  }

  // Removes a DFSP entirely (parent link + all member tuples).
  async deleteDfsp (dfspId) {
    await this.write.deleteRelationships({ namespace: 'Dfsp', object: dfspId });
  }

  // Direct member subject_ids of a DFSP.
  async listDfspMembers (dfspId) {
    const out = [];
    let pageToken;
    do {
      const { data } = await this.read.getRelationships({ namespace: 'Dfsp', object: dfspId, relation: 'members', pageToken });
      for (const t of data.relation_tuples || []) {
        if (t.subject_id) out.push(t.subject_id);
      }
      pageToken = data.next_page_token || undefined;
    } while (pageToken);
    return out;
  }

  // DFSP ids the subject is a direct member of. A user may belong to several
  // DFSPs (e.g. system integrators).
  async listDfspMemberships (userId) {
    const out = [];
    let pageToken;
    do {
      const { data } = await this.read.getRelationships({ namespace: 'Dfsp', relation: 'members', subjectId: userId, pageToken });
      for (const t of data.relation_tuples || []) {
        if (t.object) out.push(t.object);
      }
      pageToken = data.next_page_token || undefined;
    } while (pageToken);
    return out;
  }

  // True if the subject is a member of any DFSP other than excludeDfspId.
  async hasOtherDfspMemberships (userId, excludeDfspId) {
    const memberships = await this.listDfspMemberships(userId);
    return memberships.some((dfspId) => dfspId !== excludeDfspId);
  }
}

module.exports = KetoClient;
