export type ProveedorApiItem = {
  id_proveedor: string;
  nombre: string;
  telefono: string;
  correo: string;
  productos_relacionados: number;
};

type ProveedoresListResponse = {
  items: ProveedorApiItem[];
  limit: number;
  offset: number;
};

type ProveedorGetResponse = {
  item: ProveedorApiItem;
};

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
    const detail = data && typeof data === 'object' && 'detail' in data ? (data as { detail?: unknown }).detail : null;
    throw new Error(typeof detail === 'string' && detail ? detail : msg);
  }

  return data as T;
}

export function extractIdDigits(value: string) {
  return (value ?? '').replace(/[^0-9]/g, '');
}

export function formatProveedorIdDisplay(idProveedor: string) {
  const digits = extractIdDigits(idProveedor);
  if (!digits) {
    return idProveedor;
  }

  return `#P${digits.padStart(3, '0')}`;
}

export async function listarProveedores(params?: { q?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

  const url = `/api/proveedores${qs.size ? `?${qs.toString()}` : ''}`;
  return apiFetch<ProveedoresListResponse>(url);
}

export async function crearProveedor(input: { referencia?: string; nombre: string; telefono: string; correo: string }) {
  const idDigits = input.referencia ? extractIdDigits(input.referencia) : '';
  return apiFetch<ProveedorGetResponse>('/api/proveedores', {
    method: 'POST',
    body: JSON.stringify({
      id_proveedor: idDigits || undefined,
      nombre: input.nombre,
      telefono: input.telefono,
      correo: input.correo,
    }),
  });
}

export async function actualizarProveedor(
  idProveedor: string,
  input: { nombre: string; referencia?: string; telefono: string; correo: string },
) {
  const idDigits = extractIdDigits(idProveedor || input.referencia || '');
  return apiFetch<ProveedorGetResponse>(`/api/proveedores/${idDigits || idProveedor}`, {
    method: 'PUT',
    body: JSON.stringify({
      nombre: input.nombre,
      telefono: input.telefono,
      correo: input.correo,
    }),
  });
}

export async function eliminarProveedor(idProveedor: string) {
  const idDigits = extractIdDigits(idProveedor);
  await apiFetch<void>(`/api/proveedores/${idDigits || idProveedor}`, {
    method: 'DELETE',
  });
}