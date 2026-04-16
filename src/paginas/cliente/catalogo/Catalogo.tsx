import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Home, Search, ShoppingCart } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import { useCart } from '../carrito/CarritoContext';
import { listarProductos, type ProductoApiItem } from '../../../api/productos';
import ProductoExpandidoPc, { type ProductoExpandidoPcData } from '../componentes/ProductoExpandidoPc';
import FooterCliente from '../componentes/FooterCliente';
import clipAzul from '../../../images/Clip_azul.svg';
import '../inicio/InicioCliente.css';
import './CatalogoCliente.css';

type ProductoCatalogo = {
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

function normalizarProductoApi(p: ProductoApiItem): ProductoCatalogo {
  return {
    id: p.id,
    nombre: p.nombre ?? '',
    descripcion: p.descripcion ?? '',
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

function CatalogoCliente() {
  const { addItem, totalItems, totalPrice } = useCart();
  const [productoExpandido, setProductoExpandido] = useState<ProductoExpandidoPcData | null>(null);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [orden, setOrden] = useState<OrdenCatalogo>('relevancia');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<string>>(() => new Set());
  const [paginaActual, setPaginaActual] = useState(1);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const buscadorRef = useRef<HTMLElement | null>(null);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
  const productosPorPagina = 24;

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
        setProductosCatalogo(res.items.map(normalizarProductoApi));
      } catch (err) {
        if (cancelled) {
          return;
        }
        setErrorProductos(err instanceof Error ? err.message : 'No se pudo cargar el catalogo');
        setProductosCatalogo([]);
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
    const unicas = new Set(productosCatalogo.map((p) => p.categoria).filter(Boolean));
    return Array.from(unicas).sort((a, b) => a.localeCompare(b));
  }, [productosCatalogo]);

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

  const abrirProducto = (producto: ProductoCatalogo) => {
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
      ? productosCatalogo.filter((p) => categoriasSeleccionadas.has(p.categoria))
      : productosCatalogo;

    if (!consulta) {
      return filtradosPorCategoria.map((p) => ({ producto: p, score: 0 }));
    }

    return filtradosPorCategoria
      .map((producto) => ({
        producto,
        score: puntajeBusquedaAproximada(consulta, [producto.nombre, producto.categoria, producto.id]),
      }))
      .filter((item): item is { producto: ProductoCatalogo; score: number } => item.score !== null);
  }, [busquedaCatalogo, categoriasSeleccionadas, productosCatalogo]);

  const productosFiltrados = useMemo(() => {
    const consulta = busquedaCatalogo.trim();

    const base = [...productosConScore];

    if (orden === 'relevancia') {
      if (consulta) {
        base.sort((a, b) => a.score - b.score);
      }
      return base.map((x) => x.producto);
    }

    const productos = base.map((x) => x.producto);
    if (orden === 'precio_desc') {
      productos.sort((a, b) => b.precio - a.precio);
    } else if (orden === 'precio_asc') {
      productos.sort((a, b) => a.precio - b.precio);
    } else if (orden === 'nombre_asc') {
      productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'nombre_desc') {
      productos.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    return productos;
  }, [busquedaCatalogo, productosConScore, orden]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / productosPorPagina));

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaCatalogo, orden, categoriasSeleccionadas]);

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

  const paginas = useMemo(() => Array.from({ length: totalPaginas }, (_, indice) => indice + 1), [totalPaginas]);

  const sugerencias = useMemo(() => {
    const consulta = busquedaCatalogo.trim();
    if (!consulta) {
      return [] as ProductoCatalogo[];
    }

    return [...productosConScore]
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map((x) => x.producto);
  }, [busquedaCatalogo, productosConScore]);

  const mostrarSugerencias = sugerenciasAbiertas && busquedaCatalogo.trim().length > 0 && sugerencias.length > 0;

  return (
    <div className="inicioCliente catalogoCliente" id="catalogo-cliente">
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
              aria-label="Búsqueda"
              onSubmit={(event) => event.preventDefault()}
            >
              <span className="inicioClienteBuscadorIcono" aria-hidden="true">
                <Search />
              </span>
              <input
                className="inicioClienteBuscadorInput"
                type="search"
                placeholder="Buscar producto"
                aria-label="Buscar producto"
                autoComplete="off"
                value={busquedaCatalogo}
                onFocus={() => setSugerenciasAbiertas(true)}
                onChange={(event) => {
                  setBusquedaCatalogo(event.target.value);
                  setSugerenciasAbiertas(true);
                }}
              />
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
              end
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

        <section className="catalogoClienteBusqueda" aria-label="Búsqueda de catálogo" ref={buscadorRef}>
          <span className="catalogoClienteBusquedaIcono" aria-hidden="true">
            <Search />
          </span>
          <input
            className="catalogoClienteBusquedaInput"
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

          {mostrarSugerencias && (
            <div className="catalogoClienteSugerencias" role="listbox" aria-label="Sugerencias">
              {sugerencias.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  className="catalogoClienteSugerencia"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    abrirProducto(producto);
                    setSugerenciasAbiertas(false);
                    inputBusquedaRef.current?.focus();
                  }}
                >
                  <span className="catalogoClienteSugerenciaNombre">{producto.nombre}</span>
                  <span className="catalogoClienteSugerenciaPrecio">USD {producto.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="catalogoClienteCuerpo" aria-label="Catalogo">
          <aside className="catalogoClienteFiltros" aria-label="Filtros">
            <article className="catalogoClienteFiltroBloque" aria-label="Filtro categoria">
              <header className="catalogoClienteFiltroEncabezado">
                <h3 className="catalogoClienteFiltroTitulo">Categoria</h3>
                <button
                  type="button"
                  className="catalogoClienteFiltroAll"
                  onClick={() => setCategoriasSeleccionadas(new Set())}
                >
                  ALL
                </button>
              </header>

              <div className="catalogoClienteFiltroLista" role="list">
                {categorias.map((categoria, index) => (
                  <label key={`${categoria}-${index}`} className="catalogoClienteCheck" role="listitem">
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
                    <span className="catalogoClienteCheckCaja" aria-hidden="true" />
                    <span className="catalogoClienteCheckTexto">{categoria}</span>
                  </label>
                ))}
              </div>
            </article>

            <article className="catalogoClienteFiltroBloque" aria-label="Ordenar">
              <header className="catalogoClienteFiltroEncabezado">
                <h3 className="catalogoClienteFiltroTitulo">Ordenar</h3>
                <button
                  type="button"
                  className="catalogoClienteFiltroAll"
                  onClick={() => setOrden('relevancia')}
                >
                  ALL
                </button>
              </header>

              <div className="catalogoClienteFiltroLista" role="list">
                <label className="catalogoClienteCheck" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo"
                    checked={orden === 'precio_desc'}
                    onChange={() => setOrden('precio_desc')}
                  />
                  <span className="catalogoClienteCheckCaja" aria-hidden="true" />
                  <span className="catalogoClienteCheckTexto">Precio (mayor a menor)</span>
                </label>

                <label className="catalogoClienteCheck" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo"
                    checked={orden === 'precio_asc'}
                    onChange={() => setOrden('precio_asc')}
                  />
                  <span className="catalogoClienteCheckCaja" aria-hidden="true" />
                  <span className="catalogoClienteCheckTexto">Precio (menor a mayor)</span>
                </label>

                <label className="catalogoClienteCheck" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo"
                    checked={orden === 'nombre_asc'}
                    onChange={() => setOrden('nombre_asc')}
                  />
                  <span className="catalogoClienteCheckCaja" aria-hidden="true" />
                  <span className="catalogoClienteCheckTexto">Nombre (A-Z)</span>
                </label>

                <label className="catalogoClienteCheck" role="listitem">
                  <input
                    type="radio"
                    name="orden-catalogo"
                    checked={orden === 'nombre_desc'}
                    onChange={() => setOrden('nombre_desc')}
                  />
                  <span className="catalogoClienteCheckCaja" aria-hidden="true" />
                  <span className="catalogoClienteCheckTexto">Nombre (Z-A)</span>
                </label>
              </div>
            </article>
          </aside>

          <section className="catalogoClienteResultados" aria-label="Resultados">
            {cargandoProductos && <p>Cargando productos...</p>}
            {errorProductos && <p>Error al cargar productos: {errorProductos}</p>}
            {!cargandoProductos && !errorProductos && productosFiltrados.length === 0 && <p>No hay productos.</p>}
            <div className="catalogoClienteGrid" role="list">
              {productosVisibles.map((producto) => (
                <article key={producto.id} className="catalogoClienteProducto" role="listitem">
                  <div className="catalogoClienteProductoMarco" onClick={() => abrirProducto(producto)}>
                    <div className="catalogoClienteProductoImagen">
                      <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
                    </div>

                    <button
                      type="button"
                      className="catalogoClienteProductoCarrito"
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

                  <div className="catalogoClienteProductoInfo">
                    <p className="catalogoClienteProductoNombre">{producto.nombre}</p>
                    <p className="catalogoClienteProductoPrecio">
                      <span className="catalogoClienteProductoPrecioActual">USD {producto.precio.toFixed(2)}</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <nav className="catalogoClientePaginacion" aria-label="Paginacion">
              {totalPaginas > 1 && (
                <button
                  type="button"
                  className="catalogoClientePagina"
                  aria-label="Pagina anterior"
                  onClick={() => setPaginaActual((actual) => Math.max(1, actual - 1))}
                  disabled={paginaActual <= 1}
                >
                  <ChevronLeft />
                </button>
              )}

              {paginas.map((pagina) => (
                <button
                  key={pagina}
                  type="button"
                  className={`catalogoClientePagina ${pagina === paginaActual ? 'catalogoClientePaginaActiva' : ''}`}
                  aria-current={pagina === paginaActual ? 'page' : undefined}
                  onClick={() => setPaginaActual(pagina)}
                >
                  {pagina}
                </button>
              ))}

              {totalPaginas > 1 && (
                <button
                  type="button"
                  className="catalogoClientePagina"
                  aria-label="Siguiente pagina"
                  onClick={() => setPaginaActual((actual) => Math.min(totalPaginas, actual + 1))}
                  disabled={paginaActual >= totalPaginas}
                >
                  <ChevronRight />
                </button>
              )}
            </nav>
          </section>
        </section>
      </main>

      <FooterCliente className="catalogoClienteFooter" />
    </div>
  );
}

export default CatalogoCliente;
