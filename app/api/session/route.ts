import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3000";

function splitCombinedSetCookieHeader(header: string): string[] {
  return header
    .split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSetCookieHeaders(response: Response): string[] {
  const anyHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof anyHeaders.getSetCookie === "function") {
    const cookies = anyHeaders.getSetCookie();
    if (cookies.length > 0) {
      return cookies;
    }
  }

  const raw = typeof anyHeaders.raw === "function" ? anyHeaders.raw() : null;
  if (raw?.["set-cookie"]?.length) {
    return raw["set-cookie"].flatMap((value) => splitCombinedSetCookieHeader(value));
  }

  const single = response.headers.get("set-cookie");
  if (!single) {
    return [];
  }

  return splitCombinedSetCookieHeader(single);
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const phone = String(body?.phone ?? "").trim();
    const password = String(body?.password ?? "");

    if (!phone || !password) {
      return NextResponse.json(
        { message: "Phone and password are required" },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(`${BACKEND_URL}/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, password }),
      redirect: "manual",
      cache: "no-store",
    });

    const data = await parseJsonSafe(backendResponse);

    console.log("admin login backend status:", backendResponse.status);
    console.log("admin login backend set-cookie:", getSetCookieHeaders(backendResponse));

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          message:
            data?.message ||
            data?.error ||
            data?.raw ||
            "Admin login failed",
        },
        { status: backendResponse.status || 401 },
      );
    }

    if (!data?.success || !data?.admin) {
      return NextResponse.json(
        { message: "Backend did not return a valid session" },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        admin: data.admin,
      },
      { status: 200 },
    );

    const setCookies = getSetCookieHeaders(backendResponse);
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const backendResponse = await fetch(`${BACKEND_URL}/admin/auth/me`, {
      method: "GET",
      headers: cookieHeader
        ? {
            cookie: cookieHeader,
          }
        : undefined,
      cache: "no-store",
    });

    const data = await parseJsonSafe(backendResponse);

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          admin: null,
          message:
            data?.message ||
            data?.error ||
            data?.raw ||
            "Unauthorized",
        },
        { status: backendResponse.status || 401 },
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        admin: data?.admin ?? data ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        admin: null,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const backendResponse = await fetch(`${BACKEND_URL}/admin/auth/logout`, {
      method: "POST",
      headers: cookieHeader
        ? {
            cookie: cookieHeader,
          }
        : undefined,
      cache: "no-store",
    });

    const response = NextResponse.json({ success: true }, { status: 200 });

    const setCookies = getSetCookieHeaders(backendResponse);
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}