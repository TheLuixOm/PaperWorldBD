import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import './Inventario.css';
import { productosIniciales, type Producto } from '../datosInventario';
import UsuarioMenu from '../Barras/UsuarioMenu';
import AgregarProducto, { type DatosAgregarProducto } from './AgregarProducto';
import ModificarProducto from './ModificarProducto';
import { type DatosModificarProducto } from './ModificarProducto';
import {
    actualizarProductoInventario,
    crearProductoInventario,
    eliminarProductoInventario,
    formatPrecioDisplay,
    formatProductoIdDisplay,
    listarInventario,
    parsePrecioInput,
} from '../../../api/inventario';

function Inventario() {
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [productos, setProductos] = useState(productosIniciales);
    const [vistaActual, setVistaActual] = useState<'lista' | 'agregar' | 'modificar'>('lista');
    const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
    const [productoPendienteEliminar, setProductoPendienteEliminar] = useState<Producto | null>(null);
    const [productoMenuAbiertoId, setProductoMenuAbiertoId] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [productoExpandidoId, setProductoExpandidoId] = useState<string | null>(null);
    const [busquedaMovilActiva, setBusquedaMovilActiva] = useState(false);
    const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
    const productosPorPagina = 8;

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            try {
                const resp = await listarInventario({ limit: 500, offset: 0 });
                if (cancelado) {
                    return;
                }

                const mapeados: Producto[] = resp.items.map((it) => ({
                    id: formatProductoIdDisplay(it.id_producto),
                    nombre: it.nombre,
                    categoria: it.categoria || 'sin categoria',
                    precio: formatPrecioDisplay(it.precio),
                    cantidad: it.cantidad,
                    vendidos: 0,
                    imagen: it.imagen || `https://picsum.photos/seed/${it.id_producto}/120/80`,
                }));

                setProductos(mapeados);
            } catch (err) {
                // Si falla la API, deja el inventario mock para no romper la UI.
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo cargar desde API', err);
            }
        };

        void cargar();

        return () => {
            cancelado = true;
        };
    }, []);

    const solicitarEliminarProducto = (producto: Producto) => {
        setProductoMenuAbiertoId(null);
        setProductoPendienteEliminar(producto);
    };

    const confirmarEliminarProducto = () => {
        if (!productoPendienteEliminar) {
            return;
        }

        const producto = productoPendienteEliminar;
        setProductoPendienteEliminar(null);

        void (async () => {
            try {
                await eliminarProductoInventario(producto.id);
                setProductos((productosActuales) =>
                    productosActuales.filter((p) => p.id !== producto.id)
                );
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo eliminar en API', err);
            }
        })();
    };

    const cancelarEliminarProducto = () => {
        setProductoPendienteEliminar(null);
    };

    const productosFiltrados = useMemo(() => {
        const textoNormalizado = textoBusqueda.trim().toLowerCase();

        if (!textoNormalizado) {
            return productos;
        }

        return productos.filter((producto) => {
            return (
                producto.nombre.toLowerCase().includes(textoNormalizado) ||
                producto.categoria.toLowerCase().includes(textoNormalizado) ||
                producto.id.toLowerCase().includes(textoNormalizado)
            );
        });
    }, [productos, textoBusqueda]);

    const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / productosPorPagina));

    useEffect(() => {
        if (paginaActual > totalPaginas) {
            setPaginaActual(totalPaginas);
        }
    }, [paginaActual, totalPaginas]);

    const productosVisibles = useMemo(() => {
        const indiceInicial = (paginaActual - 1) * productosPorPagina;
        const indiceFinal = indiceInicial + productosPorPagina;

        return productosFiltrados.slice(indiceInicial, indiceFinal);
    }, [paginaActual, productosFiltrados]);

    const paginas = useMemo(() => {
        return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
    }, [totalPaginas]);

    const alternarExpandido = (id: string) => {
        setProductoExpandidoId((idActual) => (idActual === id ? null : id));
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

    const abrirVistaAgregarProducto = () => {
        setProductoMenuAbiertoId(null);
        setProductoEnEdicion(null);
        setVistaActual('agregar');
    };

    const abrirVistaEditarProducto = (producto: Producto) => {
        setProductoMenuAbiertoId(null);
        setProductoEnEdicion(producto);
        setVistaActual('modificar');
    };

    const alternarMenuMovilProducto = (id: string) => {
        setProductoMenuAbiertoId((idActual) => (idActual === id ? null : id));
    };

    const cerrarVistaFormulario = () => {
        setProductoEnEdicion(null);
        setVistaActual('lista');
    };

    const generarIdProducto = (referencia: string) => {
        const referenciaLimpia = referencia.trim();

        if (referenciaLimpia) {
            return referenciaLimpia;
        }

        const mayorId = productos.reduce((maximoActual, productoActual) => {
            const numeroActual = Number(productoActual.id.replace(/[^0-9]/g, ''));

            if (Number.isNaN(numeroActual)) {
                return maximoActual;
            }

            return Math.max(maximoActual, numeroActual);
        }, 0);

        return `#${String(mayorId + 1).padStart(4, '0')}`;
    };

    const construirProductoActualizado = (
        productoBase: Producto,
        datosFormulario: DatosModificarProducto
    ): Producto => {
        const cantidad = Number.parseInt(datosFormulario.cantidad, 10);
        const precioConPrefijo = datosFormulario.precio.trim();

        return {
            id: productoBase.id,
            nombre: datosFormulario.nombre.trim() || 'Producto sin nombre',
            categoria: datosFormulario.categoria.trim() || 'sin categoria',
            precio: precioConPrefijo.startsWith('$') ? precioConPrefijo : `$ ${precioConPrefijo || '0'}`,
            cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
            vendidos: productoBase.vendidos,
            imagen:
                datosFormulario.imagen ||
                productoBase.imagen ||
                `https://picsum.photos/seed/${Date.now()}/120/80`,
        };
    };

    const guardarCambiosProducto = (datosFormulario: DatosModificarProducto) => {
        if (!productoEnEdicion) {
            return;
        }

        const productoBase = productoEnEdicion;
        const productoActualizado = construirProductoActualizado(productoBase, datosFormulario);

        // Actualiza UI optimísticamente
        setProductos((productosActuales) =>
            productosActuales.map((producto) =>
                producto.id === productoBase.id ? productoActualizado : producto
            )
        );

        cerrarVistaFormulario();

        void (async () => {
            try {
                const precio = parsePrecioInput(datosFormulario.precio);
                const cantidad = Number.parseInt(datosFormulario.cantidad, 10);
                const imagen = datosFormulario.imagen?.startsWith('blob:') ? '' : datosFormulario.imagen;

                const resp = await actualizarProductoInventario(productoBase.id, {
                    nombre: datosFormulario.nombre.trim() || productoBase.nombre,
                    referencia: datosFormulario.referencia,
                    categoria: datosFormulario.categoria,
                    precio,
                    cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
                    imagen,
                });

                const it = resp.item;
                const sincronizado: Producto = {
                    id: formatProductoIdDisplay(it.id_producto),
                    nombre: it.nombre,
                    categoria: it.categoria || 'sin categoria',
                    precio: formatPrecioDisplay(it.precio),
                    cantidad: it.cantidad,
                    vendidos: productoBase.vendidos,
                    imagen: it.imagen || productoActualizado.imagen,
                };

                setProductos((productosActuales) =>
                    productosActuales.map((p) => (p.id === productoBase.id ? sincronizado : p))
                );
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo guardar cambios en API', err);
            }
        })();
    };

    const guardarNuevoProducto = (datosFormulario: DatosAgregarProducto, mantenerAbierto: boolean) => {
        const cantidad = Number.parseInt(datosFormulario.cantidad, 10);
        const precioConPrefijo = datosFormulario.precio.trim();

        const nuevoProducto: Producto = {
            id: generarIdProducto(datosFormulario.referencia),
            nombre: datosFormulario.nombre.trim() || 'Producto sin nombre',
            categoria: datosFormulario.categoria.trim() || 'sin categoria',
            precio: precioConPrefijo.startsWith('$') ? precioConPrefijo : `$ ${precioConPrefijo || '0'}`,
            cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
            vendidos: 0,
            imagen: datosFormulario.imagen || `https://picsum.photos/seed/${Date.now()}/120/80`,
        };

        setProductos((productosActuales) => [nuevoProducto, ...productosActuales]);
        setPaginaActual(1);

        if (!mantenerAbierto) {
            cerrarVistaFormulario();
        }

        void (async () => {
            try {
                const precio = parsePrecioInput(datosFormulario.precio);
                const imagen = datosFormulario.imagen?.startsWith('blob:') ? '' : datosFormulario.imagen;
                const resp = await crearProductoInventario({
                    referencia: datosFormulario.referencia,
                    nombre: datosFormulario.nombre.trim() || 'Producto sin nombre',
                    categoria: datosFormulario.categoria,
                    precio,
                    cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
                    imagen,
                });

                const it = resp.item;
                const sincronizado: Producto = {
                    id: formatProductoIdDisplay(it.id_producto),
                    nombre: it.nombre,
                    categoria: it.categoria || 'sin categoria',
                    precio: formatPrecioDisplay(it.precio),
                    cantidad: it.cantidad,
                    vendidos: 0,
                    imagen: it.imagen || nuevoProducto.imagen,
                };

                setProductos((productosActuales) => {
                    // Reemplaza el item optimístico (por id o por nombre+imagen)
                    const sinDuplicados = productosActuales.filter((p) => p.id !== nuevoProducto.id);
                    return [sincronizado, ...sinDuplicados];
                });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo crear en API', err);
            }
        })();
    };

    const claseVista = [
        'inventarioVista',
        vistaActual !== 'lista' ? 'inventarioVistaAgregar' : '',
        vistaActual === 'modificar' ? 'inventarioVistaEditar' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section className={claseVista} id="inventario">
            <div className="inventarioVistaCambio" key={vistaActual}>
                {vistaActual === 'agregar' ? (
                    <AgregarProducto onGuardar={guardarNuevoProducto} onCancelar={cerrarVistaFormulario} />
                ) : vistaActual === 'modificar' && productoEnEdicion ? (
                    <ModificarProducto
                        productoInicial={productoEnEdicion}
                        onGuardar={guardarCambiosProducto}
                        onCancelar={cerrarVistaFormulario}
                    />
                ) : (
                    <>
                        <header className="inventarioEncabezado">
                            <h2 className="inventarioTitulo">INVENTARIO</h2>

                            <label
                                className={`inventarioBuscador ${busquedaMovilActiva ? 'inventarioBuscadorMovilActivo' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="inventarioBuscadorBoton"
                                    aria-label="Abrir busqueda"
                                    onClick={activarBusquedaMovil}
                                >
                                    <span className="inventarioBuscadorIcono" aria-hidden="true">
                                        <Search />
                                    </span>
                                </button>
                                <input
                                    ref={inputBusquedaRef}
                                    type="search"
                                    placeholder="Search"
                                    className="inventarioInput"
                                    aria-label="Buscar producto"
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
                                onClick={abrirVistaAgregarProducto}
                                aria-label="Añadir nuevo producto"
                            >
                                <span className="inventarioBotonIcono" aria-hidden="true">
                                    +
                                </span>
                                <span className="inventarioBotonTexto">Añadir producto</span>
                            </button>

                            <UsuarioMenu className="inventarioUsuarioMenu" ariaLabel="Perfil del usuario" />
                        </header>

                        <section className="inventarioPanel">
                            <h3 className="inventarioSubtitulo">Lista de productos:</h3>

                    <div className="inventarioTablaContenedor">
                        <table className="inventarioTabla">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Id</th>
                                    <th>Categoria</th>
                                    <th>Precio</th>
                                    <th>Cantidad</th>
                                    <th>Imagen</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosVisibles.map((producto) => (
                                    <tr key={producto.id} className="inventarioFila">
                                        <td>
                                            <div className="inventarioCeldaNombre">
                                                <button
                                                    className="inventarioAccion inventarioAccionEditar"
                                                    type="button"
                                                    aria-label={`Editar ${producto.nombre}`}
                                                    onClick={() => abrirVistaEditarProducto(producto)}
                                                >
                                                    <svg viewBox="0 0 24 24" focusable="false">
                                                        <path d="M4 20h4l10-10-4-4L4 16z" />
                                                        <path d="m12.8 6.8 4 4" />
                                                    </svg>
                                                </button>
                                                <span>{producto.nombre}</span>
                                            </div>
                                        </td>
                                        <td>{producto.id}</td>
                                        <td>{producto.categoria}</td>
                                        <td>{producto.precio}</td>
                                        <td>{producto.cantidad}</td>
                                        <td>
                                            <img className="inventarioImagen" src={producto.imagen} alt={producto.nombre} />
                                        </td>
                                        <td>
                                            <button
                                                className="inventarioAccion inventarioAccionEliminar"
                                                type="button"
                                                aria-label={`Eliminar ${producto.nombre}`}
                                                    onClick={() => solicitarEliminarProducto(producto)}
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

                    <div className="inventarioListaMovil" aria-label="Lista de productos en movil">
                        <div className="inventarioListaMovilEncabezado" aria-hidden="true">
                            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaAccion" />
                            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaNombre">nombre</span>
                            <span className="inventarioListaMovilCelda inventarioListaMovilCeldaMenu" />
                        </div>

                        {productosVisibles.map((producto) => {
                            const estaExpandido = productoExpandidoId === producto.id;
                            const menuAbierto = productoMenuAbiertoId === producto.id;

                            return (
                                <article key={`movil-${producto.id}`} className="inventarioMovilItem">
                                    <div className="inventarioMovilFilaPrincipal">
                                        <button
                                            className="inventarioMovilAlternar"
                                            type="button"
                                            aria-label={`${estaExpandido ? 'Ocultar' : 'Mostrar'} detalle de ${producto.nombre}`}
                                            aria-expanded={estaExpandido}
                                            onClick={() => alternarExpandido(producto.id)}
                                        >
                                            <svg viewBox="0 0 24 24" focusable="false">
                                                <path d="m9 6 6 6-6 6" />
                                            </svg>
                                        </button>

                                        <p className="inventarioMovilNombre">{producto.nombre}</p>

                                        <button
                                            className="inventarioMovilMenu"
                                            type="button"
                                            aria-label={`Opciones para ${producto.nombre}`}
                                            aria-expanded={menuAbierto}
                                            onClick={() => alternarMenuMovilProducto(producto.id)}
                                        >
                                            <span />
                                            <span />
                                            <span />
                                        </button>

                                        {menuAbierto && (
                                            <div className="inventarioMovilOpciones" role="menu" aria-label={`Opciones de ${producto.nombre}`}>
                                                <button
                                                    type="button"
                                                    className="inventarioMovilOpcionBoton"
                                                    role="menuitem"
                                                    onClick={() => abrirVistaEditarProducto(producto)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inventarioMovilOpcionBoton inventarioMovilOpcionBotonEliminar"
                                                    role="menuitem"
                                                    onClick={() => solicitarEliminarProducto(producto)}
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
                                            <span>Codigo:</span> {producto.id}
                                        </p>
                                        <p>
                                            <span>categoria</span> {producto.categoria}
                                        </p>
                                        <p>
                                            <span>Precio</span> {producto.precio}
                                        </p>
                                        <p>
                                            <span>cantidad</span> {producto.cantidad}
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

                    {productoPendienteEliminar && (
                        <div className="inventarioModalOverlay" role="presentation" onClick={cancelarEliminarProducto}>
                            <div
                                className="inventarioModalEliminar"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="confirmar-eliminacion-titulo"
                                aria-describedby="confirmar-eliminacion-mensaje"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <h4 id="confirmar-eliminacion-titulo" className="inventarioModalTitulo">
                                    Eliminar producto
                                </h4>
                                <p id="confirmar-eliminacion-mensaje" className="inventarioModalMensaje">
                                    ¿Desea eliminar este producto?
                                </p>

                                <div className="inventarioModalAcciones">
                                    <button type="button" className="inventarioModalBoton inventarioModalBotonCancelar" onClick={cancelarEliminarProducto}>
                                        No
                                    </button>
                                    <button type="button" className="inventarioModalBoton inventarioModalBotonEliminar" onClick={confirmarEliminarProducto}>
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                        </section>
                    </>
                )}
            </div>
        </section>
    );
}

export default Inventario;
