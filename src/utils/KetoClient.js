const { Configuration, RelationshipApi } = require('@ory/keto-client');

class KetoClient {
  constructor(writeUrl) {
    const config = new Configuration({ basePath: writeUrl });
    this.client = new RelationshipApi(config);
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

  // Create dfsp:{dfspId} role that inherits from dfsp role
  async createDfspRole(dfspId) {
    return await this.createRelationship('role', 'dfsp', 'member', `role:dfsp:${dfspId}#member`);
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
}

module.exports = KetoClient;
