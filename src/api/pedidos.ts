type PedidoProcesarResponse = {
  pedido: {
    id: string;
    fecha: string;
    cliente: string;
    items: number;
    total: number;
    estado: 'Pendiente' | 'En preparación' | 'Listo';
  };
  id_orden: string;
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

export async function procesarPedido(input: { usuarioId?: string; items: Array<{ id: string; cantidad: number }> }) {
  return apiFetch<PedidoProcesarResponse>('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify({
      usuarioId: input.usuarioId ?? '',
      items: input.items,
    }),
  });
}
