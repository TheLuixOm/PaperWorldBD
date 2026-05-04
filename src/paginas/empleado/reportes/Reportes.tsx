import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import '../inventario/Inventario.css';
import './Reportes.css';
import UsuarioMenu from '../Barras/UsuarioMenu';
import {
  finalizarPedido,
  listarReporteInventario,
  listarReportePedidos,
  listarReporteVentas,
  type ReporteInventarioItem,
  type ReportePedidoItem,
  type ReporteVentaItem,
} from '../../../api/reportes';

type ReporteTab = 'ventas' | 'pedidos' | 'inventario';

type RegistroVenta = {
  id: string;
  fecha: string;
  cliente: string;
  items: number;
  total: number;
  estado: 'Procesado' | 'Reembolsado';
};

type RegistroPedido = {
  id: string;
  fecha: string;
  cliente: string;
  items: number;
  total: number;
  estado: 'Pendiente' | 'En preparación' | 'Listo';
};

type RegistroInventario = {
  id: string;
  producto: string;
  categoria: string;
  stock: number;
  minimo: number;
  ultimoCambio: string;
  tipo: 'Stock bajo' | 'Cambio reciente';
  movimiento?: 'Agregado' | 'Eliminado';
};

function IconoLupa() {
  return <Search aria-hidden="true" />;
}

