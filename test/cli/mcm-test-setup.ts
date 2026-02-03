import { Command } from 'commander';
import { loginViaKratosOIDC } from '../lib/kratos-helper';
import { KeycloakHelper } from '../lib/keycloak-helper';
import { MailpitHelper } from '../lib/mailpit-helper';

const program = new Command();

program
  .name('mcm-test-setup')
  .description('MCM Test Setup CLI - Commands for setting up and tearing down MCM test environments')
  .version('1.0.0');

program
  .command('get-admin-session')
  .description('Get portal admin session cookie')
  .requiredOption('--kratos-url <url>', 'Kratos external URL')
  .requiredOption('--keycloak-realm <realm>', 'Keycloak Hub Operator realm name')
  .requiredOption('--username <user>', 'Portal admin username')
  .requiredOption('--password <pass>', 'Portal admin password')
  .action(async (opts) => {
    const session = await loginViaKratosOIDC({
      kratosUrl: opts.kratosUrl,
      username: opts.username,
      password: opts.password,
      provider: opts.keycloakRealm
    });
    console.log(session);
  });

program
  .command('create-dfsp')
  .description('Create a DFSP via MCM API')
  .requiredOption('--mcm-url <url>', 'MCM external URL')
  .requiredOption('--id <dfsp_id>', 'DFSP ID')
  .requiredOption('--name <dfsp_name>', 'DFSP name')
  .requiredOption('--email <email>', 'Contact email')
  .requiredOption('--monetary-zone <zone_id>', 'Monetary zone ID')
  .requiredOption('--session <session>', 'Admin session cookie')
  .action(async (opts) => {
    const resp = await fetch(`${opts.mcmUrl}/api/dfsps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ory_kratos_session=${opts.session}`
      },
      body: JSON.stringify({
        dfspId: opts.id,
        name: opts.name,
        monetaryZoneId: opts.monetaryZone,
        email: opts.email
      })
    });

    if (resp.status === 200 || resp.status === 201 || resp.status === 409) {
      console.error(`SUCCESS: DFSP created (HTTP ${resp.status})`);
    } else {
      console.error(`ERROR: Failed to create DFSP (HTTP ${resp.status})`);
      console.error('Response:', await resp.text());
      process.exit(1);
    }
  });

program
  .command('destroy-dfsp')
  .description('Delete a DFSP via MCM API')
  .requiredOption('--mcm-url <url>', 'MCM external URL')
  .requiredOption('--id <dfsp_id>', 'DFSP ID')
  .requiredOption('--session <session>', 'Admin session cookie')
  .action(async (opts) => {
    const resp = await fetch(`${opts.mcmUrl}/api/dfsps/${opts.id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `ory_kratos_session=${opts.session}`
      }
    });

    if (resp.status === 200 || resp.status === 204 || resp.status === 404) {
      console.error(`SUCCESS: DFSP deleted (HTTP ${resp.status})`);
    } else {
      console.error(`ERROR: Failed to delete DFSP (HTTP ${resp.status})`);
      process.exit(1);
    }
  });

program
  .command('complete-invitation')
  .description('Wait for Keycloak invitation email and complete registration flow')
  .requiredOption('--mailpit-url <url>', 'Mailpit URL')
  .requiredOption('--email <email>', 'User email')
  .requiredOption('--password <password>', 'New password')
  .requiredOption('--first-name <name>', 'First name')
  .requiredOption('--last-name <name>', 'Last name')
  .action(async (opts) => {
    const mailpit = new MailpitHelper(opts.mailpitUrl);
    const { link, messageId } = await mailpit.waitForInvitationEmail(opts.email);

    const keycloak = new KeycloakHelper();
    await keycloak.completePasswordSetup(link, opts.password, {
      firstName: opts.firstName,
      lastName: opts.lastName
    });

    await mailpit.deleteMessage(messageId);
    console.error('SUCCESS: Invitation flow completed');
  });

program
  .command('get-operator-session')
  .description('Get operator session cookie via Kratos login')
  .requiredOption('--kratos-url <url>', 'Kratos external URL')
  .requiredOption('--keycloak-realm <realm>', 'Keycloak DFSP realm name')
  .requiredOption('--email <email>', 'Operator email')
  .requiredOption('--password <password>', 'Operator password')
  .action(async (opts) => {
    const session = await loginViaKratosOIDC({
      kratosUrl: opts.kratosUrl,
      username: opts.email,
      password: opts.password,
      provider: opts.keycloakRealm
    });
    console.log(session);
  });

program
  .command('generate-pm4ml-creds')
  .description('Generate PM4ML credentials for a DFSP')
  .requiredOption('--mcm-url <url>', 'MCM external URL')
  .requiredOption('--dfsp-id <dfsp_id>', 'DFSP ID')
  .requiredOption('--session <session>', 'Session cookie')
  .action(async (opts) => {
    const resp = await fetch(`${opts.mcmUrl}/api/dfsps/${opts.dfspId}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `ory_kratos_session=${opts.session}`
      }
    });

    const data = await resp.json();

    if (!data.clientId || !data.clientSecret) {
      console.error(`ERROR: Failed to generate PM4ML credentials for ${opts.dfspId}`);
      console.error('Response:', data);
      process.exit(1);
    }

    console.log(`${data.clientId}|${data.clientSecret}`);
  });

program
  .command('get-jwt')
  .description('Get JWT token from Keycloak using client credentials')
  .requiredOption('--keycloak-url <url>', 'Keycloak URL')
  .requiredOption('--keycloak-realm <realm>', 'Keycloak realm name')
  .requiredOption('--client-id <id>', 'Client ID')
  .requiredOption('--client-secret <secret>', 'Client secret')
  .action(async (opts) => {
    const tokenUrl = `${opts.keycloakUrl}/realms/${opts.keycloakRealm}/protocol/openid-connect/token`;

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: opts.clientId,
        client_secret: opts.clientSecret
      })
    });

    const data = await resp.json();

    if (!data.access_token) {
      console.error('ERROR: Failed to retrieve JWT token');
      console.error('Response:', data);
      process.exit(1);
    }

    console.log(data.access_token);
  });

program.parse();
