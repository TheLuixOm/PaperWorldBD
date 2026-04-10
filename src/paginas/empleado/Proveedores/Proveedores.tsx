import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './Proveedores.css';
import { proveedoresIniciales } from '../datosInventario';
import UsuarioMenu from '../Barras/UsuarioMenu';

function Proveedores() {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [proveedores, setProveedores] = useState(proveedoresIniciales);
  const [proveedorPendienteEliminar, setProveedorPendienteEliminar] = useState<(typeof proveedoresIniciales)[number] | null>(null);
  const [proveedorMenuAbiertoId, setProveedorMenuAbiertoId] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [proveedorExpandidoId, setProveedorExpandidoId] = useState<string | null>(null);
  const [busquedaMovilActiva, setBusquedaMovilActiva] = useState(false);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const proveedoresPorPagina = 8;

  const abrirVistaModificarProveedor = (id: string) => {
    setProveedorMenuAbiertoId(null);
    const proveedorSeleccionado = proveedores.find((proveedor) => proveedor.id === id);

    if (!proveedorSeleccionado) {
      return;
    }

    navigate('/proveedores/modificar', {
      state: { proveedor: proveedorSeleccionado },
    });
  };

  const solicitarEliminarProveedor = (proveedor: (typeof proveedoresIniciales)[number]) => {
    setProveedorMenuAbiertoId(null);
    setProveedorPendienteEliminar(proveedor);
  };

  const confirmarEliminarProveedor = () => {
    if (!proveedorPendienteEliminar) {
      return;
    }

    setProveedores((proveedoresActuales) =>
      proveedoresActuales.filter((proveedor) => proveedor.id !== proveedorPendienteEliminar.id),
    );
    setProveedorPendienteEliminar(null);
  };

  const cancelarEliminarProveedor = () => {
    setProveedorPendienteEliminar(null);
  };

  const proveedoresFiltrados = useMemo(() => {
    const textoNormalizado = textoBusqueda.trim().toLowerCase();

    if (!textoNormalizado) {
      return proveedores;
    }

    return proveedores.filter((proveedor) => {
      return (
        proveedor.nombre.toLowerCase().includes(textoNormalizado) ||
        proveedor.email.toLowerCase().includes(textoNormalizado) ||
        proveedor.contacto.toLowerCase().includes(textoNormalizado) ||
        proveedor.id.toLowerCase().includes(textoNormalizado)
      );
    });
  }, [proveedores, textoBusqueda]);

  const totalPaginas = Math.max(1, Math.ceil(proveedoresFiltrados.length / proveedoresPorPagina));

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const proveedoresVisibles = useMemo(() => {
    const indiceInicial = (paginaActual - 1) * proveedoresPorPagina;
    const indiceFinal = indiceInicial + proveedoresPorPagina;

    return proveedoresFiltrados.slice(indiceInicial, indiceFinal);
  }, [paginaActual, proveedoresFiltrados]);

  const paginas = useMemo(() => Array.from({ length: totalPaginas }, (_, indice) => indice + 1), [totalPaginas]);

  const alternarExpandido = (id: string) => {
    setProveedorExpandidoId((idActual) => (idActual === id ? null : id));
  };

  const alternarMenuMovilProveedor = (id: string) => {
    setProveedorMenuAbiertoId((idActual) => (idActual === id ? null : id));
  };

  const activarBusquedaMovil = () => {
    setBusquedaMovilActiva(true);

    requestAnimationFrame(() => {
      inputBusquedaRef.current?.focus();
    });
  };

  const cerrarBusquedaMovilSiVacia = () => {
    if (!textoBusqueda.trim()) {
      setBusquedaMovilActiva(false);
    }
  };

  return (
    <section className="inventarioVista inventarioVistaCambio" id="proveedores">
      <header className="inventarioEncabezado">
        <h2 className="inventarioTitulo">PROVEEDORES</h2>

        <label className={`inventarioBuscador ${busquedaMovilActiva ? 'inventarioBuscadorMovilActivo' : ''}`}>
          <button type="button" className="inventarioBuscadorBoton" aria-label="Abrir busqueda" onClick={activarBusquedaMovil}>
            <span className="inventarioBuscadorIcono" aria-hidden="true">
              <Search />
            </span>
          </button>
          <input
            ref={inputBusquedaRef}
            type="search"
            placeholder="Search"
            className="inventarioInput"
            aria-label="Buscar proveedor"
            value={textoBusqueda}
            onBlur={cerrarBusquedaMovilSiVacia}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                cerrarBusquedaMovilSiVacia();
              }
            }}
            onChange={(event) => {
              setTextoBusqueda(event.target.value);
              setPaginaActual(1);
            }}
          />
        </label>

        <button
          className="inventarioBotonAgregar"
          type="button"
          onClick={() => navigate('/proveedores/agregar')}
          aria-label="Añadir nuevo proveedor"
        >
          <span className="inventarioBotonIcono" aria-hidden="true">+</span>
          <span className="inventarioBotonTexto">Añadir proveedor</span>
        </button>

        <UsuarioMenu className="inventarioUsuarioMenu" ariaLabel="Perfil del usuario" />
      </header>

      <section className="inventarioPanel">
        <h3 className="inventarioSubtitulo">Lista de proveedores:</h3>

        <div className="inventarioTablaContenedor">
          <table className="inventarioTabla">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Id</th>
                <th>Email</th>
                <th>Contacto</th>
                <th>Logo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proveedoresVisibles.map((proveedor) => (
                <tr key={proveedor.id} className="inventarioFila">
                  <td>
                    <div className="inventarioCeldaNombre">
                      <button
                        className="inventarioAccion inventarioAccionEditar"
                        type="button"
                        aria-label={`Editar ${proveedor.nombre}`}
                        onClick={() => abrirVistaModificarProveedor(proveedor.id)}
                      >
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="M4 20h4l10-10-4-4L4 16z" />
                          <path d="m12.8 6.8 4 4" />
                        </svg>
                      </button>
                      <span>{proveedor.nombre}</span>
                    </div>
                  </td>
                  <td>{proveedor.id}</td>
                  <td>{proveedor.email}</td>
                  <td>{proveedor.contacto}</td>
                  <td>
                    <img className="inventarioImagen" src={proveedor.logo} alt={proveedor.nombre} />
                  </td>
                  <td>
                    <button
                      className="inventarioAccion inventarioAccionEliminar"
                      type="button"
                      aria-label={`Eliminar ${proveedor.nombre}`}
                      onClick={() => solicitarEliminarProveedor(proveedor)}
                    >
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M5 7h14" />
                        <path d="M9 7V5h6v2" />
                        <path d="M8 7v12h8V7" />
                        <path d="M10 11v5" />
                        <path d="M14 11v5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="inventarioListaMovil" aria-label="Lista de proveedores en movil">
          <div className="inventarioListaMovilEncabezado" aria-hidden="true">
            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaAccion" />
            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaNombre">nombre</span>
            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaMenu" />
          </div>

          {proveedoresVisibles.map((proveedor) => {
            const estaExpandido = proveedorExpandidoId === proveedor.id;
            const menuAbierto = proveedorMenuAbiertoId === proveedor.id;

            return (
              <article key={`movil-${proveedor.id}`} className="inventarioMovilItem">
                <div className="inventarioMovilFilaPrincipal">
                  <button
                    className="inventarioMovilAlternar"
                    type="button"
                    aria-label={`${estaExpandido ? 'Ocultar' : 'Mostrar'} detalle de ${proveedor.nombre}`}
                    aria-expanded={estaExpandido}
                    onClick={() => alternarExpandido(proveedor.id)}
                  >
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>

                  <p className="inventarioMovilNombre">{proveedor.nombre}</p>

                  <button
                    className="inventarioMovilMenu"
                    type="button"
                    aria-label={`Opciones para ${proveedor.nombre}`}
                    aria-expanded={menuAbierto}
                    onClick={() => alternarMenuMovilProveedor(proveedor.id)}
                  >
                    <span />
                    <span />
                    <span />
                  </button>

                  {menuAbierto && (
                    <div className="inventarioMovilOpciones" role="menu" aria-label={`Opciones de ${proveedor.nombre}`}>
                      <button
                        type="button"
                        className="inventarioMovilOpcionBoton"
                        role="menuitem"
                        onClick={() => abrirVistaModificarProveedor(proveedor.id)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="inventarioMovilOpcionBoton inventarioMovilOpcionBotonEliminar"
                        role="menuitem"
                        onClick={() => solicitarEliminarProveedor(proveedor)}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="inventarioMovilDetalle"
                  data-state={estaExpandido ? 'open' : 'closed'}
                  aria-hidden={!estaExpandido}
                >
                  <p>
                    <span>Codigo:</span> {proveedor.id}
                  </p>
                  <p>
                    <span>Email:</span> {proveedor.email}
                  </p>
                  <p>
                    <span>Contacto:</span> {proveedor.contacto}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="inventarioPaginacion" aria-label="Paginacion">
          <button
            type="button"
            className="inventarioPaginaBoton"
            aria-label="Pagina anterior"
            onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
            disabled={paginaActual === 1}
          >
            ‹
          </button>

          {paginas.map((pagina) => (
            <button
              key={pagina}
              type="button"
              className={`inventarioPaginaBoton ${pagina === paginaActual ? 'inventarioPaginaActiva' : ''}`}
              onClick={() => setPaginaActual(pagina)}
              aria-current={pagina === paginaActual ? 'page' : undefined}
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            className="inventarioPaginaBoton"
            aria-label="Pagina siguiente"
            onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
            disabled={paginaActual === totalPaginas}
          >
            ›
          </button>
        </div>

        {proveedorPendienteEliminar && (
          <div className="inventarioModalOverlay" role="presentation" onClick={cancelarEliminarProveedor}>
            <div
              className="inventarioModalEliminar"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmar-eliminacion-proveedor-titulo"
              aria-describedby="confirmar-eliminacion-proveedor-mensaje"
              onClick={(event) => event.stopPropagation()}
            >
              <h4 id="confirmar-eliminacion-proveedor-titulo" className="inventarioModalTitulo">
                Eliminar proveedor
              </h4>
              <p id="confirmar-eliminacion-proveedor-mensaje" className="inventarioModalMensaje">
                ¿Desea eliminar este proveedor?
              </p>

              <div className="inventarioModalAcciones">
                <button
                  type="button"
                  className="inventarioModalBoton inventarioModalBotonCancelar"
                  onClick={cancelarEliminarProveedor}
                >
                  No
                </button>
                <button
                  type="button"
                  className="inventarioModalBoton inventarioModalBotonEliminar"
                  onClick={confirmarEliminarProveedor}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default Proveedores;
