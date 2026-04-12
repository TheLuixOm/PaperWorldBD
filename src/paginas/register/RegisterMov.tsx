import './RegisterMov.css';
import { useNavigate } from 'react-router-dom';
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
          telefono,
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

          <input className="registro-mov-campo" name="nombre" type="text" placeholder="Nombre" autoComplete="given-name" required />
          <input className="registro-mov-campo" name="apellido" type="text" placeholder="Apellido" autoComplete="family-name" required />
          <input className="registro-mov-campo" name="telefono" type="tel" placeholder="Telefono" autoComplete="tel" required />
          <input className="registro-mov-campo" name="correo" type="email" placeholder="Correo" autoComplete="email" required />
          <input className="registro-mov-campo" name="username" type="text" placeholder="Usuario" autoComplete="username" required />
          <input className="registro-mov-campo" name="password" type="password" placeholder="Contraseña" autoComplete="new-password" required />

          <input className="registro-mov-campo registro-mov-campo-fecha" name="fecha_nacimiento" type="date" aria-label="Fecha de nacimiento" required />

          <button type="submit" className="registro-mov-boton-crear" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>

          <label className="registro-mov-linea-aceptacion">
            <input type="checkbox" required /> He leído y acepto los{' '}
            <span className="registro-mov-terminos">términos y condiciones</span>
          </label>

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