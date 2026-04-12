export type ReporteVentaItem = {
  id: string;
  fecha: string;
  cliente: string;
  items: number;
  total: number;
  estado: 'Procesado' | 'Reembolsado';
};

export type ReportePedidoItem = {
  id: string;
  fecha: string;
  cliente: string;
  items: number;
  total: number;
  estado: 'Pendiente' | 'En preparación' | 'Listo';
};

type ReporteVentasResponse = {
  items: ReporteVentaItem[];
  limit: number;
  offset: number;
};

type ReportePedidosResponse = {
  items: ReportePedidoItem[];
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

export async function listarReporteVentas(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

  const url = `/api/reportes/ventas${qs.size ? `?${qs.toString()}` : ''}`;
  return apiFetch<ReporteVentasResponse>(url);
}

export async function listarReportePedidos(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset));

  const url = `/api/reportes/pedidos${qs.size ? `?${qs.toString()}` : ''}`;
  return apiFetch<ReportePedidosResponse>(url);
}

export async function finalizarPedido(idPedido: string) {
  const cleaned = (idPedido ?? '').toString();
  const digits = cleaned.replace(/[^0-9-]/g, '');
  const id = digits || cleaned;
  return apiFetch<{ ok: true; id: string }>(`/api/reportes/pedidos/${id}/finalizar`, {
    method: 'POST',
  });
}
