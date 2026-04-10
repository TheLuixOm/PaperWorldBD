import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ShoppingCart, Trash2 } from 'lucide-react';
import UsuarioMenu from '../../empleado/Barras/UsuarioMenu';
import MenuLateralMovil from '../componentes/MenuLateralMovil';
import FooterCliente from '../componentes/FooterCliente';
import clipAzul from '../../../images/Clip_azul.svg';
import { useCart } from './CarritoContext';
import '../inicio/InicioClienteMov.css';
import './CarritoMov.css';

function CarritoMov() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { items, totalItems, totalPrice, removeItem, setQuantity } = useCart();

  const total = useMemo(() => totalPrice, [totalPrice]);

  const actualizarCantidad = (id: string, delta: number) => {
    const actual = items.find((x) => x.id === id);
    if (!actual) {
      return;
    }
    setQuantity(id, actual.cantidad + delta);
  };

  return (
    <div className="inicioClienteMov carritoMov" id="carrito-mov">
      <MenuLateralMovil abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} />

      <header className="inicioClienteMovHeader carritoMovHeader">
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

          <div className="carritoMovAcciones">
            <UsuarioMenu className="clienteUsuarioMenuMov" ariaLabel="Menu de usuario" />

            <div className="carritoMovAccionCarrito" aria-label="Carrito">
              <span className="carritoMovCarritoIcono" aria-hidden="true">
                <ShoppingCart />
              </span>
              <span className="carritoMovCarritoBadge" aria-label="Productos en carrito">
                {totalItems}
              </span>
            </div>

            <p className="carritoMovTotalTop" aria-label="Total del carrito">
              USD {total.toFixed(2)}
            </p>
          </div>
        </div>
      </header>

      <main className="inicioClienteMovMain carritoMovMain">
        <section className="carritoMovTitulo" aria-label="Titulo">
          <h1 className="carritoMovTituloTexto">Carrito</h1>
          <span className="carritoMovTituloBadge" aria-label="Cantidad">
            {totalItems}
          </span>
        </section>

        <div className="carritoMovLinea" aria-hidden="true" />

        <section className="carritoMovLista" aria-label="Items" role="list">
          {items.map((item) => (
            <article key={item.id} className="carritoMovItem" role="listitem">
              <div className="carritoMovItemImagen">
                <img src={item.imagen} alt={item.nombre} loading="lazy" />
              </div>

              <div className="carritoMovItemInfo">
                <div className="carritoMovItemEnc">
                  <div className="carritoMovItemIzq">
                    <p className="carritoMovItemNombre">{item.nombre}</p>

                    <div className="carritoMovItemMeta">
                      <p>
                        <span>ID: </span>
                        {item.id}
                      </p>
                      {item.categoria && (
                        <p>
                          <span>Categoria: </span>
                          {item.categoria}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="carritoMovItemDer">
                    <p className="carritoMovItemPrecio">{item.precio.toFixed(2)} $</p>

                    <div className="carritoMovQtyRow" aria-label="Cantidad">
                      <button
                        type="button"
                        className="carritoMovQtyBtn"
                        aria-label="Disminuir"
                        onClick={() => actualizarCantidad(item.id, -1)}
                      >
                        −
                      </button>
                      <span className="carritoMovQtyValue" aria-label="Cantidad">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        className="carritoMovQtyBtn"
                        aria-label="Aumentar"
                        onClick={() => actualizarCantidad(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="carritoMovTrash"
                      aria-label="Eliminar"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>

              <div className="carritoMovSeparador" aria-hidden="true" />
            </article>
          ))}
        </section>

        <section className="carritoMovResumen" aria-label="Resumen">
          <div className="carritoMovLinea" aria-hidden="true" />
          <div className="carritoMovResumenFila">
            <p className="carritoMovResumenLabel">Total</p>
            <p className="carritoMovResumenValor">USD {total.toFixed(2)}</p>
          </div>

          <div className="carritoMovLinea" aria-hidden="true" />

          <button type="button" className="carritoMovComprar">
            Comprar
          </button>
        </section>

        <div className="carritoMovEspaciador" aria-hidden="true" />
      </main>

      <FooterCliente className="inicioClienteMovFooter" />

      <Link to="/cliente/catalogo" className="carritoMovVolver" aria-label="Volver a catalogo">
        Volver al catalogo
      </Link>
    </div>
  );
}

export default CarritoMov;
