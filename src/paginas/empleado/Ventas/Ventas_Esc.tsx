import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './Ventas_Esc.css';
import UsuarioMenu from '../Barras/UsuarioMenu';
import { listarProductos, type ProductoApiItem } from '../../../api/productos';
import { procesarVenta } from '../../../api/ventas';

type ProductoVenta = {
    id: string;
    nombre: string;
    categoria: string;
    precio: number;
    cantidad: number;
    vendidos: number;
    imagen: string;
};

type ItemVenta = {
    producto: ProductoVenta;
    cantidad: number;
};

function imagenPorDefecto(idProducto: string) {
    const digits = (idProducto ?? '').replace(/[^0-9]/g, '');
    const seed = digits || 'producto';
    return `https://picsum.photos/seed/${seed}/120/80`;
}

function normalizarProductoApi(p: ProductoApiItem): ProductoVenta {
    return {
        id: p.id,
        nombre: p.nombre ?? '',
        categoria: p.categoria ?? '',
        precio: Number.isFinite(p.precio) ? p.precio : 0,
        cantidad: Number.isFinite(p.cantidad) ? p.cantidad : 0,
        vendidos: Number.isFinite(p.vendidos) ? p.vendidos : 0,
        imagen: p.imagen || imagenPorDefecto(p.id),
    };
}


