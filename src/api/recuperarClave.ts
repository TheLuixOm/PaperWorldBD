type ApiOk = { ok: boolean; error?: string; detail?: string };

type VerifyTelefonoResponse = ApiOk;

type ResetClaveResponse = ApiOk;

async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export function normalizarTelefono(telefono: string) {
  return (telefono ?? '').replace(/[^0-9]/g, '');
}

export async function verificarTelefono(telefono: string) {
  const tel = normalizarTelefono(telefono);
  return apiFetch<VerifyTelefonoResponse>('/api/auth/password-reset/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ telefono: tel }),
  });
}

export async function restablecerClave(telefono: string, nuevaClave: string) {
  const tel = normalizarTelefono(telefono);
  return apiFetch<ResetClaveResponse>('/api/auth/password-reset/reset', {
    method: 'POST',
    body: JSON.stringify({ telefono: tel, nuevaClave }),
  });
}
