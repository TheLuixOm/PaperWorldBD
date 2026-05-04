import './RegisterMov.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import loginImage from '../../images/login.svg';
import clipNegro from '../../images/Clip_negro.svg';

type RegisterMovProps = {
  onIrLogin?: () => void;
};

function RegisterMov({ onIrLogin }: RegisterMovProps) {
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
  const regexUsername = /^[a-zA-Z0-9._-]+$/;
  const regexTelefono = /^\d{7,15}$/;

  const filtrarNombreInput = (event: React.FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
  };

  const filtrarTelefonoInput = (event: React.FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '');
  };

  const filtrarUsernameInput = (event: React.FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.replace(/[^a-zA-Z0-9._-]/g, '');
  };

  const registrarCuenta = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get('nombre') ?? '').trim();
    const apellido = String(form.get('apellido') ?? '').trim();
    const telefono = String(form.get('telefono') ?? '').trim();
    const correo = String(form.get('correo') ?? '').trim();
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '').trim();
    const fecha = String(form.get('fecha_nacimiento') ?? '').trim();

    if (!nombre || !apellido || !telefono || !correo || !username || !password) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    if (!fecha) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }

    if (!regexNombre.test(nombre)) {
      setError('El nombre no puede contener números ni símbolos.');
      return;
    }

    if (!regexNombre.test(apellido)) {
      setError('El apellido no puede contener números ni símbolos.');
      return;
    }

    if (correo.includes(' ')) {
      setError('El correo no puede contener espacios.');
      return;
    }

    if (!regexUsername.test(username)) {
      setError('El usuario solo puede contener letras, números, punto, guion y guion bajo.');
      return;
    }

    const telefonoNormalizado = telefono.replace(/\D/g, '');
    if (!regexTelefono.test(telefonoNormalizado)) {
      setError('El teléfono solo puede contener números (7 a 15 dígitos).');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const respuesta = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          apellido,
          telefono: telefonoNormalizado,
          correo,
          username,
          password,
          edad: fecha,
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos?.error || 'No se pudo registrar la cuenta.');
        return;
      }

      navegar('/login');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const irAInicioSesion = () => {
    if (onIrLogin) {
      onIrLogin();
      return;
    }

    navegar('/login');
  };

  return (
    <main className="registro-mov-pagina">
      <section className="registro-mov-cabecera" style={{ backgroundImage: `url(${loginImage})` }}>
        <div className="registro-mov-tarjeta-marca">
          <h1 className="registro-mov-marca">Paper world</h1>
        </div>
      </section>

      <section className="registro-mov-contenido">
        <form className="registro-mov-tarjeta" onSubmit={registrarCuenta}>
          <h2 className="registro-mov-titulo">Crear Cuenta</h2>
          <p className="registro-mov-subtitulo">
            Ya tienes una cuenta?{' '}
            <button type="button" className="registro-mov-enlace" onClick={irAInicioSesion}>
              Inicia Sesión
            </button>
          </p>

          <input
            className="registro-mov-campo"
            name="nombre"
            type="text"
            placeholder="Nombre"
            autoComplete="given-name"
            onInput={filtrarNombreInput}
            required
          />
          <input
            className="registro-mov-campo"
            name="apellido"
            type="text"
            placeholder="Apellido"
            autoComplete="family-name"
            onInput={filtrarNombreInput}
            required
          />
          <input
            className="registro-mov-campo"
            name="telefono"
            type="tel"
            placeholder="Telefono"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            onInput={filtrarTelefonoInput}
            required
          />
          <input
            className="registro-mov-campo"
            name="correo"
            type="email"
            placeholder="Correo"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <input
            className="registro-mov-campo"
            name="username"
            type="text"
            placeholder="Usuario"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            onInput={filtrarUsernameInput}
            required
          />
          <input className="registro-mov-campo" name="password" type="password" placeholder="Contraseña" autoComplete="new-password" required />

          <input className="registro-mov-campo registro-mov-campo-fecha" name="fecha_nacimiento" type="date" aria-label="Fecha de nacimiento" required />

          <button type="submit" className="registro-mov-boton-crear" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>

          <div className="registro-mov-terminos-bloque">
            <label className="registro-mov-linea-aceptacion">
              <input type="checkbox" required /> He leído y acepto los{' '}
              <Link
                className="registro-mov-terminos"
                to="/terminos"
                onClick={(event) => event.stopPropagation()}
              >
                términos y condiciones
              </Link>
            </label>
            <p className="registro-mov-terminos-subtitulo">
              Revisa los términos antes de crear tu cuenta.
            </p>
          </div>

          {error ? <p className="registro-mov-error">{error}</p> : null}

        </form>

        <div className="registro-mov-redes-contenedor">
          <button type="button" className="registro-mov-boton-red registro-mov-boton-red-google">
            <span className="registro-mov-icono-red">G</span> Registrate con Google
          </button>
          <button type="button" className="registro-mov-boton-red registro-mov-boton-red-facebook">
            <span className="registro-mov-icono-red">f</span> Registrate con Facebook
          </button>
        </div>

        <img src={clipNegro} alt="Clip" className="registro-mov-clip" />
      </section>
    </main>
  );
}

export default RegisterMov;