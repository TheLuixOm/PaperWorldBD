import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginImage from '../../images/login.svg';
import Clip_negro from '../../images/Clip_negro.svg';
import '../login/Login.css';
import './RecuperarClave.css';
import { restablecerClave, verificarTelefono } from '../../api/recuperarClave';

type Paso = 'telefono' | 'nueva-clave' | 'listo';

function maskTelefono(digits: string) {
  if (!digits) return '';
  const ultimos = digits.slice(-4);
  return `••• ••• ${ultimos}`;
}

export default function RecuperarClaveEsc() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>('telefono');
  const [telefono, setTelefono] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const telefonoDigits = useMemo(() => telefono.replace(/[^0-9]/g, ''), [telefono]);
  const telefonoMasked = useMemo(() => maskTelefono(telefonoDigits), [telefonoDigits]);

  const volverALogin = () => {
    navigate('/login');
  };

  const onSubmitTelefono = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!telefonoDigits) {
      setError('Ingresa tu número de teléfono.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const res = await verificarTelefono(telefonoDigits);
      if (!res.ok) {
        setError('No se encontró un usuario con ese número.');
        return;
      }
      setPaso('nueva-clave');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const onSubmitNuevaClave = async (event: React.FormEvent) => {
    event.preventDefault();

    const clave = nuevaClave.trim();
    const confirm = confirmarClave.trim();

    if (!clave) {
      setError('Ingresa tu nueva contraseña.');
      return;
    }

    if (clave.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (clave !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const res = await restablecerClave(telefonoDigits, clave);
      if (!res.ok) {
        setError('No se pudo restablecer la contraseña.');
        return;
      }

      setPaso('listo');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-esc-page">
      <section className="login-esc-layout" aria-label="Recuperación de contraseña">
        <div className="login-esc-visual">
          <img className="login-esc-visual-image" src={loginImage} alt="Decoración izquierda" />
        </div>

        <div className="login-esc-content">
          <img className="icono_marca" src={Clip_negro} alt="Icono_Marca" />
          <header className="login-esc-header">
            <h1 className="login-esc-marca">Paper world</h1>
          </header>

          <form
            className="login-esc-card"
            onSubmit={paso === 'telefono' ? onSubmitTelefono : paso === 'nueva-clave' ? onSubmitNuevaClave : undefined}
          >
            <h2 className="recuperar-esc-title">Recuperar contraseña</h2>

            {paso === 'telefono' ? (
              <>
                <p className="recuperar-esc-text">
                  Ingresa tu número de teléfono. Si coincide con tu cuenta, podrás crear una nueva contraseña.
                </p>

                <label className="login-esc-label" htmlFor="telefono">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  className="login-esc-input"
                  placeholder="Ej: 5551234567"
                  autoComplete="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                />

                <div className="login-esc-actions" role="group" aria-label="Acciones de recuperación">
                  <button type="submit" className="login-esc-button login-esc-button-primary" disabled={cargando}>
                    {cargando ? 'Validando...' : 'Continuar'}
                  </button>
                  <button type="button" className="login-esc-button login-esc-button-secondary" onClick={volverALogin}>
                    Volver
                  </button>
                </div>
              </>
            ) : null}

            {paso === 'nueva-clave' ? (
              <>
                <p className="recuperar-esc-text">
                  Teléfono verificado ({telefonoMasked}). Ahora crea tu nueva contraseña.
                </p>

                <label className="login-esc-label" htmlFor="nuevaClave">
                  Nueva contraseña
                </label>
                <input
                  id="nuevaClave"
                  name="nuevaClave"
                  type="password"
                  className="login-esc-input"
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  value={nuevaClave}
                  onChange={(event) => setNuevaClave(event.target.value)}
                />

                <label className="login-esc-label" htmlFor="confirmarClave">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmarClave"
                  name="confirmarClave"
                  type="password"
                  className="login-esc-input"
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  value={confirmarClave}
                  onChange={(event) => setConfirmarClave(event.target.value)}
                />

                <div className="login-esc-actions" role="group" aria-label="Acciones de cambio de clave">
                  <button type="submit" className="login-esc-button login-esc-button-primary" disabled={cargando}>
                    {cargando ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button type="button" className="login-esc-button login-esc-button-secondary" onClick={volverALogin}>
                    Volver
                  </button>
                </div>
              </>
            ) : null}

            {paso === 'listo' ? (
              <>
                <p className="recuperar-esc-text">Tu contraseña se actualizó correctamente.</p>
                <div className="login-esc-actions" role="group" aria-label="Acciones finales">
                  <button type="button" className="login-esc-button login-esc-button-primary" onClick={volverALogin}>
                    Ir al login
                  </button>
                  <button type="button" className="login-esc-button login-esc-button-secondary" onClick={() => navigate('/')}
                  >
                    Inicio
                  </button>
                </div>
              </>
            ) : null}

            {error ? <p className="recuperar-esc-error">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
