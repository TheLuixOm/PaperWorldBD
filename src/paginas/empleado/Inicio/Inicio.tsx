import './Inicio.css';
import { productosIniciales } from '../datosInventario';
import UsuarioMenu from '../Barras/UsuarioMenu';

const filasVacias = 0;

function Inicio() {
  const articulosAltaDemanda = [...productosIniciales]
    .map((producto) => {
      const puntajeDemanda = producto.vendidos * 0.7 + (300 - producto.cantidad) * 0.3;

      return {
        ...producto,
        puntajeDemanda,
      };
    })
    .sort((a, b) => b.puntajeDemanda - a.puntajeDemanda)
    .slice(0, 5);

  const ventasUltimosDias = articulosAltaDemanda.map((articulo) => articulo.vendidos);
  const ventaMaxima = Math.max(...ventasUltimosDias, 1);
  const etiquetasDias = ventasUltimosDias.map((_, indice, array) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (array.length - 1 - indice));

    return new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
      .format(fecha)
      .replace('.', '')
      .replace(/^./, (caracter) => caracter.toUpperCase());
  });

  const vendidosTotales = productosIniciales.reduce((suma, producto) => suma + producto.vendidos, 0);
  const stockTotal = productosIniciales.reduce((suma, producto) => suma + producto.cantidad, 0);
  const totalInventario = vendidosTotales + stockTotal;
  const porcentajeVendido = totalInventario > 0
    ? Math.round((vendidosTotales / totalInventario) * 100)
    : 0;

  return (
    <section className="inicioVista" id="inicio">
      <header className="inicioEncabezado">
        <h2 className="inicioTitulo">Inicio</h2>
        <UsuarioMenu className="inicioUsuarioMenu" ariaLabel="Perfil del usuario" />
      </header>

      <section className="inicioPanelPrincipal" aria-label="Articulos de alta demanda">
        <h3 className="inicioSubtitulo">Articulos de alta demanda</h3>

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
              background: `conic-gradient(#7fc2f8 0 ${porcentajeVendido}%, #1b6eb1 ${porcentajeVendido}% 90%, #2d96de 90% 100%)`,
            }}
          >
            <span className="inicioPieCentro">{porcentajeVendido}%</span>
          </div>
          <div className="inicioLeyenda">
            <p>
              <span className="inicioLeyendaPunto inicioLeyendaPuntoPrimario" />
              Productos vendidos: {vendidosTotales}
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
