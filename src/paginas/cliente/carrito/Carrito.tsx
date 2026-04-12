import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Home, Search, ShoppingCart } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import clipAzul from '../../../images/Clip_azul.svg';
import { useCart } from './CarritoContext';
import { procesarPedido } from '../../../api/pedidos';
import FooterCliente from '../componentes/FooterCliente';
import '../inicio/InicioCliente.css';
import './CarritoCliente.css';

function Carrito() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, removeItem, setQuantity, clear } = useCart();
  const [procesando, setProcesando] = useState(false);

  const actualizarCantidad = (id: string, delta: number) => {
    const actual = items.find((x) => x.id === id);
    if (!actual) {
      return;
    }
    setQuantity(id, actual.cantidad + delta);
  };

  const total = useMemo(() => totalPrice, [totalPrice]);

  const comprar = async () => {
    if (procesando || items.length === 0) {
      return;
    }

    setProcesando(true);
    try {
      const usuarioId = localStorage.getItem('paperworldUsuario') ?? '';
      await procesarPedido({
        usuarioId,
        items: items.map((it) => ({ id: it.id, cantidad: it.cantidad })),
      });

      clear();
      window.alert('Pedido enviado');
      navigate('/cliente/inicio', { replace: true });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo procesar el pedido');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="inicioCliente carritoCliente" id="carrito-cliente">
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
                USD {total.toFixed(2)}
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

      <main className="carritoClienteContenido">
        <div className="carritoClienteTitulo" aria-label="Carrito">
          <h1>Carrito</h1>
          <span className="carritoClienteTituloIcono" aria-hidden="true">
            <ShoppingCart />
            <span className="carritoClienteTituloBadge">{totalItems}</span>
          </span>
        </div>

        <div className="carritoClienteSeparador" aria-hidden="true" />

        <section className="carritoClienteLista" aria-label="Lista de items" role="list">
          {items.map((item) => (
            <article key={item.id} className="carritoClienteFila" role="listitem">
              <div className="carritoClienteImg">
                <img src={item.imagen} alt={item.nombre} loading="lazy" />
              </div>

              <div className="carritoClienteInfo">
                <p className="carritoClienteNombre">{item.nombre}</p>
                <div className="carritoClienteMeta">
                  <p>
                    <strong>ID:</strong> {item.id}
                  </p>
                  {item.categoria && (
                    <p>
                      <strong>Categoria:</strong> {item.categoria}
                    </p>
                  )}
                </div>
              </div>

              <div className="carritoClienteQty" aria-label="Cantidad">
                <button
                  type="button"
                  className="carritoClienteQtyBtn"
                  aria-label="Disminuir"
                  onClick={() => actualizarCantidad(item.id, -1)}
                >
                  −
                </button>
                <span className="carritoClienteQtyValor" aria-label="Cantidad">
                  {item.cantidad}
                </span>
                <button
                  type="button"
                  className="carritoClienteQtyBtn"
                  aria-label="Aumentar"
                  onClick={() => actualizarCantidad(item.id, 1)}
                >
                  +
                </button>
              </div>

              <div className="carritoClienteAcciones" aria-label="Acciones">
                <p className="carritoClientePrecio">USD {item.precio.toFixed(2)}</p>
                <button type="button" className="carritoClienteRemove" onClick={() => removeItem(item.id)}>
                  Remover
                </button>
              </div>
            </article>
          ))}
        </section>

        <div className="carritoClienteResumen" aria-label="Resumen">
          <p className="carritoClienteResumenLabel">Total</p>
          <p className="carritoClienteResumenValor">USD {total.toFixed(2)}</p>
          <button type="button" className="carritoClienteComprar" onClick={comprar} disabled={procesando || items.length === 0}>
            {procesando ? 'Procesando...' : 'Comprar'}
          </button>
        </div>
      </main>

      <FooterCliente className="carritoClienteFooter" />
    </div>
  );
}

export default Carrito;

