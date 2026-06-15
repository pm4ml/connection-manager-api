import { CookieJar } from 'tough-cookie';

export interface ProfileData {
  firstName: string;
  lastName: string;
}

// Completes the Kratos invitation flow: the DFSP-admin invitation email contains
// a recovery magic-link; following it signs the user in and lands on the settings
// page where they set their password. The profile (name) settings method is
// disabled, so completion is password-only.
export class KratosHelper {
  private cookieJar: CookieJar;
  private kratosUrl: string;

  constructor(kratosUrl: string) {
    this.cookieJar = new CookieJar();
    this.kratosUrl = kratosUrl;
  }

  private async fetchWithCookies(url: string, options: RequestInit = {}): Promise<Response> {
    const cookies = await this.cookieJar.getCookieString(url);
    const headers = new Headers(options.headers);
    if (cookies) {
      headers.set('Cookie', cookies);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual'
    });

    for (const cookie of response.headers.getSetCookie()) {
      await this.cookieJar.setCookie(cookie, url);
    }

    return response;
  }

  private extractCsrfToken(flow: any): string {
    const node = flow?.ui?.nodes?.find(
      (n: any) => n?.attributes?.name === 'csrf_token'
    );
    const value = node?.attributes?.value;
    if (!value) {
      throw new Error('Could not find csrf_token in Kratos flow');
    }
    return value;
  }

  // The profileData arg is accepted but ignored: the Kratos profile settings
  // method is disabled, so only the password can be set here.
  async completePasswordSetup(invitationLink: string, newPassword: string, _profileData?: ProfileData): Promise<void> {
    // Step 1: follow the recovery magic-link. Each redirect signs the user in
    // (session cookie) and ends at auth.mcm.localhost/settings?flow=<id>.
    let currentUrl = invitationLink;
    let settingsFlowId: string | null = null;
    const maxRedirects = 10;

    for (let i = 0; i < maxRedirects; i++) {
      const response = await this.fetchWithCookies(currentUrl);

      if (response.status === 302 || response.status === 303) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect without a location header during recovery flow');
        }
        const settingsMatch = location.match(/\/settings\?flow=([^&]+)/);
        if (settingsMatch) {
          settingsFlowId = settingsMatch[1];
          break;
        }
        currentUrl = location;
        continue;
      }

      break;
    }

    if (!settingsFlowId) {
      throw new Error('Did not reach the settings flow after following the recovery link');
    }

    // Step 2: fetch the settings flow to obtain its csrf_token.
    const flowResponse = await this.fetchWithCookies(
      `${this.kratosUrl}/self-service/settings/flows?id=${settingsFlowId}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (flowResponse.status !== 200) {
      const body = await flowResponse.text();
      throw new Error(`Failed to fetch settings flow (status ${flowResponse.status}): ${body}`);
    }

    const flow = await flowResponse.json();
    const csrfToken = this.extractCsrfToken(flow);

    // Step 3: submit the new password to the settings flow.
    const submitResponse = await this.fetchWithCookies(
      `${this.kratosUrl}/self-service/settings?flow=${settingsFlowId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          method: 'password',
          password: newPassword,
          csrf_token: csrfToken
        })
      }
    );

    if (submitResponse.status !== 200) {
      const body = await submitResponse.text();
      throw new Error(`Failed to set password (status ${submitResponse.status}): ${body}`);
    }
  }
}
