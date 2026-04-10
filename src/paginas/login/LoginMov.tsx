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

  const iniciarSesion = (event: React.FormEvent) => {
    event.preventDefault();
    const usuario = correo.trim();

    if (!usuario) {
      return;
    }

    localStorage.setItem('paperworldUsuario', usuario);
    navigate('/inventario');
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
            <button type="submit" className="login-mov-button login-mov-button-primary">
              Login
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
        </form>
      </section>
    </main>
  );
}

export default LoginMov;
