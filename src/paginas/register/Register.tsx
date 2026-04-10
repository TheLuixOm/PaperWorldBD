import { useLocation, useNavigate } from 'react-router-dom';
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
    const layoutRef = useRef<HTMLElement | null>(null);
    const visualRef = useRef<HTMLDivElement | null>(null);
    const yaAnimadoRef = useRef(false);
    const dias = Array.from({ length: 31 }, (_, indice) => String(indice + 1).padStart(2, '0'));
    const meses = Array.from({ length: 12 }, (_, indice) => String(indice + 1).padStart(2, '0'));
    const year_actual = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, indice) => String(year_actual - indice));

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

    const registrarYVolverALogin = (event: React.FormEvent) => {
        event.preventDefault();
        volverALogin();
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
                                />
                                <input
                                    id="apellido"
                                    name="apellido"
                                    type="text"
                                    className="register_input"
                                    placeholder="Apellido"
                                    autoComplete="family-name"
                                />
                        </div>
                    
                        <input
                            id="Email"
                            name="Email"
                            type="email"
                            className="register_input"
                            placeholder="Email"
                            autoComplete="email"
                        />
                
                        <input
                            id="nombre_usuario"
                            name="nombre_usuario"
                            type="text"
                            className="register_input"
                            placeholder="Nombre de usuario"
                            autoComplete="username"
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
                        />

						<div className='fecha' aria-label="Fecha de nacimiento">
							<select className="fecha_select fecha_select_dia" name="dia" defaultValue="" aria-label="Día">
								<option value="" disabled>DD</option>
								{dias.map((dia) => (
									<option key={dia} value={dia}>{dia}</option>
								))}
							</select>

							<select className="fecha_select fecha_select_mes" name="mes" defaultValue="" aria-label="Mes">
								<option value="" disabled>MM</option>
								{meses.map((mes) => (
									<option key={mes} value={mes}>{mes}</option>
								))}
							</select>

							<select className="fecha_select fecha_select_anio" name="anio" defaultValue="" aria-label="Año">
								<option value="" disabled>YYYY</option>
								{years.map((year) => (
									<option key={year} value={year}>{year}</option>
								))}
							</select>
						</div>

                        <label>
                            <input className='checkbox' type="checkbox" name="terminos" id="terminos" required />
                            Acepto los términos y condiciones
                        </label>

                        <div className="register_actions" role="group" aria-label="Acciones de registro">
                            <button type="submit" className="register_button register_button_primary">
                                Registrarse
                            </button>
                            <button type="button" className="register_button register_button_secondary" onClick={volverALogin} disabled={animando}>
                                Volver
                            </button>
                        </div>
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