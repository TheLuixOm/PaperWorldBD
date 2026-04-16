import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpDown, BookOpen, Filter, Heart, Home, Menu, Search, ShoppingCart } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import { useCart } from '../carrito/CarritoContext';
import { listarProductos, type ProductoApiItem } from '../../../api/productos';
import MenuLateralMovil from '../componentes/MenuLateralMovil';
import ProductoExpandidoMov, { type ProductoExpandidoMovData } from '../componentes/ProductoExpandidoMov';
import FooterCliente from '../componentes/FooterCliente';
import clipAzul from '../../../images/Clip_azul.svg';
import '../inicio/InicioClienteMov.css';
import './CatalogoMov.css';

type ProductoMovil = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagen: string;
  cantidad: number;
};

type OrdenCatalogo = 'relevancia' | 'precio_desc' | 'precio_asc' | 'nombre_asc' | 'nombre_desc';

function imagenPorDefecto(idProducto: string) {
  const digits = (idProducto ?? '').replace(/[^0-9]/g, '');
  const seed = digits || 'producto';
  return `https://picsum.photos/seed/${seed}/120/80`;
}

function normalizarProductoApi(p: ProductoApiItem): ProductoMovil {
  return {
    id: p.id,
    nombre: p.nombre ?? '',
    descripcion: p.descripcionpcion ?? '',
    categoria: p.categoria ?? '',
    precio: Number.isFinite(p.precio) ? p.precio : 0,
    imagen: p.imagen || imagenPorDefecto(p.id),
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

function CatalogoMov() {
  const { addItem, totalItems, totalPrice } = useCart();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [favoritos, setFavoritos] = useState<Record<string, boolean>>({});
  const [productoExpandido, setProductoExpandido] = useState<ProductoExpandidoMovData | null>(null);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState<'filtros' | 'orden' | null>(null);
  const [orden, setOrden] = useState<OrdenCatalogo>('relevancia');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<string>>(() => new Set());
  const [productos, setProductos] = useState<ProductoMovil[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const buscadorRef = useRef<HTMLDivElement | null>(null);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
  const controlesRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [offsetFab, setOffsetFab] = useState(16);

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
        setErrorProductos(err instanceof Error ? err.message : 'No se pudo cargar el catalogo');
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

  const categorias = useMemo(() => {
    const unicas = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return Array.from(unicas).sort((a, b) => a.localeCompare(b));
  }, [productos]);

  useEffect(() => {
    let frame = 0;

    const actualizar = () => {
      frame = 0;
      const footer = footerRef.current;
      if (!footer) {
        setOffsetFab(16);
        return;
      }

      const rect = footer.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      const base = 16;
      const invade = Math.max(0, viewportH - rect.top);
      setOffsetFab(Math.round(base + invade));
    };

    const alScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(actualizar);
    };

    actualizar();
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alScroll);

    return () => {
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

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

      const controles = controlesRef.current;
      if (controles && objetivo instanceof Node && !controles.contains(objetivo)) {
        setPanelAbierto(null);
      }
    };

    const alKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSugerenciasAbiertas(false);
        setPanelAbierto(null);
      }
    };

    document.addEventListener('pointerdown', alPointerDown);
    document.addEventListener('keydown', alKeyDown);

    return () => {
      document.removeEventListener('pointerdown', alPointerDown);
      document.removeEventListener('keydown', alKeyDown);
    };
  }, []);

  const abrirProducto = (producto: ProductoMovil) => {
    setProductoExpandido({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      imagen: producto.imagen,
      categoria: producto.categoria,
      stock: producto.cantidad,
      codigo: producto.id,
    });
  };

  const productosConScore = useMemo(() => {
    const consulta = busquedaCatalogo.trim();
    const filtradosPorCategoria = categoriasSeleccionadas.size
      ? productos.filter((p) => categoriasSeleccionadas.has(p.categoria))
      : productos;

    if (!consulta) {
      return filtradosPorCategoria.map((p) => ({ producto: p, score: 0 }));
    }

    return filtradosPorCategoria
      .map((producto) => ({
        producto,
        score: puntajeBusquedaAproximada(consulta, [producto.descripcion, producto.nombre, producto.categoria, producto.id]),
      }))
      .filter((item): item is { producto: ProductoMovil; score: number } => item.score !== null);
  }, [busquedaCatalogo, productos, categoriasSeleccionadas]);

  const productosFiltrados = useMemo(() => {
    const consulta = busquedaCatalogo.trim();
    const base = [...productosConScore];

    if (orden === 'relevancia') {
      if (consulta) {
        base.sort((a, b) => a.score - b.score);
      }
      return base.map((x) => x.producto);
    }

    const lista = base.map((x) => x.producto);
    if (orden === 'precio_desc') {
      lista.sort((a, b) => b.precio - a.precio);
    } else if (orden === 'precio_asc') {
      lista.sort((a, b) => a.precio - b.precio);
    } else if (orden === 'nombre_asc') {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'nombre_desc') {
      lista.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    return lista;
  }, [busquedaCatalogo, productosConScore, orden]);

  const sugerencias = useMemo(() => {
    const consulta = busquedaCatalogo.trim();
    if (!consulta) {
      return [] as ProductoMovil[];
    }

    return [...productosConScore]
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map((x) => x.producto);
  }, [busquedaCatalogo, productosConScore]);

  const mostrarSugerencias = sugerenciasAbiertas && busquedaCatalogo.trim().length > 0 && sugerencias.length > 0;

  return (
    <div className="inicioClienteMov catalogoMov" id="catalogo-cliente-mov">
      <ProductoExpandidoMov
        abierto={!!productoExpandido}
        producto={productoExpandido}
        alCerrar={() => setProductoExpandido(null)}
      />
      <MenuLateralMovil abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} />

      <header className="inicioClienteMovHeader">
        <div className="inicioClienteMovTop">
          <button
            type="button"
            className="inicioClienteMovHamb"
            aria-label="Abrir menu"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto(true)}
          >
            <Menu />
          </button>

          <div className="inicioClienteMovMarca" aria-label="Paper world">
            <img className="inicioClienteMovMarcaIcono" src={clipAzul} alt="Clip" />
            <span className="inicioClienteMovMarcaTexto">Paper world</span>
          </div>

          <div className="inicioClienteMovAcciones">
            <UsuarioMenu className="clienteUsuarioMenuMov" ariaLabel="Menu de usuario" />

            <Link to="/cliente/carrito" className="inicioClienteMovCarrito" aria-label="Carrito">
              <ShoppingCart />
              <span className="inicioClienteMovCarritoBadge" aria-label="Productos en carrito">
                {totalItems}
              </span>
            </Link>

            <p className="inicioClienteMovTotal" aria-label="Total del carrito">
              USD {totalPrice.toFixed(2)}
            </p>
          </div>
        </div>

        <nav className="inicioClienteMovNav" aria-label="Navegacion">
          <NavLink
            to="/cliente/catalogo"
            end
            className={({ isActive }) =>
              `inicioClienteMovNavItem ${isActive ? 'inicioClienteMovNavItemActivo' : ''}`
            }
          >
            <span className="inicioClienteMovNavIcon" aria-hidden="true">
              <BookOpen />
            </span>
            <span className="inicioClienteMovNavText">Catalogo</span>
          </NavLink>

          <NavLink
            to="/cliente/inicio"
            className={({ isActive }) =>
              `inicioClienteMovNavItem ${isActive ? 'inicioClienteMovNavItemActivo' : ''}`
            }
          >
            <span className="inicioClienteMovNavIcon" aria-hidden="true">
              <Home />
            </span>
            <span className="inicioClienteMovNavText">Inicio</span>
          </NavLink>
        </nav>
      </header>

      <main className="inicioClienteMovMain">
        <section className="inicioClienteMovHero" aria-label="Presentacion">
          <div className="inicioClienteMovHeroMarco">
            <p className="inicioClienteMovHeroKicker">TODO lo que necesitas</p>
            <p className="inicioClienteMovHeroSubkicker">— en un solo lugar —</p>
            <h2 className="inicioClienteMovHeroTitulo" aria-label="PaperWorld">
              Paper<span>World</span>
            </h2>

            <div className="inicioClienteMovHeroCategorias" aria-label="Categorias">
              <div className="inicioClienteMovHeroCategoria">Utiles Escolares</div>
              <div className="inicioClienteMovHeroCategoria">Oficina</div>
              <div className="inicioClienteMovHeroCategoria">Papeleria</div>
              <div className="inicioClienteMovHeroCategoria">Regalos</div>
            </div>

            <p className="inicioClienteMovHeroPie">Variedad y calidad en todas nuestras categorias</p>
          </div>
        </section>

        <div className="catalogoMovBusquedaWrap" ref={buscadorRef}>
          <section className="inicioClienteMovBusqueda" aria-label="Búsqueda">
            <span className="inicioClienteMovBusquedaIcono" aria-hidden="true">
              <Search />
            </span>
            <input
              className="inicioClienteMovBusquedaInput"
              type="search"
              placeholder="Buscar producto"
              aria-label="Buscar producto"
              ref={inputBusquedaRef}
              value={busquedaCatalogo}
              onFocus={() => setSugerenciasAbiertas(true)}
              onChange={(e) => {
                setBusquedaCatalogo(e.target.value);
                setSugerenciasAbiertas(true);
              }}
            />
          </section>

          {mostrarSugerencias && (
            <div className="catalogoMovSugerencias" role="listbox" aria-label="Sugerencias">
              {sugerencias.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  className="catalogoMovSugerencia"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    abrirProducto(producto);
                    setSugerenciasAbiertas(false);
                    inputBusquedaRef.current?.focus();
                  }}
                >
                  <span className="catalogoMovSugerenciaNombre">{producto.descripcion || producto.nombre}</span>
                  <span className="catalogoMovSugerenciaPrecio">USD {producto.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="catalogoMovControlesWrap" ref={controlesRef}>
          <section className="catalogoMovControles" aria-label="Controles">
            <button
              type="button"
              className={`catalogoMovControl ${panelAbierto === 'filtros' ? 'catalogoMovControlActivo' : ''}`}
              aria-expanded={panelAbierto === 'filtros'}
              aria-controls="catalogo-mov-filtros"
              onClick={() => {
                setPanelAbierto((prev) => (prev === 'filtros' ? null : 'filtros'));
                setSugerenciasAbiertas(false);
              }}
            >
              <span className="catalogoMovControlIcono" aria-hidden="true">
                <Filter />
              </span>
              <span>Filtrar</span>
            </button>
            <button
              type="button"
              className={`catalogoMovControl ${panelAbierto === 'orden' ? 'catalogoMovControlActivo' : ''}`}
              aria-expanded={panelAbierto === 'orden'}
              aria-controls="catalogo-mov-orden"
              onClick={() => {
                setPanelAbierto((prev) => (prev === 'orden' ? null : 'orden'));
                setSugerenciasAbiertas(false);
              }}
            >
              <span className="catalogoMovControlIcono" aria-hidden="true">
                <ArrowUpDown />
              </span>
              <span>Ordenar</span>
            </button>
          </section>

          {panelAbierto === 'filtros' && (
            <section className="catalogoMovPanel" id="catalogo-mov-filtros" aria-label="Filtros">
              <header className="catalogoMovPanelHeader">
                <h3 className="catalogoMovPanelTitle">Categoria</h3>
                <button
                  type="button"
                  className="catalogoMovPanelAll"
                  onClick={() => setCategoriasSeleccionadas(new Set())}
                >
                  ALL
                </button>
              </header>

              <div className="catalogoMovPanelLista" role="list">
                {categorias.map((categoria) => (
                  <label key={categoria} className="catalogoMovOpcion" role="listitem">
                    <input
                      type="checkbox"
                      checked={categoriasSeleccionadas.has(categoria)}
                      onChange={(e) => {
                        setCategoriasSeleccionadas((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(categoria);
                          } else {
                            next.delete(categoria);
                          }
                          return next;
                        });
                      }}
                    />
                    <span className="catalogoMovOpcionCaja" aria-hidden="true" />
                    <span className="catalogoMovOpcionTexto">{categoria}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {panelAbierto === 'orden' && (
            <section className="catalogoMovPanel" id="catalogo-mov-orden" aria-label="Ordenar">
              <header className="catalogoMovPanelHeader">
                <h3 className="catalogoMovPanelTitle">Ordenar</h3>
                <button
                  type="button"
                  className="catalogoMovPanelAll"
                  onClick={() => {
                    setOrden('relevancia');
                    setPanelAbierto(null);
                  }}
                >
                  ALL
                </button>
              </header>

              <div className="catalogoMovPanelLista" role="list">
                <label className="catalogoMovOpcion" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo-mov"
                    checked={orden === 'precio_desc'}
                    onChange={() => {
                      setOrden('precio_desc');
                      setPanelAbierto(null);
                    }}
                  />
                  <span className="catalogoMovOpcionCaja" aria-hidden="true" />
                  <span className="catalogoMovOpcionTexto">Precio (mayor a menor)</span>
                </label>

                <label className="catalogoMovOpcion" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo-mov"
                    checked={orden === 'precio_asc'}
                    onChange={() => {
                      setOrden('precio_asc');
                      setPanelAbierto(null);
                    }}
                  />
                  <span className="catalogoMovOpcionCaja" aria-hidden="true" />
                  <span className="catalogoMovOpcionTexto">Precio (menor a mayor)</span>
                </label>

                <label className="catalogoMovOpcion" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo-mov"
                    checked={orden === 'nombre_asc'}
                    onChange={() => {
                      setOrden('nombre_asc');
                      setPanelAbierto(null);
                    }}
                  />
                  <span className="catalogoMovOpcionCaja" aria-hidden="true" />
                  <span className="catalogoMovOpcionTexto">Nombre (A-Z)</span>
                </label>

                <label className="catalogoMovOpcion" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo-mov"
                    checked={orden === 'nombre_desc'}
                    onChange={() => {
                      setOrden('nombre_desc');
                      setPanelAbierto(null);
                    }}
                  />
                  <span className="catalogoMovOpcionCaja" aria-hidden="true" />
                  <span className="catalogoMovOpcionTexto">Nombre (Z-A)</span>
                </label>
              </div>
            </section>
          )}
        </div>

        {cargandoProductos && <p>Cargando productos...</p>}
        {errorProductos && <p>Error al cargar productos: {errorProductos}</p>}
        {!cargandoProductos && !errorProductos && productosFiltrados.length === 0 && <p>No hay productos.</p>}

        <section className="catalogoMovGrid" aria-label="Productos" role="list">
          {productosFiltrados.map((producto) => (
            <article
              key={producto.id}
              className="catalogoMovCard"
              role="listitem"
              onClick={() => abrirProducto(producto)}
            >
              <div className="catalogoMovCardMarco">
                <button
                  type="button"
                  className={`catalogoMovFav ${favoritos[producto.id] ? 'catalogoMovFavActiva' : ''}`}
                  aria-label="Favorito"
                  aria-pressed={!!favoritos[producto.id]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFavoritos((prev) => ({ ...prev, [producto.id]: !prev[producto.id] }));
                  }}
                >
                  <Heart />
                </button>

                <div className="catalogoMovImagen">
                  <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
                </div>

                <button
                  type="button"
                  className="catalogoMovMiniCarrito"
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

              <div className="catalogoMovInfo">
                <p className="catalogoMovNombre">{producto.descripcion}</p>
                <p className="catalogoMovPrecio">
                  <span className="catalogoMovPrecioActual">USD {producto.precio.toFixed(2)}</span>
                </p>
              </div>
            </article>
          ))}
        </section>

        <FooterCliente ref={footerRef} className="inicioClienteMovFooter" />
      </main>

      <Link
        to="/cliente/carrito"
        className="catalogoMovFab"
        style={{ bottom: `${offsetFab}px` }}
        aria-label="Abrir carrito"
      >
        <span className="catalogoMovFabIcono" aria-hidden="true">
          <ShoppingCart />
        </span>
        <span className="catalogoMovFabPlus" aria-hidden="true">
          +
        </span>
      </Link>
    </div>
  );
}

export default CatalogoMov;