function Ventas_Esc() {
    const navigate = useNavigate();
    const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoVenta | null>(null);
    const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
    const [indiceActivo, setIndiceActivo] = useState(0);
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
    const [productos, setProductos] = useState<ProductoVenta[]>([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);
    const [errorProductos, setErrorProductos] = useState<string | null>(null);
    const [procesando, setProcesando] = useState(false);
    const productosmax_visibles = 7;

    useEffect(() => {
        let cancelled = false;

        const cargar = async () => {
            try {
                setCargandoProductos(true);
                setErrorProductos(null);
                const res = await listarProductos({ limit: 500, offset: 0 });
                if (cancelled) {
                    return;
                }
                setProductos(res.items.map(normalizarProductoApi));
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setErrorProductos(err instanceof Error ? err.message : 'No se pudo cargar productos');
                setProductos([]);
            } finally {
                if (!cancelled) {
                    setCargandoProductos(false);
                }
            }
        };

        void cargar();

        return () => {
            cancelled = true;
        };
    }, []);


    const manejarCambioBusqueda = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTextoBusqueda(e.target.value);
        setIndiceActivo(0);
        setSugerenciasAbiertas(e.target.value.trim().length > 0);
        };

    const agregarProductoALista = (producto: ProductoVenta) => {
        setItemsVenta((prevItems) => {
            const existente = prevItems.find((item) => item.producto.id === producto.id);

            if (!existente) {
                return [...prevItems, { producto, cantidad: 1 }];
            }

            return prevItems.map((item) =>
                item.producto.id === producto.id
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item
            );
        });
    };

    const actualizarCantidad = (idProducto: string, cambio: number) => {
        if (!productoSeleccionado) {
            return;
        }

        setItemsVenta((prevItems) => {
            const actualizados = prevItems
                .map((item) =>
                    item.producto.id === idProducto
                        ? { ...item, cantidad: Math.max(0, item.cantidad + cambio) }
                        : item
                )
                .filter((item) => item.cantidad > 0);

            return actualizados;
        });
    };

    const seleccionarProducto = (producto: ProductoVenta) => {
        setProductoSeleccionado({ ...producto });
        setTextoBusqueda(producto.nombre);
        setIndiceActivo(0);
        setSugerenciasAbiertas(false);
        agregarProductoALista(producto);
    };

        
    const manejarTecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (vista_productos.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndiceActivo((prev) => prev >= productosmax_visibles - 1 ? productosmax_visibles - 1: prev + 1
            );
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndiceActivo((prev) =>
            prev === 0 ? 0: prev - 1
            );
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const elegido = vista_productos[indiceActivo] ?? vista_productos[0];
            if (elegido) {
            seleccionarProducto(elegido);
            }
        }

        if (e.key === 'Escape') {
            setSugerenciasAbiertas(false);
        }
        };

     const productosFiltrados = useMemo(() => {
        const textoNormalizado = textoBusqueda.trim().toLowerCase();

        if (!textoNormalizado) {
            return productos;
        }

        return productos.filter((producto) => {
            return (
                producto.nombre.toLowerCase().includes(textoNormalizado) ||
                producto.id.toLowerCase().includes(textoNormalizado)
            );
        });
    }, [productos, textoBusqueda]);

    


    const vista_productos = useMemo(() => {
        return productosFiltrados.slice(0, productosmax_visibles);
    }, [productosFiltrados]);

    const mostrarSugerencias =
        sugerenciasAbiertas && textoBusqueda.trim().length > 0 && vista_productos.length > 0;

    const formatearPrecio = (precioNumero: number) => {
        return `$ ${precioNumero.toLocaleString('es-MX')}`;
    };

    const totalVenta = itemsVenta.reduce((acumulado, item) => {
        return acumulado + (item.producto.precio * item.cantidad);
    }, 0);

    const enviarVenta = async () => {
        if (procesando || itemsVenta.length === 0) {
            return;
        }

        setProcesando(true);
        try {
            const usuarioId = localStorage.getItem('paperworldUsuario') ?? '';
            await procesarVenta({
                usuarioId,
                items: itemsVenta.map((it) => ({ id: it.producto.id, cantidad: it.cantidad })),
            });

            setItemsVenta([]);
            setProductoSeleccionado(null);
            setTextoBusqueda('');
            window.alert('Venta procesada');
            navigate('/reportes');
        } catch (err) {
            window.alert(err instanceof Error ? err.message : 'No se pudo procesar la venta');
        } finally {
            setProcesando(false);
        }
    };




        return (
                <section className="inventarioVista ventas_esc" id="ventas"> 
                    <header className='encabezado'>  
                <h2 className="VentasTitulo">Ventas</h2>
                <UsuarioMenu className="inventarioUsuarioMenu" ariaLabel="Perfil del usuario" />
               </header>
               
                    <div className="panel-detalle">
                        <div className="busqueda-wrap">
                    <input className='busqueda'
                                type="text"
                                placeholder="Buscar producto por nombre o ID..."
                                value={textoBusqueda}
                                onChange={manejarCambioBusqueda}
                                onKeyDown={manejarTecla}
                                onFocus={() => setSugerenciasAbiertas(textoBusqueda.trim().length > 0)}
                                onBlur={() => setSugerenciasAbiertas(false)}
                            />

                    {mostrarSugerencias && (
                        <ul className="lista-busqueda">
                            {vista_productos.map((p, i) => (
                                <li
                                    key={p.id}
                                    className={i === indiceActivo ? 'activo' : ''}
                                    onMouseDown={() => {
                                    setIndiceActivo(i);
                                    seleccionarProducto(p);
                                    }}
                                >
                                    {p.nombre} ({p.id})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                            {productoSeleccionado ? (          
                                <div className="detalle-producto">
                                    <p><strong>Nombre:</strong> {productoSeleccionado.nombre}</p>
                                    <p><strong>ID:</strong> {productoSeleccionado.id}</p>
                                    <p><strong>Categoria:</strong> {productoSeleccionado.categoria}</p>
                                    <p><strong>Precio:</strong> {formatearPrecio(productoSeleccionado.precio)}</p>
                                    <p><strong>Cantidad:</strong> {productoSeleccionado.cantidad}</p>
                                    <p><strong>Vendidos:</strong> {productoSeleccionado.vendidos}</p>
                                    <p><img className="inventarioImagen" src={productoSeleccionado.imagen} alt={productoSeleccionado.nombre} /></p>
                                </div>                        
                            ) : null}

                    </div>
                <h3 className='VentasSubtitulo'>Lista de productos seleccionados</h3>
                <div className="lista-venta">
                    
                    {itemsVenta.length === 0 ? (
                        null
                    ) : (
                        <>
                            <ul className="lista-venta-items">
                                {itemsVenta.map((item) => (
                                    <li key={item.producto.id} className="item-venta">
                                        <div className="item-venta-info">
                                            <strong>{item.producto.nombre}</strong>
                                            <span>{item.producto.id}</span>
                                        </div>

                                        <div className="item-venta-precios">
                                            <span>{formatearPrecio(item.producto.precio)} x {item.cantidad}</span>
                                            <strong>{formatearPrecio(item.producto.precio * item.cantidad)}</strong>
                                        </div>

                                        <div className="controles-cantidad">
                                            <button type="button" onClick={() => actualizarCantidad(item.producto.id, -1)}>-</button>
                                            <span className="cantidad-chip">{item.cantidad}</span>
                                            <button type="button" onClick={() => actualizarCantidad(item.producto.id, 1)}>+</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                <h3 className='VentasSubtitulo'>Total</h3>
                <div className="total-compra">
                    <div className="total-compra-resumen">
                        <span>Precio total</span>
                        <strong>{formatearPrecio(totalVenta)}</strong>
                    </div>
                    <button type="button" className="boton-procesar" disabled={itemsVenta.length === 0 || procesando || cargandoProductos || !!errorProductos} onClick={enviarVenta}>
                        {procesando ? 'Procesando...' : 'Procesar compra'}
                    </button>
                </div>



                
            </section>
        );


}

export default Ventas_Esc;