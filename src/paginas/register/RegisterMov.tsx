import './RegisterMov.css';
import { useNavigate } from 'react-router-dom';
import loginImage from '../../images/login.svg';
import clipNegro from '../../images/Clip_negro.svg';

type RegisterMovProps = {
  onIrLogin?: () => void;
};

function RegisterMov({ onIrLogin }: RegisterMovProps) {
  const navegar = useNavigate();

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
        <form className="registro-mov-tarjeta" onSubmit={(event) => event.preventDefault()}>
          <h2 className="registro-mov-titulo">Crear Cuenta</h2>
          <p className="registro-mov-subtitulo">
            Ya tienes una cuenta?{' '}
            <button type="button" className="registro-mov-enlace" onClick={irAInicioSesion}>
              Inicia Sesión
            </button>
          </p>

          <input className="registro-mov-campo" type="text" placeholder="Nombre" autoComplete="given-name" />
          <input className="registro-mov-campo" type="text" placeholder="Apellido" autoComplete="family-name" />
          <input className="registro-mov-campo" type="tel" placeholder="Telefono" autoComplete="tel" />
          <input className="registro-mov-campo" type="email" placeholder="Correo" autoComplete="email" />
          <input className="registro-mov-campo" type="text" placeholder="Usuario" autoComplete="username" />
          <input className="registro-mov-campo" type="password" placeholder="Contraseña" autoComplete="new-password" />

          <input className="registro-mov-campo registro-mov-campo-fecha" type="date" aria-label="Fecha de nacimiento" />

          <button type="submit" className="registro-mov-boton-crear">
            Crear Cuenta
          </button>

          <label className="registro-mov-linea-aceptacion">
            <input type="checkbox" /> He leído y acepto los{' '}
            <span className="registro-mov-terminos">términos y condiciones</span>
          </label>

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