import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import './Register.css';
import loginImage from '../../images/login.svg';
import Clip_negro from '../../images/Clip_negro.svg';
import { animarImagenAuthOverlay, type Rect } from '../auth/animarImagenAuth';

type AuthTransitionState = {
    authTransition?: {
        fromRect: Rect;
        imageSrc: string;
    };
};

function RegisterEsc() {
    const navigate = useNavigate();
    const location = useLocation();
    const [animando, setAnimando] = useState(false);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const layoutRef = useRef<HTMLElement | null>(null);
    const visualRef = useRef<HTMLDivElement | null>(null);
    const yaAnimadoRef = useRef(false);
    const dias = Array.from({ length: 31 }, (_, indice) => String(indice + 1).padStart(2, '0'));
    const meses = Array.from({ length: 12 }, (_, indice) => String(indice + 1).padStart(2, '0'));
    const year_actual = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, indice) => String(year_actual - indice));

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

    const volverALogin = () => {
        if (animando) {
            return;
        }

        const visual = visualRef.current;
        const fromRect = visual?.getBoundingClientRect();
        if (!fromRect) {
            navigate('/login');
            return;
        }

        setAnimando(true);
        navigate('/login', {
            state: {
                authTransition: {
                    fromRect,
                    imageSrc: loginImage,
                },
            } satisfies AuthTransitionState,
        });
    };

    const registrarYVolverALogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const nombre = String(form.get('nombre') ?? '').trim();
        const apellido = String(form.get('apellido') ?? '').trim();
        const correo = String(form.get('Email') ?? '').trim();
        const username = String(form.get('nombre_usuario') ?? '').trim();
        const password = String(form.get('password') ?? '').trim();
        const telefono = String(form.get('telefono') ?? '').trim();
        const dia = String(form.get('dia') ?? '').trim();
        const mes = String(form.get('mes') ?? '').trim();
        const anio = String(form.get('anio') ?? '').trim();

        if (!nombre || !apellido || !correo || !username || !password || !telefono) {
            setError('Completa todos los campos obligatorios.');
            return;
        }

        if (!dia || !mes || !anio) {
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
            setError('El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo.');
            return;
        }

        const telefonoNormalizado = telefono.replace(/\D/g, '');
        if (!regexTelefono.test(telefonoNormalizado)) {
            setError('El teléfono solo puede contener números (7 a 15 dígitos).');
            return;
        }

        const edad = `${anio}-${mes}-${dia}`;

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
                    correo,
                    username,
                    password,
                    edad,
                    telefono: telefonoNormalizado,
                }),
            });

            const datos = await respuesta.json();
            if (!respuesta.ok) {
                setError(datos?.error || 'No se pudo registrar la cuenta.');
                return;
            }

            volverALogin();
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setCargando(false);
        }
    };

    useLayoutEffect(() => {
        if (yaAnimadoRef.current) {
            return;
        }

        const state = location.state as AuthTransitionState | null;
        const fromRect = state?.authTransition?.fromRect;
        const imageSrc = state?.authTransition?.imageSrc;
        const visual = visualRef.current;

        if (!fromRect || !imageSrc || !visual) {
            return;
        }

        yaAnimadoRef.current = true;

        const toRect = visual.getBoundingClientRect();
        const prevOpacity = visual.style.opacity;
        visual.style.opacity = '0';

        animarImagenAuthOverlay({ desde: fromRect, hasta: toRect, imageSrc })
            .catch(() => {
                // noop
            })
            .finally(() => {
                visual.style.opacity = prevOpacity;
            });
    }, [location.state]);

 	return (
		<main className="register_page">
            <section className="register_layout" aria-label="Registro escritorio" ref={layoutRef}>
				<div className="contenido_registro">
					<img
                        className="icono_marca"
                        src={Clip_negro}
						alt="Icono_Marca" />
                    <header className="register_header">
                        <h1 className="register_marca">Paper world</h1>
                        <h2 className='register_submarca'>Regístrar una cuenta</h2>
                        <h3 className='register_descripcion'>
                            Tienes una cuenta?{' '}
                            <button type="button" className="register_link" onClick={volverALogin} disabled={animando}>
                                Inicia sesión
                            </button>
                        </h3>
                    </header>
                    <form className="register_card" onSubmit={registrarYVolverALogin}>
                        <div className='misma_linea'>
                                <input
                                    id="nombre"
                                    name="nombre"
                                    type="text"
                                    className="register_input"
                                    placeholder="Nombre"
                                    autoComplete="given-name"
                                    onInput={filtrarNombreInput}
                                />
                                <input
                                    id="apellido"
                                    name="apellido"
                                    type="text"
                                    className="register_input"
                                    placeholder="Apellido"
                                    autoComplete="family-name"
                                    onInput={filtrarNombreInput}
                                />
                        </div>
                    
                        <input
                            id="Email"
                            name="Email"
                            type="email"
                            className="register_input"
                            placeholder="Email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                
                        <input
                            id="nombre_usuario"
                            name="nombre_usuario"
                            type="text"
                            className="register_input"
                            placeholder="Nombre de usuario"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck={false}
                            onInput={filtrarUsernameInput}
                        />

                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="register_input"
                            placeholder="Contraseña"
                            autoComplete="new-password"
                        />

                        <input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            className="register_input"
                            placeholder="Teléfono"
                            autoComplete="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onInput={filtrarTelefonoInput}
                            required
                        />

						<div className='fecha' aria-label="Fecha de nacimiento">
                            <select className="fecha_select fecha_select_dia" name="dia" defaultValue="" aria-label="Día" required>
								<option value="" disabled>DD</option>
								{dias.map((dia) => (
									<option key={dia} value={dia}>{dia}</option>
								))}
							</select>

                            <select className="fecha_select fecha_select_mes" name="mes" defaultValue="" aria-label="Mes" required>
								<option value="" disabled>MM</option>
								{meses.map((mes) => (
									<option key={mes} value={mes}>{mes}</option>
								))}
							</select>

                            <select className="fecha_select fecha_select_anio" name="anio" defaultValue="" aria-label="Año" required>
								<option value="" disabled>YYYY</option>
								{years.map((year) => (
									<option key={year} value={year}>{year}</option>
								))}
							</select>
						</div>

                        <div className="register_terminos">
                            <label className="register_terminos_linea">
                                <input className='checkbox' type="checkbox" name="terminos" id="terminos" required />
                                <span>Acepto los </span>
                                <Link
                                    className="register_terminos_link"
                                    to="/terminos"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    términos y condiciones
                                </Link>
                            </label>
                            <p className="register_terminos_subtitulo">
                                Te recomendamos leerlos antes de registrarte.
                            </p>
                        </div>

                        <div className="register_actions" role="group" aria-label="Acciones de registro">
                            <button type="submit" className="register_button register_button_primary" disabled={cargando}>
                                {cargando ? 'Creando cuenta...' : 'Registrarse'}
                            </button>
                            <button type="button" className="register_button register_button_secondary" onClick={volverALogin} disabled={animando}>
                                Volver
                            </button>
                        </div>

                        {error ? <p className="register_error">{error}</p> : null}
                    </form>
				</div>

                <div className="register_visual" ref={visualRef}>
                    <img
                        className="register_visual_image"
                        src={loginImage}
                        alt="Decoracion derecha"
                    />
				</div>
			</section>
		</main>
	);
}

export default RegisterEsc;