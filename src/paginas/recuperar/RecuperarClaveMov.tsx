import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginImage from '../../images/login.svg';
import '../login/LoginMov.css';
import './RecuperarClaveMov.css';
import { restablecerClave, verificarTelefono } from '../../api/recuperarClave';

type Paso = 'telefono' | 'nueva-clave' | 'listo';

function maskTelefono(digits: string) {
  if (!digits) return '';
  const ultimos = digits.slice(-4);
  return `••• ••• ${ultimos}`;
}

export default function RecuperarClaveMov() {
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
    <main className="login-mov-page">
      <section className="login-mov-hero" style={{ backgroundImage: `url(${loginImage})` }}>
        <div className="login-mov-brand-card">
          <h1 className="login-mov-brand">Paper world</h1>
        </div>
      </section>

      <section className="login-mov-content">
        <form
          className="login-mov-card"
          onSubmit={paso === 'telefono' ? onSubmitTelefono : paso === 'nueva-clave' ? onSubmitNuevaClave : undefined}
        >
          <h2 className="recuperar-mov-title">Recuperar contraseña</h2>

          {paso === 'telefono' ? (
            <>
              <p className="recuperar-mov-text">
                Ingresa tu número de teléfono. Si coincide con tu cuenta, podrás crear una nueva contraseña.
              </p>

              <label className="login-mov-label" htmlFor="telefono">
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                className="login-mov-input"
                placeholder="Ej: 5551234567"
                autoComplete="tel"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
              />

              <div className="login-mov-actions" role="group" aria-label="Acciones de recuperación">
                <button type="submit" className="login-mov-button login-mov-button-primary" disabled={cargando}>
                  {cargando ? 'Validando...' : 'Continuar'}
                </button>
                <button type="button" className="login-mov-button login-mov-button-secondary" onClick={volverALogin}>
                  Volver
                </button>
              </div>
            </>
          ) : null}

          {paso === 'nueva-clave' ? (
            <>
              <p className="recuperar-mov-text">Teléfono verificado ({telefonoMasked}).</p>

              <label className="login-mov-label" htmlFor="nuevaClave">
                Nueva contraseña
              </label>
              <input
                id="nuevaClave"
                name="nuevaClave"
                type="password"
                className="login-mov-input"
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                value={nuevaClave}
                onChange={(event) => setNuevaClave(event.target.value)}
              />

              <label className="login-mov-label" htmlFor="confirmarClave">
                Confirmar contraseña
              </label>
              <input
                id="confirmarClave"
                name="confirmarClave"
                type="password"
                className="login-mov-input"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                value={confirmarClave}
                onChange={(event) => setConfirmarClave(event.target.value)}
              />

              <div className="login-mov-actions" role="group" aria-label="Acciones de cambio de clave">
                <button type="submit" className="login-mov-button login-mov-button-primary" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className="login-mov-button login-mov-button-secondary" onClick={volverALogin}>
                  Volver
                </button>
              </div>
            </>
          ) : null}

          {paso === 'listo' ? (
            <>
              <p className="recuperar-mov-text">Tu contraseña se actualizó correctamente.</p>
              <div className="login-mov-actions" role="group" aria-label="Acciones finales">
                <button type="button" className="login-mov-button login-mov-button-primary" onClick={volverALogin}>
                  Ir al login
                </button>
                <button type="button" className="login-mov-button login-mov-button-secondary" onClick={() => navigate('/')}
                >
                  Inicio
                </button>
              </div>
            </>
          ) : null}

          {error ? <p className="recuperar-mov-error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
