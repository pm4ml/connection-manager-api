const { Configuration, RelationshipApi } = require('@ory/keto-client');

class KetoClient {
  constructor(writeUrl, readUrl) {
    this.client = new RelationshipApi(new Configuration({ basePath: writeUrl }));
    this.readClient = new RelationshipApi(new Configuration({ basePath: readUrl }));
  }

  async createRelationship(namespace, object, relation, subjectId) {
    let createBody = { namespace, object, relation };

    if (subjectId.includes('#')) {
      const [subjectNamespaceAndObject, subjectRelation] = subjectId.split('#');
      const [subjectNamespace, ...objectParts] = subjectNamespaceAndObject.split(':');
      const subjectObject = objectParts.join(':');

      createBody.subject_set = {
        namespace: subjectNamespace,
        object: subjectObject,
        relation: subjectRelation
      };
    } else {
      createBody.subject_id = subjectId;
    }

    try {
      await this.client.createRelationship({ createRelationshipBody: createBody });
    } catch (error) {
      if (error.response?.status !== 409) // Already exists
        throw error;
    }
  }

  // Create dfsp:{dfspId} role: members of dfsp:{id} count as members of the
  // generic dfsp role, and hub-admin members count as members of dfsp:{id}.
  async createDfspRole(dfspId) {
    await this.createRelationship('role', 'dfsp', 'member', `role:dfsp:${dfspId}#member`);
    await this.createRelationship('role', `dfsp:${dfspId}`, 'member', 'role:hub-admin#member');
  }

  // Assign user to dfsp:{dfspId} role
  async assignUserToDfspRole(userId, dfspId) {
    return await this.createRelationship('role', `dfsp:${dfspId}`, 'member', userId);
  }

  // Remove user from dfsp:{dfspId} role
  async removeUserFromDfspRole(userId, dfspId) {
    try {
      await this.client.deleteRelationships({
        namespace: 'role',
        object: `dfsp:${dfspId}`,
        relation: 'member',
        subjectId: userId
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete dfsp:{dfspId} role (removes inheritance)
  async deleteDfspRole(dfspId) {
    try {
      await this.client.deleteRelationships({
        namespace: 'role',
        object: 'dfsp',
        relation: 'member',
        subjectSet: {
          namespace: 'role',
          object: `dfsp:${dfspId}`,
          relation: 'member'
        }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // List subject_ids that are direct members of dfsp:{dfspId}#member.
  // Subject_set entries (e.g., hub-admin transitivity) are excluded.
  async listDfspRoleMemberIds(dfspId) {
    const out = [];
    let pageToken;
    do {
      const { data } = await this.readClient.getRelationships({
        namespace: 'role',
        object: `dfsp:${dfspId}`,
        relation: 'member',
        pageToken,
      });
      for (const tuple of data.relation_tuples || []) {
        if (tuple.subject_id) out.push(tuple.subject_id);
      }
      pageToken = data.next_page_token || undefined;
    } while (pageToken);
    return out;
  }

  // Returns true if the subject has membership in any dfsp:{id} role other than the excluded one.
  async hasOtherDfspMemberships(subjectId, excludeDfspId) {
    let pageToken;
    do {
      const { data } = await this.readClient.getRelationships({
        namespace: 'role',
        relation: 'member',
        subjectId,
        pageToken,
      });
      for (const tuple of data.relation_tuples || []) {
        if (typeof tuple.object === 'string'
            && tuple.object.startsWith('dfsp:')
            && tuple.object !== `dfsp:${excludeDfspId}`) {
          return true;
        }
      }
      pageToken = data.next_page_token || undefined;
    } while (pageToken);
    return false;
  }
}

module.exports = KetoClient;