function formatearDinero(valor: number) {
  return `USD ${valor.toFixed(2)}`;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function coincideBusqueda(consulta: string, campos: Array<string | number>) {
  const consultaNormalizada = normalizarTexto(consulta.trim());
  if (!consultaNormalizada) {
    return true;
  }

  const haystack = normalizarTexto(campos.map(String).join(' '));
  return haystack.includes(consultaNormalizada);
}

function formatearStockInventario(registro: RegistroInventario) {
  if (registro.tipo !== 'Cambio reciente') {
    return String(registro.stock);
  }

  if (registro.movimiento === 'Eliminado') {
    return `-${registro.stock}`;
  }

  if (registro.movimiento === 'Agregado') {
    return `+${registro.stock}`;
  }

  // Si no hay movimiento, no inventar un signo.
  return String(registro.stock);
}

function claseStockInventario(registro: RegistroInventario) {
  if (registro.tipo === 'Stock bajo' && registro.stock <= registro.minimo) {
    return 'reportesStockBajo';
  }

  if (registro.tipo === 'Cambio reciente') {
    if (registro.movimiento === 'Eliminado') {
      return 'reportesStockCambioMenos';
    }

    if (registro.movimiento === 'Agregado') {
      return 'reportesStockCambioMas';
    }

    return '';
  }

  return '';
}

function Reportes() {
  const [tab, setTab] = useState<ReporteTab>('ventas');
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [busquedaPedidos, setBusquedaPedidos] = useState('');
  const [busquedaInventario, setBusquedaInventario] = useState('');

  const [ventas, setVentas] = useState<RegistroVenta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

  const [pedidos, setPedidos] = useState<RegistroPedido[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);
  const [finalizandoPedidoId, setFinalizandoPedidoId] = useState<string | null>(null);

  const [inventario, setInventario] = useState<RegistroInventario[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(true);
  const [errorInventario, setErrorInventario] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cargarVentas = async () => {
      try {
        setCargandoVentas(true);
        setErrorVentas(null);
        const res = await listarReporteVentas({ limit: 200, offset: 0 });
        if (cancelled) {
          return;
        }

        const normalizadas = res.items.map((v: ReporteVentaItem) => ({
          id: v.id,
          fecha: v.fecha,
          cliente: v.cliente,
          items: Number.isFinite(v.items) ? v.items : 0,
          total: Number.isFinite(v.total) ? v.total : 0,
          estado: (v.estado === 'Reembolsado' ? 'Reembolsado' : 'Procesado') as 'Procesado' | 'Reembolsado',
        }));

        setVentas(normalizadas);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setErrorVentas(err instanceof Error ? err.message : 'No se pudieron cargar las ventas');
        setVentas([]);
      } finally {
        if (!cancelled) {
          setCargandoVentas(false);
        }
      }
    };

    void cargarVentas();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cargarInventario = async () => {
      try {
        setCargandoInventario(true);
        setErrorInventario(null);
        const res = await listarReporteInventario({ limit: 200, offset: 0 });
        if (cancelled) {
          return;
        }

        const normalizados = res.items.map((i: ReporteInventarioItem) => ({
          id: i.id,
          producto: i.producto,
          categoria: i.categoria,
          stock: Number.isFinite(i.stock) ? i.stock : 0,
          minimo: Number.isFinite(i.minimo) ? i.minimo : 0,
          ultimoCambio: i.ultimoCambio,
          tipo: (i.tipo === 'Cambio reciente' ? 'Cambio reciente' : 'Stock bajo') as 'Stock bajo' | 'Cambio reciente',
          movimiento: i.movimiento,
        }));

        setInventario(normalizados);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setErrorInventario(err instanceof Error ? err.message : 'No se pudo cargar el inventario');
        setInventario([]);
      } finally {
        if (!cancelled) {
          setCargandoInventario(false);
        }
      }
    };

    void cargarInventario();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cargarPedidos = async () => {
      try {
        setCargandoPedidos(true);
        setErrorPedidos(null);
        const res = await listarReportePedidos({ limit: 200, offset: 0 });
        if (cancelled) {
          return;
        }

        const normalizados = res.items.map((p: ReportePedidoItem) => ({
          id: p.id,
          fecha: p.fecha,
          cliente: p.cliente,
          items: Number.isFinite(p.items) ? p.items : 0,
          total: Number.isFinite(p.total) ? p.total : 0,
          estado: (p.estado === 'En preparación' ? 'En preparación' : p.estado === 'Listo' ? 'Listo' : 'Pendiente') as
            | 'Pendiente'
            | 'En preparación'
            | 'Listo',
        }));

        setPedidos(normalizados);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setErrorPedidos(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
        setPedidos([]);
      } finally {
        if (!cancelled) {
          setCargandoPedidos(false);
        }
      }
    };

    void cargarPedidos();

    return () => {
      cancelled = true;
    };
  }, []);

  const onFinalizarPedido = async (id: string) => {
    if (finalizandoPedidoId) {
      return;
    }

    setFinalizandoPedidoId(id);
    try {
      await finalizarPedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));

      try {
        setCargandoVentas(true);
        setErrorVentas(null);
        const resVentas = await listarReporteVentas({ limit: 200, offset: 0 });

        const normalizadas = resVentas.items.map((v: ReporteVentaItem) => ({
          id: v.id,
          fecha: v.fecha,
          cliente: v.cliente,
          items: Number.isFinite(v.items) ? v.items : 0,
          total: Number.isFinite(v.total) ? v.total : 0,
          estado: (v.estado === 'Reembolsado' ? 'Reembolsado' : 'Procesado') as 'Procesado' | 'Reembolsado',
        }));

        setVentas(normalizadas);
      } catch (err) {
        setErrorVentas(err instanceof Error ? err.message : 'No se pudieron cargar las ventas');
      } finally {
        setCargandoVentas(false);
      }

      setTab('ventas');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo finalizar el pedido');
    } finally {
      setFinalizandoPedidoId(null);
    }
  };

  const totalVentas = useMemo(() => ventas.reduce((acc, v) => acc + v.total, 0), [ventas]);
  const totalPedidos = useMemo(() => pedidos.reduce((acc, p) => acc + p.total, 0), [pedidos]);
  const stockBajo = useMemo(() => inventario.filter((i) => i.tipo === 'Stock bajo').length, [inventario]);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) =>
      coincideBusqueda(busquedaVentas, [v.id, v.fecha, v.cliente, v.items, v.total, v.estado]),
    );
  }, [ventas, busquedaVentas]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => coincideBusqueda(busquedaPedidos, [p.id, p.fecha, p.cliente, p.items, p.total, p.estado]));
  }, [pedidos, busquedaPedidos]);

  const inventarioFiltrado = useMemo(() => {
    return inventario.filter((i) =>
      coincideBusqueda(busquedaInventario, [i.id, i.producto, i.categoria, i.stock, i.minimo, i.ultimoCambio, i.tipo, i.movimiento ?? '']),
    );
  }, [inventario, busquedaInventario]);

  const navegacionTabs = (
    <div className="reportesBottom">
      <div className="reportesTabs" role="tablist" aria-label="Secciones de reportes">
        <button
          type="button"
          className={`reportesTab ${tab === 'ventas' ? 'reportesTabActiva' : ''}`}
          onClick={() => setTab('ventas')}
          role="tab"
          aria-selected={tab === 'ventas'}
        >
          Ventas
        </button>
        <button
          type="button"
          className={`reportesTab ${tab === 'pedidos' ? 'reportesTabActiva' : ''}`}
          onClick={() => setTab('pedidos')}
          role="tab"
          aria-selected={tab === 'pedidos'}
        >
          Pedidos
        </button>
        <button
          type="button"
          className={`reportesTab ${tab === 'inventario' ? 'reportesTabActiva' : ''}`}
          onClick={() => setTab('inventario')}
          role="tab"
          aria-selected={tab === 'inventario'}
        >
          Inventario
        </button>
      </div>
    </div>
  );

  return (
    <section className="inventarioVista reportesVista" id="reportes">
      <header className="inventarioEncabezado reportesEncabezado">
        <div className="reportesTop">
          <h2 className="inventarioTitulo">REPORTES</h2>

          <div className="reportesTopAcciones">
            <UsuarioMenu className="inventarioUsuarioMenu" ariaLabel="Perfil del usuario" />
          </div>
        </div>
      </header>

      <section className="inventarioPanel reportesPanel" aria-label="Contenido de reportes">
        {tab === 'ventas' && (
          <>
            <div className="reportesSeccionHeader">
              {navegacionTabs}
              <h3 className="inventarioSubtitulo reportesSubtitulo">Registro de ventas procesadas</h3>

              <div className="reportesBusquedaWrap">
                <span className="reportesBusquedaIcono" aria-hidden="true">
                  <IconoLupa />
                </span>
                <input
                  className="reportesBusquedaInput"
                  type="text"
                  placeholder="Buscar venta por pedido, fecha o cliente..."
                  value={busquedaVentas}
                  onChange={(e) => setBusquedaVentas(e.target.value)}
                />
              </div>

              <div className="reportesResumen" aria-label="Resumen">
                <div className="reportesKpi">
                  <p className="reportesKpiLabel">Ventas procesadas</p>
                  <p className="reportesKpiValor">{formatearDinero(totalVentas)}</p>
                </div>
                <div className="reportesKpi">
                  <p className="reportesKpiLabel">Pedidos (carrito)</p>
                  <p className="reportesKpiValor">{formatearDinero(totalPedidos)}</p>
                </div>
                <div className="reportesKpi">
                  <p className="reportesKpiLabel">Stock bajo</p>
                  <p className="reportesKpiValor">{stockBajo}</p>
                </div>
              </div>
            </div>

            {cargandoVentas && <p>Cargando ventas...</p>}
            {errorVentas && <p>Error al cargar ventas: {errorVentas}</p>}

            <div className="inventarioTablaContenedor reportesTabla" role="region" aria-label="Tabla de ventas">
              <table className="inventarioTabla">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((v) => (
                    <tr key={v.id} className="inventarioFila">
                      <td className="reportesCeldaCodigo">{v.id}</td>
                      <td>{v.fecha}</td>
                      <td className="reportesCeldaCliente">
                        <span className="reportesClienteTexto">{v.cliente}</span>
                      </td>
                      <td>{v.items}</td>
                      <td className="reportesCeldaTotal">{formatearDinero(v.total)}</td>
                      <td>
                        <span className={`reportesEstado ${v.estado === 'Procesado' ? 'reportesEstadoOk' : 'reportesEstadoWarn'}`}>
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reportesListaMovil" role="list" aria-label="Ventas">
              {ventasFiltradas.map((v) => (
                <article key={v.id} className="reportesCard" role="listitem">
                  <div className="reportesCardTop">
                    <p className="reportesCardTitulo">{v.id}</p>
                    <span className={`reportesEstado ${v.estado === 'Procesado' ? 'reportesEstadoOk' : 'reportesEstadoWarn'}`}>
                      {v.estado}
                    </span>
                  </div>
                  <p className="reportesCardMeta">{v.fecha} · {v.items} items</p>
                  <p className="reportesCardLinea"><span>Cliente:</span> {v.cliente}</p>
                  <p className="reportesCardLinea"><span>Total:</span> {formatearDinero(v.total)}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === 'pedidos' && (
          <>
            <div className="reportesSeccionHeader">
              {navegacionTabs}
              <h3 className="inventarioSubtitulo reportesSubtitulo">Pedidos pendientes (procesados desde carrito)</h3>

              <div className="reportesBusquedaWrap">
                <span className="reportesBusquedaIcono" aria-hidden="true">
                  <IconoLupa />
                </span>
                <input
                  className="reportesBusquedaInput"
                  type="text"
                  placeholder="Buscar pedido por ID, fecha o cliente..."
                  value={busquedaPedidos}
                  onChange={(e) => setBusquedaPedidos(e.target.value)}
                />
              </div>
            </div>

            <div className="inventarioTablaContenedor reportesTabla" role="region" aria-label="Tabla de pedidos">
              {cargandoPedidos && <p>Cargando pedidos...</p>}
              {errorPedidos && <p>Error al cargar pedidos: {errorPedidos}</p>}
              <table className="inventarioTabla">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id} className="inventarioFila">
                      <td className="reportesCeldaCodigo">{p.id}</td>
                      <td>{p.fecha}</td>
                      <td className="reportesCeldaCliente">
                        <span className="reportesClienteTexto">{p.cliente}</span>
                      </td>
                      <td>{p.items}</td>
                      <td className="reportesCeldaTotal">{formatearDinero(p.total)}</td>
                      <td>
                        <span className={`reportesEstado ${p.estado === 'Pendiente' ? 'reportesEstadoWarn' : 'reportesEstadoOk'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="reportesCeldaAccion">
                        <button
                          type="button"
                          className="reportesAccion"
                          onClick={() => onFinalizarPedido(p.id)}
                          disabled={finalizandoPedidoId === p.id}
                        >
                          Finalizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reportesListaMovil" role="list" aria-label="Pedidos">
              {pedidosFiltrados.map((p) => (
                <article key={p.id} className="reportesCard" role="listitem">
                  <div className="reportesCardTop">
                    <p className="reportesCardTitulo">{p.id}</p>
                    <span className={`reportesEstado ${p.estado === 'Pendiente' ? 'reportesEstadoWarn' : 'reportesEstadoOk'}`}>
                      {p.estado}
                    </span>
                  </div>
                  <p className="reportesCardMeta">{p.fecha} · {p.items} items</p>
                  <p className="reportesCardLinea"><span>Cliente:</span> {p.cliente}</p>
                  <p className="reportesCardLinea"><span>Total:</span> {formatearDinero(p.total)}</p>
                  <button
                    type="button"
                    className="reportesAccion reportesAccionMovil"
                    onClick={() => onFinalizarPedido(p.id)}
                    disabled={finalizandoPedidoId === p.id}
                  >
                    Finalizar
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === 'inventario' && (
          <>
            <div className="reportesSeccionHeader">
              {navegacionTabs}
              <h3 className="inventarioSubtitulo reportesSubtitulo">Stock bajo y cambios recientes de inventario</h3>

              <div className="reportesBusquedaWrap">
                <span className="reportesBusquedaIcono" aria-hidden="true">
                  <IconoLupa />
                </span>
                <input
                  className="reportesBusquedaInput"
                  type="text"
                  placeholder="Buscar producto por nombre, categoria o ID..."
                  value={busquedaInventario}
                  onChange={(e) => setBusquedaInventario(e.target.value)}
                />
              </div>
            </div>

            {cargandoInventario && <p>Cargando inventario...</p>}
            {errorInventario && <p>Error al cargar inventario: {errorInventario}</p>}

            <div className="inventarioTablaContenedor reportesTabla" role="region" aria-label="Tabla de inventario">
              <table className="inventarioTabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Stock</th>
                    <th>Minimo</th>
                    <th>Ultimo cambio</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioFiltrado.map((i) => (
                    <tr key={i.id} className="inventarioFila">
                      <td className="reportesCeldaProducto">{i.producto}</td>
                      <td>{i.categoria}</td>
                      <td className={claseStockInventario(i)}>{formatearStockInventario(i)}</td>
                      <td>{i.minimo}</td>
                      <td>{i.ultimoCambio}</td>
                      <td>
                        <span className={`reportesEstado ${i.tipo === 'Stock bajo' ? 'reportesEstadoWarn' : 'reportesEstadoOk'}`}>
                          {i.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reportesListaMovil" role="list" aria-label="Inventario">
              {inventarioFiltrado.map((i) => (
                <article key={i.id} className="reportesCard" role="listitem">
                  <div className="reportesCardTop">
                    <p className="reportesCardTitulo">{i.producto}</p>
                    <span className={`reportesEstado ${i.tipo === 'Stock bajo' ? 'reportesEstadoWarn' : 'reportesEstadoOk'}`}>
                      {i.tipo}
                    </span>
                  </div>
                  <p className="reportesCardMeta">{i.categoria} · {i.ultimoCambio}</p>
                  <p className="reportesCardLinea"><span>Stock:</span> <span className={claseStockInventario(i)}>{formatearStockInventario(i)}</span> (min {i.minimo})</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

export default Reportes;
