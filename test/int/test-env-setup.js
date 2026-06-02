// Test environment setup for integration tests

process.env.TEST = 'true';
process.env.TEST_INT = 'true';

process.env.PORT = '3001';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '3306';
process.env.DATABASE_USER = 'mcm';
process.env.DATABASE_PASSWORD = 'mcm';
process.env.DATABASE_SCHEMA = 'mcm';

process.env.VAULT_ENDPOINT = 'http://localhost:8233';
process.env.VAULT_AUTH_METHOD = 'APP_ROLE';
process.env.VAULT_ROLE_ID_FILE = './docker/vault/tmp/role-id';
process.env.VAULT_ROLE_SECRET_ID_FILE = './docker/vault/tmp/secret-id';
process.env.VAULT_PKI_CLIENT_ROLE = 'example.com';
process.env.VAULT_PKI_SERVER_ROLE = 'example.com';

process.env.SWITCH_ID = 'switch';

process.env.IAM_ENABLED = 'true';
process.env.IAM_AUTO_CREATE_ACCOUNTS = 'true';

process.env.HYDRA_ADMIN_URL = 'http://localhost:4445';
process.env.HYDRA_PUBLIC_URL = 'http://localhost:4444';
process.env.HYDRA_AUDIENCE = 'connection-manager-api';

process.env.KRATOS_ADMIN_URL = 'http://localhost:4434';
process.env.KRATOS_PUBLIC_URL = 'http://localhost:4433';
process.env.KRATOS_IDENTITY_SCHEMA_ID = 'default';

process.env.KETO_READ_URL = 'http://localhost:4466';
process.env.KETO_WRITE_URL = 'http://localhost:4467';

process.env.DFSP_WATCHER_ENABLED = 'false';
process.env.CLIENT_URL = 'http://localhost:3000/';

console.log('Integration test environment configured');
