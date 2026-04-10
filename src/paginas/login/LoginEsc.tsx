import { useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import './Login.css';
import loginImage from '../../images/login.svg';
import Clip_negro from '../../images/Clip_negro.svg';
import { animarImagenAuthOverlay, type Rect } from '../auth/animarImagenAuth';

type AuthTransitionState = {
	authTransition?: {
		fromRect: Rect;
		imageSrc: string;
	};
};

function LoginEsc() {
	const navigate = useNavigate();
	const location = useLocation();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [animando, setAnimando] = useState(false);
	const visualRef = useRef<HTMLDivElement | null>(null);
	const yaAnimadoRef = useRef(false);

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

	const iniciarSesion = (event: React.FormEvent) => {
		event.preventDefault();
		const usuario = email.trim();

		if (!usuario) {
			return;
		}
		localStorage.setItem('paperworldUsuario', usuario);
		navigate('/dashboard');
	};

	const irARegistro = () => {
		if (animando) {
			return;
		}

		const visual = visualRef.current;
		const fromRect = visual?.getBoundingClientRect();
		if (!fromRect) {
			navigate('/register');
			return;
		}

		setAnimando(true);
		navigate('/register', {
			state: {
				authTransition: {
					fromRect,
					imageSrc: loginImage,
				},
			} satisfies AuthTransitionState,
		});
	};

	return (
		<main className="login-esc-page">
			<section className="login-esc-layout" aria-label="Login escritorio">
				<div className="login-esc-visual" ref={visualRef}>
					<img
						className="login-esc-visual-image"
						src={loginImage}
						alt="Decoracion izquierda"
					/>
				</div>

				<div className="login-esc-content">
					<img
						className='icono_marca' 
						src={Clip_negro} 
						alt="Icono_Marca" />
					<header className="login-esc-header">
						<h1 className="login-esc-marca">Paper world</h1>
					</header>

					<form className="login-esc-card" onSubmit={iniciarSesion}>
						<label className="login-esc-label" htmlFor="email">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							className="login-esc-input"
							placeholder="Value"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>

						<label className="login-esc-label" htmlFor="password">
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							className="login-esc-input"
							placeholder="Value"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>

						<div className="login-esc-actions" role="group" aria-label="Acciones de login">
							<button type="submit" className="login-esc-button login-esc-button-primary">
								Log in
							</button>
							<button type="button" className="login-esc-button login-esc-button-secondary" onClick={irARegistro} disabled={animando}>
								Sign In
							</button>
						</div>

						<button type="button" className="login-esc-olvido">
							¿Olvido su contraseña?
						</button>
					</form>
				</div>
			</section>
		</main>
	);
}

export default LoginEsc;
