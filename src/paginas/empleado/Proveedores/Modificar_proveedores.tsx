import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './agregar_proveedores.css';
import './Modificar_proveedores.css';
import type { Proveedor } from '../datosInventario';

type DatosFormularioProveedor = {
	nombre: string;
	referencia: string;
	email: string;
	contacto: string;
};

type EstadoRutaModificarProveedor = {
	proveedor?: Proveedor;
};

function construirFormulario(proveedor: Proveedor): DatosFormularioProveedor {
	return {
		nombre: proveedor.nombre,
		referencia: proveedor.id,
		email: proveedor.email,
		contacto: proveedor.contacto,
	};
}

function ModificarProveedores() {
	const navigate = useNavigate();
	const location = useLocation();
	const estadoRuta = (location.state as EstadoRutaModificarProveedor | null) ?? null;
	const proveedor = estadoRuta?.proveedor ?? null;

	const [formularioProveedor, setFormularioProveedor] = useState<DatosFormularioProveedor>({
		nombre: proveedor?.nombre ?? '',
		referencia: proveedor?.id ?? '',
		email: proveedor?.email ?? '',
		contacto: proveedor?.contacto ?? '',
	});
	const [logoSeleccionado, setLogoSeleccionado] = useState<string>(proveedor?.logo ?? '');
	const inputLogoRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (proveedor) {
			setFormularioProveedor(construirFormulario(proveedor));
			setLogoSeleccionado(proveedor.logo);
		}
	}, [proveedor]);

	useEffect(() => {
		return () => {
			if (logoSeleccionado.startsWith('blob:')) {
				URL.revokeObjectURL(logoSeleccionado);
			}
		};
	}, [logoSeleccionado]);

	const actualizarCampoFormulario = (campo: keyof DatosFormularioProveedor, valor: string) => {
		setFormularioProveedor((formularioActual) => ({
			...formularioActual,
			[campo]: valor,
		}));
	};

	const manejarSeleccionLogo = (evento: ChangeEvent<HTMLInputElement>) => {
		const archivo = evento.target.files?.[0];

		if (!archivo) {
			return;
		}

		if (logoSeleccionado.startsWith('blob:')) {
			URL.revokeObjectURL(logoSeleccionado);
		}

		setLogoSeleccionado(URL.createObjectURL(archivo));
	};

	const guardarCambiosProveedor = () => {
		if (!formularioProveedor.nombre.trim()) {
			return;
		}

		navigate('/proveedores');
	};

	return (
		<section className="inventarioVista inventarioVistaCambio inventarioVistaAgregar inventarioModificarProveedorVista" id="modificar-proveedores">
			<header className="inventarioEncabezadoAgregar">
				<h2 className="inventarioTituloAgregar">Modificar proveedor</h2>
				<button className="inventarioBotonCancelar" type="button" onClick={() => navigate('/proveedores')}>
					Cancelar
				</button>
			</header>

			<section className="inventarioPanel inventarioPanelAgregar">
				<form
					className="inventarioFormularioAgregar inventarioFormularioAgregarProveedor"
					onSubmit={(event) => {
						event.preventDefault();
						guardarCambiosProveedor();
					}}
				>
					<input
						className="inventarioFormularioInput"
						type="text"
						placeholder="Nombre del proveedor"
						value={formularioProveedor.nombre}
						onChange={(event) => actualizarCampoFormulario('nombre', event.target.value)}
						required
					/>
					<input
						className="inventarioFormularioInput"
						type="text"
						placeholder="Referencia/codigo"
						value={formularioProveedor.referencia}
						onChange={(event) => actualizarCampoFormulario('referencia', event.target.value)}
					/>
					<input
						className="inventarioFormularioInput"
						type="text"
						placeholder="Email"
						value={formularioProveedor.email}
						onChange={(event) => actualizarCampoFormulario('email', event.target.value)}
					/>
					<input
						className="inventarioFormularioInput"
						type="text"
						placeholder="Contacto"
						value={formularioProveedor.contacto}
						onChange={(event) => actualizarCampoFormulario('contacto', event.target.value)}
					/>

					<div className="inventarioFilaImagen inventarioFilaImagenProveedor">
						<p className="inventarioTextoImagen">Logo del proveedor:</p>

						<div className="inventarioCargaImagenContenedor">
							<button type="button" className="inventarioBotonSubirImagen" onClick={() => inputLogoRef.current?.click()}>
								Cambiar logo
								<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
									<path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5-1.7A3.8 3.8 0 0 1 18 17" />
									<path d="M12 11v8" />
									<path d="m8.9 13.8 3.1-3.1 3.1 3.1" />
								</svg>
							</button>

							<input ref={inputLogoRef} type="file" accept="image/*" className="inventarioInputArchivo" onChange={manejarSeleccionLogo} />
						</div>
					</div>

					{logoSeleccionado && (
						<div className="modificarProveedorVistaPreviaLogo">
							<p>Vista previa:</p>
							<img src={logoSeleccionado} alt={`Logo de ${formularioProveedor.nombre || 'proveedor'}`} />
						</div>
					)}

					<div className="inventarioAccionesFormulario inventarioAccionesFormularioProveedor">
						<button className="inventarioBotonGuardar" type="submit">
							Guardar cambios
						</button>
					</div>
				</form>
			</section>
		</section>
	);
}

export default ModificarProveedores;
