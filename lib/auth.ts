export type AdminSession = {
  authenticated: boolean;
  admin: any | null;
};

export async function getSession(): Promise<AdminSession> {
  try {
    const response = await fetch('/api/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        authenticated: false,
        admin: null,
      };
    }

    const data = await response.json();

    return {
      authenticated: Boolean(data?.authenticated),
      admin: data?.admin ?? null,
    };
  } catch {
    return {
      authenticated: false,
      admin: null,
    };
  }
}

export async function isAuthed(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated;
}

export async function clearToken(): Promise<void> {
  try {
    await fetch('/api/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // no-op
  }
}