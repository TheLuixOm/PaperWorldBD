export type InventarioApiItem = {
  id_producto: string;
  inventario_id_actualizacion: string;
  cambios_inv_id_actualizacion: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
  categoria: string;
  fecha_actualizacion: string | null;
  stock_minimo: number | null;
};

type InventarioListResponse = {
  items: InventarioApiItem[];
  limit: number;
  offset: number;
};

type InventarioGetResponse = {
  item: InventarioApiItem;
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

export function parsePrecioInput(precio: string) {
  const limpio = precio.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

export function formatPrecioDisplay(precio: number) {
  const n = Number.isFinite(precio) ? precio : 0;
  const formatted = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n);
  return `$ ${formatted}`;
}

export function formatProductoIdDisplay(idProducto: string) {
  const digits = (idProducto ?? '').replace(/[^0-9]/g, '');
  if (!digits) {
    return idProducto;
  }
  return `#${digits.padStart(4, '0')}`;
}

export function extractIdDigits(value: string) {
  return (value ?? '').replace(/[^0-9]/g, '');
}

export async function listarInventario(params?: { q?: string; categoria?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.categoria) qs.set('categoria', params.categoria);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

  const url = `/api/inventario${qs.size ? `?${qs.toString()}` : ''}`;
  return apiFetch<InventarioListResponse>(url);
}

export async function crearProductoInventario(input: {
  referencia?: string;
  nombre: string;
  categoria?: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  imagen_base64?: string;
  imagen_mime?: string;
  imagen_nombre?: string;
  stock_minimo?: number;
}) {
  const idDigits = input.referencia ? extractIdDigits(input.referencia) : '';
  const body = {
    id_producto: idDigits || undefined,
    nombre: input.nombre,
    categoria: input.categoria ?? '',
    precio: input.precio,
    cantidad: input.cantidad,
    imagen: input.imagen ?? '',
    imagen_base64: input.imagen_base64 ?? '',
    imagen_mime: input.imagen_mime ?? '',
    imagen_nombre: input.imagen_nombre ?? '',
    stock_minimo: typeof input.stock_minimo === 'number' ? input.stock_minimo : undefined,
  };

  return apiFetch<InventarioGetResponse>(`/api/inventario`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function actualizarProductoInventario(idProducto: string, input: {
  nombre: string;
  referencia?: string;
  categoria?: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  stock_minimo?: number;
}) {
  const idDigits = extractIdDigits(idProducto || input.referencia || '');

  const body = {
    nombre: input.nombre,
    categoria: input.categoria ?? '',
    precio: input.precio,
    cantidad: input.cantidad,
    imagen: input.imagen ?? '',
    stock_minimo: typeof input.stock_minimo === 'number' ? input.stock_minimo : undefined,
  };

  return apiFetch<InventarioGetResponse>(`/api/inventario/${idDigits || idProducto}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function eliminarProductoInventario(idProducto: string) {
  const idDigits = extractIdDigits(idProducto);
  await apiFetch<void>(`/api/inventario/${idDigits || idProducto}`, {
    method: 'DELETE',
  });
}
