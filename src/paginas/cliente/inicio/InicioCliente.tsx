import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Eye, Home, Search, ShoppingCart } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import { useCart } from '../carrito/CarritoContext';
import { listarProductos, type ProductoApiItem } from '../../../api/productos';
import ProductoExpandidoPc, { type ProductoExpandidoPcData } from '../componentes/ProductoExpandidoPc';
import FooterCliente from '../componentes/FooterCliente';
import clipAzul from '../../../images/Clip_azul.svg';
import './InicioCliente.css';

type ProductoInicio = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagen: string;
  vendidos: number;
  cantidad: number;
};

function imagenPorDefecto(idProducto: string) {
  const digits = (idProducto ?? '').replace(/[^0-9]/g, '');
  const seed = digits || 'producto';
  return `https://picsum.photos/seed/${seed}/120/80`;
}

function normalizarProductoApi(p: ProductoApiItem): ProductoInicio {
  return {
    id: p.id,
    nombre: p.nombre ?? '',
    categoria: p.categoria ?? '',
    precio: Number.isFinite(p.precio) ? p.precio : 0,
    imagen: p.imagen || imagenPorDefecto(p.id),
    vendidos: Number.isFinite(p.vendidos) ? p.vendidos : 0,
    cantidad: Number.isFinite(p.cantidad) ? p.cantidad : 0,
  };
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) {
    return 0;
  }

  const alen = a.length;
  const blen = b.length;
  if (!alen) {
    return blen;
  }
  if (!blen) {
    return alen;
  }

  const prev = new Array<number>(blen + 1);
  const cur = new Array<number>(blen + 1);

  for (let j = 0; j <= blen; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= alen; i += 1) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);

    for (let j = 1; j <= blen; j += 1) {
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }

    for (let j = 0; j <= blen; j += 1) {
      prev[j] = cur[j];
    }
  }

  return prev[blen];
}

function puntajeBusquedaAproximada(consulta: string, campos: string[]) {
  const q = normalizarTexto(consulta);
  if (!q) {
    return 0;
  }

  const textos = campos.map((c) => normalizarTexto(c)).filter(Boolean);
  if (!textos.length) {
    return null;
  }

  for (const t of textos) {
    if (t.includes(q)) {
      return 0;
    }
  }

  const palabras = textos
    .flatMap((t) => t.split(/[^\p{L}\p{N}]+/gu))
    .filter(Boolean);

  const umbral = q.length <= 4 ? 1 : q.length <= 7 ? 2 : 3;
  let mejor = Number.POSITIVE_INFINITY;
  for (const palabra of palabras) {
    mejor = Math.min(mejor, levenshtein(q, palabra));
    if (mejor === 0) {
      break;
    }
  }

  if (mejor <= umbral) {
    return 1 + mejor;
  }

  return null;
}

