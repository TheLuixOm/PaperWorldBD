import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import './Inventario.css';
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

type Producto = {
    id: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    precio: string;
    cantidad: number;
    vendidos: number;
    imagen: string;
};

function mapearProductoDesdeApi(it: {
    id_producto: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    precio: number;
    cantidad: number;
    imagen: string;
}) {
    return {
        id: formatProductoIdDisplay(it.id_producto),
        nombre: it.nombre,
        descripcion: it.descripcion ?? '',
        categoria: it.categoria || 'sin categoria',
        precio: formatPrecioDisplay(it.precio),
        cantidad: it.cantidad,
        vendidos: 0,
        imagen: it.imagen || `https://picsum.photos/seed/${it.id_producto}/120/80`,
    } satisfies Producto;
}

function getRolesFromStorage(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem('paperworldRoles');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function esAdmin(): boolean {
    const roles = getRolesFromStorage();
    return roles.includes('admin') || roles.includes('3') || roles.includes(3 as any);
}

function Inventario() {
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [vistaActual, setVistaActual] = useState<'lista' | 'agregar' | 'modificar'>('lista');
    const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
    const [productoPendienteEliminar, setProductoPendienteEliminar] = useState<Producto | null>(null);
    const [productoMenuAbiertoId, setProductoMenuAbiertoId] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [productoExpandidoId, setProductoExpandidoId] = useState<string | null>(null);
    const [busquedaMovilActiva, setBusquedaMovilActiva] = useState(false);
    const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
    const guardadoNuevoEnCursoRef = useRef(false);
    const productosPorPagina = 8;

    const cargarInventario = async (opciones?: { irAlFinal?: boolean }) => {
        setCargando(true);
        setErrorCarga(null);

        try {
            const resp = await listarInventario({ limit: 500, offset: 0 });

            const mapeados: Producto[] = resp.items.map(mapearProductoDesdeApi);

            setProductos(mapeados);

            if (opciones?.irAlFinal) {
                const totalPaginasCalculadas = Math.max(1, Math.ceil(mapeados.length / productosPorPagina));
                setPaginaActual(totalPaginasCalculadas);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[inventario] no se pudo cargar desde API', err);
            setProductos([]);
            setErrorCarga('No se pudo cargar el inventario desde la base de datos.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        void cargarInventario();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                await cargarInventario();
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo eliminar en API', err);

                const mensaje = err instanceof Error ? err.message : '';
                if (mensaje === 'ProductoReferenciado') {
                    setErrorCarga('No se puede eliminar: el producto está asociado a ventas/pedidos u otros registros.');
                    return;
                }

                setErrorCarga('No se pudo eliminar el producto en la base de datos.');
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

    const guardarCambiosProducto = async (datosFormulario: DatosModificarProducto) => {
        if (!productoEnEdicion) {
            return false;
        }

        try {
            const precio = parsePrecioInput(datosFormulario.precio);
            const cantidad = Number.parseInt(datosFormulario.cantidad, 10);
            const imagen = datosFormulario.imagen?.startsWith('blob:') ? '' : datosFormulario.imagen;

            await actualizarProductoInventario(productoEnEdicion.id, {
                nombre: datosFormulario.nombre.trim() || productoEnEdicion.nombre,
                referencia: datosFormulario.referencia,
                descripcion: datosFormulario.descripcion,
                categoria: datosFormulario.categoria,
                precio,
                cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
                imagen,
            });

            await cargarInventario();
            cerrarVistaFormulario();
            return true;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[inventario] no se pudo guardar cambios en API', err);
            setErrorCarga('No se pudieron guardar los cambios en la base de datos.');
            return false;
        }
    };

    const guardarNuevoProducto = async (datosFormulario: DatosAgregarProducto, mantenerAbierto: boolean) => {
        if (guardadoNuevoEnCursoRef.current) {
            return false;
        }

        guardadoNuevoEnCursoRef.current = true;
        if (!mantenerAbierto) {
            cerrarVistaFormulario();
        }

        try {
            const precio = parsePrecioInput(datosFormulario.precio);
            const cantidad = Number.parseInt(datosFormulario.cantidad, 10);
            const imagen = datosFormulario.imagen?.startsWith('blob:') ? '' : datosFormulario.imagen;

            const imagenBase64 = await new Promise<string>((resolve, reject) => {
                const archivo = datosFormulario.imagenArchivo;
                if (!archivo) {
                    resolve('');
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    const value = typeof reader.result === 'string' ? reader.result : '';
                    const commaIndex = value.indexOf(',');
                    resolve(commaIndex >= 0 ? value.slice(commaIndex + 1) : value);
                };
                reader.onerror = () => {
                    reject(new Error('No se pudo leer la imagen seleccionada'));
                };
                reader.readAsDataURL(archivo);
            });

            const productoCreado = await crearProductoInventario({
                referencia: datosFormulario.referencia,
                nombre: datosFormulario.nombre.trim() || 'Producto sin nombre',
                descripcion: datosFormulario.descripcion,
                categoria: datosFormulario.categoria,
                precio,
                cantidad: Number.isNaN(cantidad) ? 0 : cantidad,
                imagen,
                imagen_base64: imagenBase64,
                imagen_mime: datosFormulario.imagenMime,
                imagen_nombre: datosFormulario.imagenNombre,
            });

            if (productoCreado.item) {
                const productoNuevo = mapearProductoDesdeApi(productoCreado.item);

                setProductos((productosActuales) => {
                    const filtrados = productosActuales.filter((producto) => producto.id !== productoNuevo.id);
                    const siguienteLista = [...filtrados, productoNuevo];
                    const siguienteTotalPaginas = Math.max(1, Math.ceil(siguienteLista.length / productosPorPagina));
                    setPaginaActual(siguienteTotalPaginas);
                    return siguienteLista;
                });
            }

            void cargarInventario({ irAlFinal: true }).catch((err) => {
                // eslint-disable-next-line no-console
                console.error('[inventario] no se pudo refrescar despues de crear', err);
                setErrorCarga('Se guardo el producto, pero no se pudo refrescar la lista de inventario.');
            });

            if (productoCreado?.item) {
                return true;
            }

            return true;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[inventario] no se pudo crear en API', err);
            setErrorCarga('No se pudo crear el producto en la base de datos.');
            return false;
        } finally {
            guardadoNuevoEnCursoRef.current = false;
        }
    };

    const claseVista = [
        'inventarioVista',
        vistaActual !== 'lista' ? 'inventarioVistaAgregar' : '',
        vistaActual === 'modificar' ? 'inventarioVistaEditar' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const esUsuarioAdmin = esAdmin();

    return (
        <section className={claseVista} id="inventario">
            <div className="inventarioVistaCambio" key={vistaActual}>
                {vistaActual === 'agregar' && esUsuarioAdmin ? (
                    <AgregarProducto onGuardar={guardarNuevoProducto} onCancelar={cerrarVistaFormulario} />
                ) : vistaActual === 'modificar' && productoEnEdicion && esUsuarioAdmin ? (
                    <ModificarProducto
                        productoInicial={productoEnEdicion}
                        onGuardar={guardarCambiosProducto}
                        onCancelar={cerrarVistaFormulario}
                    />
                ) : vistaActual === 'agregar' || vistaActual === 'modificar' ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                        Solo administradores pueden modificar o agregar productos.
                    </div>
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
                                disabled={!esUsuarioAdmin}
                                style={!esUsuarioAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}
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

                            {cargando ? (
                                <p>Cargando inventario...</p>
                            ) : errorCarga ? (
                                <p>{errorCarga}</p>
                            ) : productos.length === 0 ? (
                                <p>No hay productos registrados.</p>
                            ) : null}

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
                                                    disabled={!esUsuarioAdmin}
                                                    style={!esUsuarioAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}
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
                                                disabled={!esUsuarioAdmin}
                                                style={!esUsuarioAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}
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
                                                    disabled={!esUsuarioAdmin}
                                                    style={!esUsuarioAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inventarioMovilOpcionBoton inventarioMovilOpcionBotonEliminar"
                                                    role="menuitem"
                                                    onClick={() => solicitarEliminarProducto(producto)}
                                                    disabled={!esUsuarioAdmin}
                                                    style={!esUsuarioAdmin ? { opacity: 0.5, pointerEvents: 'none' } : {}}
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
