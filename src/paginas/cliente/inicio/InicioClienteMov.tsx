import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BookOpen, Eye, Home, Menu, Search, ShoppingCart } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import { productosIniciales } from '../../empleado/datosInventario';
import { useCart } from '../carrito/CarritoContext';
import MenuLateralMovil from '../componentes/MenuLateralMovil';
import ProductoExpandidoMov, { type ProductoExpandidoMovData } from '../componentes/ProductoExpandidoMov';
import FooterCliente from '../componentes/FooterCliente';
import clipAzul from '../../../images/Clip_azul.svg';
import './InicioClienteMov.css';

type ProductoInicio = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagen: string;
  vendidos: number;
  cantidad: number;
};

function parsearPrecio(precio: string) {
  const limpio = precio.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
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

function InicioClienteMov() {
  const { addItem, totalItems, totalPrice } = useCart();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [productoExpandido, setProductoExpandido] = useState<ProductoExpandidoMovData | null>(null);
  const [busquedaInicio, setBusquedaInicio] = useState('');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const [offsetFab, setOffsetFab] = useState(16);

  const buscadorRef = useRef<HTMLDivElement | null>(null);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);

  const productosInicio = useMemo<ProductoInicio[]>(() => {
    return productosIniciales.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: parsearPrecio(p.precio),
      imagen: p.imagen,
      vendidos: p.vendidos,
      cantidad: p.cantidad,
    }));
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

      // Si el footer entra en el viewport, empuja el FAB hacia arriba.
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

  const carruselRef = useRef<HTMLDivElement | null>(null);
  const arrastreRef = useRef<{ activo: boolean; x: number; scrollLeft: number; movio: boolean }>(
    { activo: false, x: 0, scrollLeft: 0, movio: false },
  );

  const alIniciarArrastre = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    arrastreRef.current = { activo: true, x: event.clientX, scrollLeft: contenedor.scrollLeft, movio: false };
    contenedor.setPointerCapture(event.pointerId);
  };

  const alArrastrar = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor || !arrastreRef.current.activo) {
      return;
    }

    const delta = event.clientX - arrastreRef.current.x;
    if (Math.abs(delta) > 6) {
      arrastreRef.current.movio = true;
    }
    contenedor.scrollLeft = arrastreRef.current.scrollLeft - delta;
  };

  const alFinalizarArrastre = (event: ReactPointerEvent<HTMLDivElement>) => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    arrastreRef.current.activo = false;
    try {
      contenedor.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }
  };

  const abrirProducto = (producto: ProductoInicio) => {
    if (arrastreRef.current.movio) {
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

  const desplazarCarrusel = (direccion: 'izquierda' | 'derecha') => {
    const contenedor = carruselRef.current;
    if (!contenedor) {
      return;
    }

    const paso = 210;
    const left = direccion === 'izquierda' ? -paso : paso;
    contenedor.scrollBy({ left, behavior: 'smooth' });
  };

  return (
    <div className="inicioClienteMov" id="inicio-cliente-mov">
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
            end
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

        <section className="inicioClienteMovBusquedaWrap" aria-label="Buscar" ref={buscadorRef}>
          <div className="inicioClienteMovBusqueda">
            <span className="inicioClienteMovBusquedaIcono" aria-hidden="true">
              <Search />
            </span>
            <input
              className="inicioClienteMovBusquedaInput"
              type="search"
              placeholder="Buscar producto"
              aria-label="Buscar producto"
              autoComplete="off"
              ref={inputBusquedaRef}
              value={busquedaInicio}
              onFocus={() => setSugerenciasAbiertas(true)}
              onChange={(e) => {
                setBusquedaInicio(e.target.value);
                setSugerenciasAbiertas(true);
              }}
            />
          </div>

          {mostrarSugerencias && (
            <div className="inicioClienteMovSugerencias" role="listbox" aria-label="Sugerencias">
              {sugerencias.map((producto) => (
                <button
                  key={producto.id}
                  type="button"
                  className="inicioClienteMovSugerencia"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    abrirProducto(producto);
                    setSugerenciasAbiertas(false);
                    inputBusquedaRef.current?.focus();
                  }}
                >
                  <span className="inicioClienteMovSugerenciaNombre">{producto.nombre}</span>
                  <span className="inicioClienteMovSugerenciaPrecio">USD {producto.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="inicioClienteMovSeccion" aria-label="Mas vendidos">
          <header className="inicioClienteMovSeccionEnc">
            <span className="inicioClienteMovEtiqueta">Este mes</span>
            <h3 className="inicioClienteMovTitulo">Mas Vendidos</h3>
          </header>

          <div className="inicioClienteMovCarrusel" aria-label="Carrusel">
            <div className="inicioClienteMovCarruselControles" aria-label="Controles">
              <button
                type="button"
                className="inicioClienteMovFlecha inicioClienteMovFlechaIzq"
                onClick={() => desplazarCarrusel('izquierda')}
                aria-label="Mover a la izquierda"
              >
                ‹
              </button>
              <button
                type="button"
                className="inicioClienteMovFlecha inicioClienteMovFlechaDer"
                onClick={() => desplazarCarrusel('derecha')}
                aria-label="Mover a la derecha"
              >
                ›
              </button>
            </div>

            <div
              className="inicioClienteMovCarruselLista"
              role="list"
              ref={carruselRef}
              onPointerDown={alIniciarArrastre}
              onPointerMove={alArrastrar}
              onPointerUp={alFinalizarArrastre}
              onPointerCancel={alFinalizarArrastre}
            >
              {productosMasVendidosBase.map((producto) => (
                <article
                  key={producto.id}
                  className="inicioClienteMovProducto"
                  role="listitem"
                  onClick={() => abrirProducto(producto)}
                >
                  <div
                    className="inicioClienteMovProductoMarco"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        abrirProducto(producto);
                      }
                    }}
                  >
                    <div className="inicioClienteMovProductoAcciones" aria-label="Acciones">
                      <button
                        type="button"
                        className="inicioClienteMovAccion"
                        aria-label="Ver"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirProducto(producto);
                        }}
                      >
                        <Eye />
                      </button>

                      <button
                        type="button"
                        className="inicioClienteMovAccion"
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

                    <div className="inicioClienteMovProductoImagen">
                      <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
                    </div>
                  </div>

                  <div className="inicioClienteMovProductoInfo">
                    <p className="inicioClienteMovProductoNombre">{producto.nombre}</p>
                    <p className="inicioClienteMovProductoPrecio">
                      <span className="inicioClienteMovProductoPrecioActual">USD {producto.precio.toFixed(2)}</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FooterCliente ref={footerRef} className="inicioClienteMovFooter" />
      </main>

      <Link
        to="/cliente/carrito"
        className="inicioClienteMovFab"
        style={{ bottom: `${offsetFab}px` }}
        aria-label="Abrir carrito"
      >
        <ShoppingCart />
      </Link>
    </div>
  );
}

export default InicioClienteMov;
