import { useEffect, useMemo, useState } from 'react';
import './Inicio.css';
import UsuarioMenu from '../Barras/UsuarioMenu';
import { formatProductoIdDisplay, listarInventario } from '../../../api/inventario';

const filasVacias = 0;

function Inicio() {
  const [productos, setProductos] = useState<Array<{
    id: string;
    nombre: string;
    cantidad: number;
    imagen: string;
  }>>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    const cargarInventario = async () => {
      setCargando(true);
      setErrorCarga(null);

      try {
        const resp = await listarInventario({ limit: 500, offset: 0 });
        const mapeados = resp.items.map((item) => ({
          id: formatProductoIdDisplay(item.id_producto),
          nombre: item.nombre || 'Producto sin nombre',
          cantidad: Number.isFinite(item.cantidad) ? item.cantidad : 0,
          imagen: item.imagen || `https://picsum.photos/seed/${item.id_producto}/120/80`,
        }));

        setProductos(mapeados);
      } catch (err) {
        setErrorCarga('No se pudo cargar el inventario para calcular la demanda.');
        setProductos([]);
      } finally {
        setCargando(false);
      }
    };

    void cargarInventario();
  }, []);

  const articulosAltaDemanda = useMemo(() => {
    const mayorStock = productos.reduce((max, producto) => Math.max(max, producto.cantidad), 0);

    return [...productos]
      .map((producto) => ({
        ...producto,
        // TODO: Reemplazar por ventas reales cuando el modulo de ventas este integrado.
        puntajeDemandaTemporal: Math.max(1, mayorStock - producto.cantidad + 1),
      }))
      .sort((a, b) => b.puntajeDemandaTemporal - a.puntajeDemandaTemporal)
      .slice(0, 5);
  }, [productos]);

  const nivelesDemanda = articulosAltaDemanda.map((articulo) => articulo.puntajeDemandaTemporal);
  const ventasUltimosDias = useMemo(() => {
    const promedioDemanda = nivelesDemanda.length
      ? nivelesDemanda.reduce((suma, valor) => suma + valor, 0) / nivelesDemanda.length
      : 0;

    const factores = [0.82, 0.9, 0.98, 1.06, 1.14];
    return factores.map((factor) => Math.max(1, Math.round(promedioDemanda * factor)));
  }, [nivelesDemanda]);

  const ventaMaxima = Math.max(...ventasUltimosDias, 1);
  const etiquetasDias = useMemo(() => {
    return ventasUltimosDias.map((_, indice, array) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - (array.length - 1 - indice));

      return new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
        .format(fecha)
        .replace('.', '')
        .replace(/^./, (caracter) => caracter.toUpperCase());
    });
  }, [ventasUltimosDias]);

  const stockTotal = productos.reduce((suma, producto) => suma + producto.cantidad, 0);
  const stockBajo = productos.filter((producto) => producto.cantidad <= 10).length;
  const totalProductos = productos.length;
  const porcentajeStockBajo = totalProductos > 0 ? Math.round((stockBajo / totalProductos) * 100) : 0;

  return (
    <section className="inicioVista" id="inicio">
      <header className="inicioEncabezado">
        <h2 className="inicioTitulo">Inicio</h2>
        <UsuarioMenu className="inicioUsuarioMenu" ariaLabel="Perfil del usuario" />
      </header>

      <section className="inicioPanelPrincipal" aria-label="Articulos de alta demanda">
        <h3 className="inicioSubtitulo">Articulos de alta demanda</h3>
        <p className="inicioNotaTemporal">Criterio temporal: productos con menor stock hasta integrar ventas.</p>

        {cargando ? <p className="inicioEstadoCarga">Cargando productos...</p> : null}
        {errorCarga ? <p className="inicioEstadoError">{errorCarga}</p> : null}

        <div className="inicioTablaContenedor">
          <table className="inicioTabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>id</th>
                <th>cantidad</th>
                <th>Imagen</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && articulosAltaDemanda.length === 0 ? (
                <tr>
                  <td colSpan={4}>No hay productos para mostrar.</td>
                </tr>
              ) : null}

              {articulosAltaDemanda.map((articulo) => (
                <tr key={articulo.id}>
                  <td>{articulo.nombre}</td>
                  <td>{articulo.id}</td>
                  <td>{articulo.cantidad}</td>
                  <td>
                    <img className="inicioTablaImagen" src={articulo.imagen} alt={articulo.nombre} />
                  </td>
                </tr>
              ))}
              {Array.from({ length: filasVacias }).map((_, indice) => (
                <tr key={`vacia-${indice}`} className="inicioFilaVacia" aria-hidden="true">
                  <td colSpan={4} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="inicioGraficas" aria-label="Resumen grafico de inventario">
        <article className="inicioGraficaBloque">
          <p className="inicioPieTitulo">Inventario de productos</p>
          <div
            className="inicioPie"
            aria-hidden="true"
            style={{
              background: `conic-gradient(#7fc2f8 0 ${porcentajeStockBajo}%, #1b6eb1 ${porcentajeStockBajo}% 90%, #2d96de 90% 100%)`,
            }}
          >
            <span className="inicioPieCentro">{porcentajeStockBajo}%</span>
          </div>
          <div className="inicioLeyenda">
            <p>
              <span className="inicioLeyendaPunto inicioLeyendaPuntoPrimario" />
              Productos en stock bajo: {stockBajo}
            </p>
            <p>
              <span className="inicioLeyendaPunto inicioLeyendaPuntoSecundario" />
              Stock disponible: {stockTotal}
            </p>
          </div>
        </article>

        <article className="inicioGraficaBloque">
          <div className="inicioBarras">
            {ventasUltimosDias.map((valor, indice) => (
              <div key={`barra-${indice}`} className="inicioBarraGrupo">
                <span
                  className="inicioBarra"
                  style={{ height: `${38 + (valor / ventaMaxima) * 112}px` }}
                  aria-hidden="true"
                />
                <span className="inicioBarraEtiqueta">{etiquetasDias[indice]}</span>
              </div>
            ))}
          </div>
          <p className="inicioGraficaTitulo">Ventas los ultimos dias</p>
        </article>
      </section>

      <div className="inicioFranjaFooter" aria-hidden="true" />
    </section>
  );
}

export default Inicio;
