import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './agregar_proveedores.css';
import './Modificar_proveedores.css';
import { actualizarProveedor } from '../../../api/proveedores';

type Proveedor = {
	id: string;
	nombre: string;
	email: string;
	contacto: string;
};

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
	const [guardando, setGuardando] = useState(false);
	const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

	useEffect(() => {
		if (proveedor) {
			setFormularioProveedor(construirFormulario(proveedor));
		}
	}, [proveedor]);

	const actualizarCampoFormulario = (campo: keyof DatosFormularioProveedor, valor: string) => {
		setFormularioProveedor((formularioActual) => ({
			...formularioActual,
			[campo]: valor,
		}));
	};

	const guardarCambiosProveedor = async () => {
		if (!formularioProveedor.nombre.trim()) {
			return;
		}

		if (!proveedor || guardando) {
			return;
		}

		setGuardando(true);
		setErrorFormulario(null);

		try {
			await actualizarProveedor(proveedor.id, {
				nombre: formularioProveedor.nombre.trim(),
				referencia: formularioProveedor.referencia,
				telefono: formularioProveedor.contacto.trim(),
				correo: formularioProveedor.email.trim(),
			});

			navigate('/proveedores');
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('[proveedores] no se pudo actualizar en API', err);
			setErrorFormulario('No se pudieron guardar los cambios en la base de datos.');
		} finally {
			setGuardando(false);
		}
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
				{errorFormulario ? <p>{errorFormulario}</p> : null}
				<form
					className="inventarioFormularioAgregar inventarioFormularioAgregarProveedor"
					onSubmit={(event) => {
						event.preventDefault();
						void guardarCambiosProveedor();
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
						readOnly
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

					<div className="inventarioAccionesFormulario inventarioAccionesFormularioProveedor">
						<button className="inventarioBotonGuardar" type="submit" disabled={guardando}>
							{guardando ? 'Guardando...' : 'Guardar cambios'}
						</button>
					</div>
				</form>
			</section>
		</section>
	);
}

export default ModificarProveedores;