function InicioCliente() {
  const { addItem, totalItems, totalPrice } = useCart();
  const [productoExpandido, setProductoExpandido] = useState<ProductoExpandidoPcData | null>(null);
  const [busquedaInicio, setBusquedaInicio] = useState('');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [productosInicio, setProductosInicio] = useState<ProductoInicio[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const carruselRef = useRef<HTMLDivElement | null>(null);
  const buscadorRef = useRef<HTMLFormElement | null>(null);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
  const arrastreRef = useRef<{ activo: boolean; x: number; scrollLeft: number; movio: boolean }>(
    { activo: false, x: 0, scrollLeft: 0, movio: false },
  );
  const pointerCapturadoRef = useRef(false);

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
        setProductosInicio(res.items.map(normalizarProductoApi));
      } catch (err) {
        if (cancelled) {
          return;
        }
        setErrorProductos(err instanceof Error ? err.message : 'No se pudo cargar los productos');
        setProductosInicio([]);
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

  const productosMasVendidosBase = useMemo(() => {
    return [...productosInicio].sort((a, b) => b.vendidos - a.vendidos).slice(0, 12);
  }, [productosInicio]);

  useEffect(() => {
    const alPointerDown = (event: PointerEvent) => {
      const contenedor = buscadorRef.current;
      if (!contenedor) {
        return;
      }

      const objetivo = event.target;
      if (objetivo instanceof Node && !contenedor.contains(objetivo)) {
        setSugerenciasAbiertas(false);
      }
    };

    const alKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSugerenciasAbiertas(false);
      }
    };

    document.addEventListener('pointerdown', alPointerDown);
    document.addEventListener('keydown', alKeyDown);

    return () => {
      document.removeEventListener('pointerdown', alPointerDown);
      document.removeEventListener('keydown', alKeyDown);
    };
  }, []);

  const obtenerPasoScroll = () => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return 260;
    }

    const primerItem = contenedor.querySelector<HTMLElement>('.inicioClienteProducto');
    if (!primerItem) {
      return Math.max(220, Math.round(contenedor.clientHeight * 0.6));
    }

    const estilos = window.getComputedStyle(contenedor);
    const gap = Number.parseFloat(estilos.columnGap || estilos.gap || '0') || 0;
    const ancho = primerItem.getBoundingClientRect().width;

    return Math.max(140, Math.round(ancho + gap));
  };

  const desplazarCarrusel = (direccion: 'izquierda' | 'derecha') => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    const paso = obtenerPasoScroll();
    const left = direccion === 'izquierda' ? -paso : paso;
    contenedor.scrollBy({ left, behavior: 'smooth' });
  };

  const alIniciarArrastre = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    arrastreRef.current = { activo: true, x: event.clientX, scrollLeft: contenedor.scrollLeft, movio: false };
    pointerCapturadoRef.current = false;
  };

  const alArrastrar = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor || !arrastreRef.current.activo) {
      return;
    }

    const delta = event.clientX - arrastreRef.current.x;
    if (!arrastreRef.current.movio && Math.abs(delta) > 6) {
      arrastreRef.current.movio = true;

      setArrastrando(true);

      if (!pointerCapturadoRef.current) {
        try {
          contenedor.setPointerCapture(event.pointerId);
          pointerCapturadoRef.current = true;
        } catch {
          // noop
        }
      }
    }
    contenedor.scrollLeft = arrastreRef.current.scrollLeft - delta;
  };

  const alFinalizarArrastre = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    arrastreRef.current.activo = false;
    setArrastrando(false);

    if (pointerCapturadoRef.current) {
      try {
        contenedor.releasePointerCapture(event.pointerId);
      } catch {
        // noop
      }
      pointerCapturadoRef.current = false;
    }

    if (arrastreRef.current.movio) {
      window.setTimeout(() => {
        arrastreRef.current.movio = false;
      }, 0);
    }
  };

  const abrirProducto = (producto: ProductoInicio, opciones?: { forzar?: boolean }) => {
    if (!opciones?.forzar && arrastreRef.current.movio) {
      arrastreRef.current.movio = false;
      return;
    }

    setProductoExpandido({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      categoria: producto.categoria,
      stock: producto.cantidad,
      codigo: producto.id,
    });
  };

  const productosConScore = useMemo(() => {
    const consulta = busquedaInicio.trim();
    if (!consulta) {
      return productosInicio.map((p) => ({ producto: p, score: 0 }));
    }

    return productosInicio
      .map((producto) => ({
        producto,
        score: puntajeBusquedaAproximada(consulta, [producto.nombre, producto.categoria, producto.id]),
      }))
      .filter((item): item is { producto: ProductoInicio; score: number } => item.score !== null);
  }, [busquedaInicio, productosInicio]);

  const sugerencias = useMemo(() => {
    const consulta = busquedaInicio.trim();
    if (!consulta) {
      return [];
    }

    const ordenadas = [...productosConScore].sort((a, b) => a.score - b.score).map((x) => x.producto);
    return ordenadas.slice(0, 6);
  }, [busquedaInicio, productosConScore]);

  const mostrarSugerencias = sugerenciasAbiertas && !!busquedaInicio.trim() && sugerencias.length > 0;

  return (
    <div className="inicioCliente" id="inicio-cliente">
      <ProductoExpandidoPc
        abierto={!!productoExpandido}
        producto={productoExpandido}
        alCerrar={() => setProductoExpandido(null)}
      />
      <header className="inicioClienteEncabezado">
        <div className="inicioClienteBarraSuperior">
          <div className="inicioClienteBarraInterior">
            <div className="inicioClienteMarca" aria-label="Paper world">
              <img className="inicioClienteMarcaIcono" src={clipAzul} alt="Clip" />
              <span className="inicioClienteMarcaTexto">Paper world</span>
            </div>

            <form
              className="inicioClienteBuscador"
              role="search"
              aria-label="Busqueda"
              ref={buscadorRef}
              onSubmit={(e) => e.preventDefault()}
            >
              <span className="inicioClienteBuscadorIcono" aria-hidden="true">
                <Search />
              </span>
              <input
                className="inicioClienteBuscadorInput"
                type="search"
                placeholder="Busca por productos, categorias, etc..."
                name="q"
                autoComplete="off"
                ref={inputBusquedaRef}
                value={busquedaInicio}
                onFocus={() => setSugerenciasAbiertas(true)}
                onChange={(e) => {
                  setBusquedaInicio(e.target.value);
                  setSugerenciasAbiertas(true);
                }}
              />

              {mostrarSugerencias && (
                <div className="inicioClienteSugerencias" role="listbox" aria-label="Sugerencias">
                  {sugerencias.map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      className="inicioClienteSugerencia"
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        abrirProducto(producto, { forzar: true });
                        setSugerenciasAbiertas(false);
                        inputBusquedaRef.current?.focus();
                      }}
                    >
                      <span className="inicioClienteSugerenciaNombre">{producto.nombre}</span>
                      <span className="inicioClienteSugerenciaPrecio">USD {producto.precio.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="inicioClienteAcciones">
              <UsuarioMenu className="clienteUsuarioMenu" ariaLabel="Menu de usuario" />

              <Link to="/cliente/carrito" className="inicioClienteCarrito" aria-label="Carrito">
                <span className="inicioClienteCarritoIcono" aria-hidden="true">
                  <ShoppingCart />
                </span>
                <span className="inicioClienteCarritoContador" aria-label="Productos en carrito">
                  {totalItems}
                </span>
              </Link>

              <p className="inicioClienteTotal" aria-label="Total del carrito">
                USD {totalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          <nav className="inicioClienteBarraNav" aria-label="Navegacion principal">
            <NavLink
              to="/cliente/catalogo"
              className={({ isActive }) =>
                `inicioClienteNavItem ${isActive ? 'inicioClienteNavItemActivo' : ''}`
              }
            >
              <span className="inicioClienteNavIcono" aria-hidden="true">
                <BookOpen />
              </span>
              <span className="inicioClienteNavTexto">Catalogo</span>
            </NavLink>

            <NavLink
              to="/cliente/inicio"
              className={({ isActive }) =>
                `inicioClienteNavItem ${isActive ? 'inicioClienteNavItemActivo' : ''}`
              }
              end
            >
              <span className="inicioClienteNavIcono" aria-hidden="true">
                <Home />
              </span>
              <span className="inicioClienteNavTexto">Inicio</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="inicioClienteContenido">
        <section className="inicioClienteHero" aria-label="Banner principal">
          <div className="inicioClienteHeroMarco">
            <div className="inicioClienteHeroTexto">
              <p className="inicioClienteHeroKicker">TODO lo que necesitas</p>
              <p className="inicioClienteHeroSubkicker">— en un solo lugar —</p>
              <h2 className="inicioClienteHeroTitulo" aria-label="PaperWorld">
                Paper<span>World</span>
              </h2>
            </div>

            <div className="inicioClienteHeroCategorias" aria-label="Categorias destacadas">
              <div className="inicioClienteHeroCategoria">Utiles Escolares</div>
              <div className="inicioClienteHeroCategoria">Oficina</div>
              <div className="inicioClienteHeroCategoria">Papeleria</div>
              <div className="inicioClienteHeroCategoria">Regalos</div>
            </div>

            <p className="inicioClienteHeroPie">Variedad y calidad en todas nuestras categorias</p>
          </div>
        </section>

        <section className="inicioClienteSeccion" aria-label="Mas vendidos">
          <header className="inicioClienteSeccionEncabezado">
            <span className="inicioClienteEtiqueta">Este mes</span>
            <h3 className="inicioClienteSeccionTitulo">Mas Vendidos</h3>
          </header>

          {cargandoProductos && <p>Cargando productos...</p>}
          {errorProductos && <p>Error al cargar productos: {errorProductos}</p>}
          {!cargandoProductos && !errorProductos && productosMasVendidosBase.length === 0 && <p>No hay productos.</p>}

          <div className="inicioClienteCarruselHorizontal" aria-label="Carrusel de productos">
            <div className="inicioClienteCarruselControles" aria-label="Controles del carrusel">
              <button
                type="button"
                className="inicioClienteCarruselBoton inicioClienteCarruselBotonIzq"
                onClick={() => desplazarCarrusel('izquierda')}
                aria-label="Mover productos a la izquierda"
              >
                <ArrowLeft />
              </button>
              <button
                type="button"
                className="inicioClienteCarruselBoton inicioClienteCarruselBotonDer"
                onClick={() => desplazarCarrusel('derecha')}
                aria-label="Mover productos a la derecha"
              >
                <ArrowRight />
              </button>
            </div>

            <div
              className={`inicioClienteCarrusel ${arrastrando ? 'inicioClienteCarruselArrastrando' : ''}`}
              role="list"
              ref={carruselRef}
              onPointerDown={alIniciarArrastre}
              onPointerMove={alArrastrar}
              onPointerUp={alFinalizarArrastre}
              onPointerCancel={alFinalizarArrastre}
            >
              {productosMasVendidosBase.map((producto) => (
                <article key={producto.id} className="inicioClienteProducto" role="listitem">
                  <div className="inicioClienteProductoMarco" onClick={() => abrirProducto(producto)}>
                    <div className="inicioClienteProductoAcciones" aria-label="Acciones">
                      <button
                        type="button"
                        className="inicioClienteProductoAccion"
                        aria-label="Ver"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirProducto(producto, { forzar: true });
                        }}
                      >
                        <Eye />
                      </button>

                      <button
                        type="button"
                        className="inicioClienteProductoAccion"
                        aria-label="Agregar al carrito"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem({
                            id: producto.id,
                            nombre: producto.nombre,
                            precio: producto.precio,
                            imagen: producto.imagen,
                            categoria: producto.categoria,
                          });
                        }}
                      >
                        <ShoppingCart />
                      </button>
                    </div>

                    <div className="inicioClienteProductoImagen">
                      <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
                    </div>
                  </div>

                  <div className="inicioClienteProductoInfo">
                    <p className="inicioClienteProductoNombre">{producto.nombre}</p>
                    <p className="inicioClienteProductoPrecio">
                      <span className="inicioClienteProductoPrecioActual">USD {producto.precio.toFixed(2)}</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterCliente className="inicioClienteFooter" />
    </div>
  );
}

export default InicioCliente;
