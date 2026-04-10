import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Home, ShoppingCart } from 'lucide-react';
import clipAzul from '../../../images/Clip_azul.svg';
import './MenuLateralMovil.css';

type MenuLateralMovilProps = {
  abierto: boolean;
  alCerrar: () => void;
};

function MenuLateralMovil({ abierto, alCerrar }: MenuLateralMovilProps) {
  const primerItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const alTeclado = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        alCerrar();
      }
    };

    document.addEventListener('keydown', alTeclado);
    window.setTimeout(() => primerItemRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', alTeclado);
    };
  }, [abierto, alCerrar]);

  return (
    <div
      className={`menuLateralMovil ${abierto ? 'menuLateralMovilAbierto' : ''}`}
      aria-hidden={!abierto}
    >
      <button
        type="button"
        className="menuLateralMovilOverlay"
        aria-label="Cerrar menu"
        onClick={alCerrar}
        tabIndex={abierto ? 0 : -1}
      />

      <aside className="menuLateralMovilPanel" role="dialog" aria-label="Menu">
        <div className="menuLateralMovilTop">
          <img className="menuLateralMovilClip" src={clipAzul} alt="Clip" />
        </div>

        <nav className="menuLateralMovilNav" aria-label="Navegacion principal">
          <NavLink
            ref={primerItemRef}
            to="/cliente/inicio"
            end
            className={({ isActive }) =>
              `menuLateralMovilItem ${isActive ? 'menuLateralMovilItemActivo' : ''}`
            }
            onClick={alCerrar}
          >
            <span className="menuLateralMovilIcono" aria-hidden="true">
              <Home />
            </span>
            <span className="menuLateralMovilTexto">Inicio</span>
          </NavLink>

          <NavLink
            to="/cliente/catalogo"
            className={({ isActive }) =>
              `menuLateralMovilItem ${isActive ? 'menuLateralMovilItemActivo' : ''}`
            }
            onClick={alCerrar}
          >
            <span className="menuLateralMovilIcono" aria-hidden="true">
              <BookOpen />
            </span>
            <span className="menuLateralMovilTexto">Catálogo</span>
          </NavLink>

          <NavLink
            to="/cliente/carrito"
            className={({ isActive }) =>
              `menuLateralMovilItem ${isActive ? 'menuLateralMovilItemActivo' : ''}`
            }
            onClick={alCerrar}
          >
            <span className="menuLateralMovilIcono" aria-hidden="true">
              <ShoppingCart />
            </span>
            <span className="menuLateralMovilTexto">Carrito</span>
          </NavLink>
        </nav>
      </aside>
    </div>
  );
}

export default MenuLateralMovil;
