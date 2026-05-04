export type ProductoApiItem = {
  id: string;
  nombre: string;
  descripcion: string;
  descripcion: string;
  categoria: string;
  precio: number;
  cantidad: number;
  imagen: string;
  vendidos: number;
};

type ProductosListResponse = {
  items: ProductoApiItem[];
  limit: number;
  offset: number;
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
    throw new Error(msg);
  }

  return data as T;
}

export async function listarProductos(params?: { q?: string; categoria?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.categoria) qs.set('categoria', params.categoria);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

  const url = `/api/productos${qs.size ? `?${qs.toString()}` : ''}`;
  return apiFetch<ProductosListResponse>(url);
}
