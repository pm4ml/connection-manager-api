interface KratosFlowData {
  ui?: {
    action?: string;
    nodes?: Array<{
      attributes?: {
        name?: string;
        value?: string;
      };
    }>;
  };
  redirect_browser_to?: string;
}

function extractCsrfToken(flowData: KratosFlowData): string | undefined {
  const csrfInput = flowData.ui?.nodes?.find(node =>
    node.attributes?.name === 'csrf_token'
  );
  return csrfInput?.attributes?.value;
}

function extractCookies(response: Response): string {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  return setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
}

function mergeCookies(existing: string, newCookies: string): string {
  if (!newCookies) return existing;
  if (!existing) return newCookies;

  const cookieMap = new Map<string, string>();

  for (const cookie of existing.split('; ')) {
    const [name] = cookie.split('=');
    if (name) cookieMap.set(name, cookie);
  }

  for (const cookie of newCookies.split('; ')) {
    const [name] = cookie.split('=');
    if (name) cookieMap.set(name, cookie);
  }

  return Array.from(cookieMap.values()).join('; ');
}

export interface LoginViaKratosOIDCOptions {
  kratosUrl: string;
  username: string;
  password: string;
  provider: string;
  userAgent?: string;
}

export async function loginViaKratosOIDC(options: LoginViaKratosOIDCOptions): Promise<string> {
  const { kratosUrl, username, password, provider, userAgent = 'mcm-test-lib' } = options;

  // Step 1: Initialize Kratos browser login flow
  const flowInitResp = await fetch(`${kratosUrl}/self-service/login/browser`, {
    redirect: 'manual',
    headers: { 'User-Agent': userAgent }
  });

  const flowLocation = flowInitResp.headers.get('location');
  const flowIdMatch = flowLocation?.match(/flow=([^&]+)/);
  if (!flowIdMatch) {
    throw new Error(`Failed to initialize Kratos login flow. Location: ${flowLocation}`);
  }
  const flowId = flowIdMatch[1];
  const initCookies = extractCookies(flowInitResp);

  // Step 2: Get flow data
  const flowDataResp = await fetch(`${kratosUrl}/self-service/login/flows?id=${flowId}`, {
    headers: {
      'User-Agent': userAgent,
      'Cookie': initCookies
    }
  });
  const flowData: KratosFlowData = await flowDataResp.json();
  const csrfToken = extractCsrfToken(flowData);
  const flowCookies = initCookies;

  if (!csrfToken) {
    throw new Error('Failed to extract CSRF token from Kratos flow');
  }

  // Step 3: Submit OIDC provider - this redirects to Keycloak
  const oidcSubmitResp = await fetch(flowData.ui!.action!, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': flowCookies,
      'User-Agent': userAgent
    },
    body: JSON.stringify({
      csrf_token: csrfToken,
      provider: provider
    })
  });

  const oidcCookies = extractCookies(oidcSubmitResp);
  const kratosCookies = mergeCookies(flowCookies, oidcCookies);

  // Step 4: Follow redirect to Keycloak login page
  let keycloakLoginUrl = oidcSubmitResp.headers.get('location');
  if (oidcSubmitResp.status === 422) {
    const oidcBody: KratosFlowData = await oidcSubmitResp.json();
    keycloakLoginUrl = oidcBody.redirect_browser_to ?? null;
  }
  if (!keycloakLoginUrl || !keycloakLoginUrl.includes('keycloak')) {
    throw new Error(`Expected redirect to Keycloak, got: ${keycloakLoginUrl}`);
  }

  const keycloakPageResp = await fetch(keycloakLoginUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': userAgent }
  });
  const keycloakHtml = await keycloakPageResp.text();
  const keycloakCookies = extractCookies(keycloakPageResp);

  // Step 5: Extract login form action
  const formActionMatch = keycloakHtml.match(/action="([^"]*)"/);
  if (!formActionMatch) {
    throw new Error('Failed to find Keycloak login form');
  }
  const formAction = formActionMatch[1].replace(/&amp;/g, '&');

  // Step 6: Submit credentials to Keycloak
  const keycloakLoginResp = await fetch(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': keycloakCookies,
      'User-Agent': userAgent
    },
    body: new URLSearchParams({
      username: username,
      password: password
    })
  });

  // Step 7: Follow redirect chain back to Kratos
  let currentResp = keycloakLoginResp;
  let accumulatedCookies = mergeCookies(kratosCookies, keycloakCookies);
  const maxRedirects = 10;

  for (let i = 0; i < maxRedirects; i++) {
    const location = currentResp.headers.get('location');
    if (!location) break;

    const newCookies = extractCookies(currentResp);
    if (newCookies) {
      accumulatedCookies = mergeCookies(accumulatedCookies, newCookies);
    }

    currentResp = await fetch(location, {
      redirect: 'manual',
      headers: {
        'Cookie': accumulatedCookies,
        'User-Agent': userAgent
      }
    });

    if (currentResp.status === 200) {
      break;
    }
  }

  // Step 8: Extract Kratos session cookie
  const finalCookies = extractCookies(currentResp);
  if (finalCookies) {
    accumulatedCookies = mergeCookies(accumulatedCookies, finalCookies);
  }
  const sessionMatch = accumulatedCookies.match(/ory_kratos_session=([^;,]+)/);

  if (!sessionMatch) {
    throw new Error(`Failed to extract Kratos session cookie. Final cookies: ${accumulatedCookies}`);
  }

  return sessionMatch[1];
}
