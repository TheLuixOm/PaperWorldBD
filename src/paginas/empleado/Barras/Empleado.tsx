import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, Boxes, Home, ShoppingCart, Truck } from 'lucide-react';
import clipAzul from '../../../images/Clip_azul.svg';
import './Empleado.css';

const SIDEBAR_COLAPSADO_KEY = 'paperworld.empleado.sidebarColapsado';

const opcionesMenu = [
  { ruta: '/dashboard', icono: Home, etiqueta: 'Inicio' },
  { ruta: '/inventario', icono: Boxes, etiqueta: 'Inventario' },
  { ruta: '/ventas', icono: ShoppingCart, etiqueta: 'Ordenes de venta' },
  { ruta: '/proveedores', icono: Truck, etiqueta: 'Proveedores' },
  { ruta: '/reportes', icono: BarChart3, etiqueta: 'Reportes' },
];

function Empleado() {
  const [estaColapsado, setEstaColapsado] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const valorGuardado = window.localStorage.getItem(SIDEBAR_COLAPSADO_KEY);
    if (valorGuardado === null) {
      return true;
    }

    return valorGuardado === '1';
  });
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const esVistaMovil = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 820px)').matches;
  };

  const alternarSidebar = () => {
    if (esVistaMovil()) {
      setMenuMovilAbierto((estadoPrevio) => !estadoPrevio);
      return;
    }

    setEstaColapsado((estadoPrevio) => !estadoPrevio);
  };

  useEffect(() => {
    const manejarRedimension = () => {
      if (!esVistaMovil()) {
        setMenuMovilAbierto(false);
      }
    };

    window.addEventListener('resize', manejarRedimension);

    return () => {
      window.removeEventListener('resize', manejarRedimension);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLAPSADO_KEY, estaColapsado ? '1' : '0');
  }, [estaColapsado]);

  return (
    <main
      className={`empleadoLayout ${estaColapsado ? 'empleadoLayoutColapsado' : ''} ${menuMovilAbierto ? 'empleadoLayoutMenuMovilAbierto' : ''}`}
    >
      <header className="empleadoBarraMovil" onClick={alternarSidebar}>
        <div className="empleadoMarcaMovil">
          <button
            type="button"
            className="empleadoBotonMenuMovil"
            onClick={(event) => {
              event.stopPropagation();
              alternarSidebar();
            }}
            aria-label={menuMovilAbierto ? 'Cerrar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={menuMovilAbierto}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="empleadoCentroMovil">
            <h1 className="empleadoLogoMovil">Paper world</h1>
            <img className="empleadoIconoClipMovil" src={clipAzul} alt="Clip azul" />
          </div>

          <span className="empleadoEspaciadorMovil" aria-hidden="true" />
        </div>
      </header>

      <aside className="empleadoSidebar" aria-label="Navegacion del empleado">
        <div className="empleadoMarca">
          <h1 className="empleadoLogo">Paper world</h1>
          <button
            type="button"
            className="empleadoBotonClip"
            onClick={(event) => {
              event.stopPropagation();
              alternarSidebar();
            }}
            aria-label={estaColapsado ? 'Expandir menu lateral' : 'Contraer menu lateral'}
          >
            <img className="empleadoIconoClip" src={clipAzul} alt="Clip azul" />
          </button>
        </div>

        <nav className="empleadoMenu">
          {opcionesMenu.map((opcion) => (
            (() => {
              const Icono = opcion.icono;

              return (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              className={({ isActive }) =>
                `empleadoMenuItem ${isActive ? 'empleadoMenuItemActivo' : ''}`
              }
            >
              <span className="empleadoMenuIcono" aria-hidden="true">
                <Icono />
              </span>
              <span className="empleadoTextoItem">{opcion.etiqueta}</span>
            </NavLink>
              );
            })()
          ))}
        </nav>


      </aside>

      <section className="empleadoContenido">
        <Outlet />
      </section>

      {menuMovilAbierto && (
        <button
          type="button"
          className="empleadoOverlayMovil"
          aria-label="Cerrar menu lateral"
          onClick={() => setMenuMovilAbierto(false)}
        />
      )}
    </main>
  );
}

export default Empleado;
