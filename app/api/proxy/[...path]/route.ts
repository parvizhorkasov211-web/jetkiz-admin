import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function normalizeBaseUrl(raw: string): string {
  return String(raw || '').trim().replace(/\/+$/, '');
}

async function getParams(context: RouteContext) {
  return await context.params;
}

function buildTargetUrl(request: NextRequest, path: string[] = []) {
  const base = normalizeBaseUrl(BACKEND_URL);
  const safePath = path
    .map((p) => encodeURIComponent(decodeURIComponent(String(p))))
    .join('/');

  const url = new URL(`${base}/${safePath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url.toString();
}

function splitSetCookieHeader(header: string): string[] {
  return header
    .split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function getSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  if (typeof headers.raw === 'function') {
    return headers.raw()['set-cookie'] || [];
  }

  const single = response.headers.get('set-cookie');
  return single ? splitSetCookieHeader(single) : [];
}

function copySafeHeaders(from: Response, to: NextResponse) {
  const blocked = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'transfer-encoding',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'upgrade',
    'set-cookie',
  ]);

  from.headers.forEach((value, key) => {
    if (!blocked.has(key.toLowerCase())) {
      to.headers.set(key, value);
    }
  });
}

function appendSetCookies(response: NextResponse, cookies: string[]) {
  for (const cookie of cookies) {
    response.headers.append('set-cookie', cookie);
  }
}

function buildForwardHeaders(request: NextRequest, cookieOverride?: string) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (
      lower === 'host' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'accept-encoding'
    ) {
      return;
    }

    headers.set(key, value);
  });

  const cookie = cookieOverride || request.headers.get('cookie');

  if (cookie) {
    headers.set('cookie', cookie);
  }

  headers.set('x-forwarded-host', request.headers.get('host') || 'localhost');
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  if (!headers.get('x-forwarded-for')) {
    headers.set('x-forwarded-for', '127.0.0.1');
  }

  return headers;
}

function mergeCookieHeader(
  originalCookieHeader: string | null,
  setCookieHeaders: string[],
): string {
  const map = new Map<string, string>();

  if (originalCookieHeader) {
    for (const part of originalCookieHeader.split(';')) {
      const trimmed = part.trim();
      const index = trimmed.indexOf('=');
      if (index <= 0) continue;

      map.set(trimmed.slice(0, index), trimmed.slice(index + 1));
    }
  }

  for (const setCookie of setCookieHeaders) {
    const first = setCookie.split(';')[0]?.trim();
    const index = first.indexOf('=');
    if (index <= 0) continue;

    const name = first.slice(0, index);
    const value = first.slice(index + 1);

    const lower = setCookie.toLowerCase();
    const deleted =
      value === '' ||
      lower.includes('max-age=0') ||
      lower.includes('expires=thu, 01 jan 1970');

    if (deleted) {
      map.delete(name);
    } else {
      map.set(name, value);
    }
  }

  return Array.from(map.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

async function getBody(request: NextRequest): Promise<BodyInit | undefined> {
  const method = request.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

async function backendFetch(
  request: NextRequest,
  targetUrl: string,
  body: BodyInit | undefined,
  cookieOverride?: string,
) {
  return fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, cookieOverride),
    body,
    redirect: 'manual',
    cache: 'no-store',
  });
}

async function refreshAdminSession(request: NextRequest) {
  const base = normalizeBaseUrl(BACKEND_URL);

  const response = await fetch(`${base}/admin/auth/refresh`, {
    method: 'POST',
    headers: buildForwardHeaders(request),
    redirect: 'manual',
    cache: 'no-store',
  });

  return {
    ok: response.ok,
    setCookies: getSetCookieHeaders(response),
  };
}

async function toNextResponse(
  request: NextRequest,
  backendResponse: Response,
  extraSetCookies: string[] = [],
) {
  const body =
    request.method.toUpperCase() === 'HEAD'
      ? null
      : await backendResponse.arrayBuffer();

  const response = new NextResponse(body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
  });

  copySafeHeaders(backendResponse, response);
  appendSetCookies(response, extraSetCookies);
  appendSetCookies(response, getSetCookieHeaders(backendResponse));

  return response;
}

function isRefreshPath(path: string[]) {
  return path.join('/') === 'admin/auth/refresh';
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = await getParams(context);
  const path = params.path || [];
  const targetUrl = buildTargetUrl(request, path);
  const body = await getBody(request);

  const firstResponse = await backendFetch(request, targetUrl, body);

  if (firstResponse.status !== 401 || isRefreshPath(path)) {
    return toNextResponse(request, firstResponse);
  }

  const refresh = await refreshAdminSession(request);

  if (!refresh.ok || refresh.setCookies.length === 0) {
    return toNextResponse(request, firstResponse, refresh.setCookies);
  }

  const retryCookieHeader = mergeCookieHeader(
    request.headers.get('cookie'),
    refresh.setCookies,
  );

  const retryResponse = await backendFetch(
    request,
    targetUrl,
    body,
    retryCookieHeader,
  );

  return toNextResponse(request, retryResponse, refresh.setCookies);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}