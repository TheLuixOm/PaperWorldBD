import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './LoginMov.css';
import loginImage from '../../images/login.svg';

type LoginMovProps = {
  onIrRegistro?: () => void;
};

function LoginMov({ onIrRegistro }: LoginMovProps) {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (event: React.FormEvent) => {
    event.preventDefault();
    const usuario = correo.trim();
    const clave = contrasena.trim();

    if (!usuario || !clave) {
      setError('Ingresa correo y contraseña.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: usuario,
          contraseña: clave,
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo iniciar sesión.');
        return;
      }

      localStorage.setItem('paperworldUsuario', usuario);
      localStorage.setItem('paperworldToken', datos.token);

      const roles: string[] = Array.isArray(datos?.user?.roles) ? datos.user.roles : [];
      if (roles.includes('cliente')) {
        navigate('/cliente/inicio');
        return;
      }

      navigate('/dashboard');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const irARegistro = () => {
    if (onIrRegistro) {
      onIrRegistro();
      return;
    }

    navigate('/register');
  };

  return (
    <main className="login-mov-page">
      <section className="login-mov-hero" style={{ backgroundImage: `url(${loginImage})` }}>
        <div className="login-mov-brand-card">
          <h1 className="login-mov-brand">Paper world</h1>
        </div>
      </section>

      <section className="login-mov-content">
        <form className="login-mov-card" onSubmit={iniciarSesion}>
          <label className="login-mov-label" htmlFor="correo">
            Correo
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            className="login-mov-input"
            placeholder="Value"
            autoComplete="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
          />

          <label className="login-mov-label" htmlFor="contrasena">
            Contraseña
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            className="login-mov-input"
            placeholder="Value"
            autoComplete="current-password"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
          />

          <div className="login-mov-actions" role="group" aria-label="Acciones de login">
            <button type="submit" className="login-mov-button login-mov-button-primary" disabled={cargando}>
              {cargando ? 'Entrando...' : 'Login'}
            </button>
            <button
              type="button"
              className="login-mov-button login-mov-button-secondary"
              onClick={irARegistro}
            >
              Registrate
            </button>
          </div>

          <button type="button" className="login-mov-forgot">
            ¿Olvido su contraseña?
          </button>

          {error ? <p className="login-mov-error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default LoginMov;
