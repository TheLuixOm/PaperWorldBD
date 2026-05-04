import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './agregar_proveedores.css';
import { crearProveedor } from '../../../api/proveedores';

type FormularioProveedor = {
  nombre: string;
  referencia: string;
  email: string;
  contacto: string;
};

const formularioVacio: FormularioProveedor = {
  nombre: '',
  referencia: '',
  email: '',
  contacto: '',
};

function AgregarProveedores() {
  const [formularioProveedor, setFormularioProveedor] = useState<FormularioProveedor>(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const navigate = useNavigate();

  const actualizarCampoFormulario = (campo: keyof FormularioProveedor, valor: string) => {
    setFormularioProveedor((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const limpiarFormulario = () => {
    setFormularioProveedor(formularioVacio);
  };

  const guardarProveedor = async (mantenerFormularioAbierto: boolean) => {
    if (!formularioProveedor.nombre.trim()) {
      return;
    }

    if (guardando) {
      return;
    }

    setGuardando(true);
    setErrorFormulario(null);

    try {
      await crearProveedor({
        referencia: formularioProveedor.referencia,
        nombre: formularioProveedor.nombre.trim(),
        telefono: formularioProveedor.contacto.trim(),
        correo: formularioProveedor.email.trim(),
      });

      if (mantenerFormularioAbierto) {
        limpiarFormulario();
        return;
      }

      navigate('/proveedores');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[proveedores] no se pudo crear en API', err);
      setErrorFormulario('No se pudo guardar el proveedor en la base de datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="inventarioVista inventarioVistaCambio inventarioVistaAgregar inventarioAgregarProveedorVista" id="agregar-proveedores">
      <header className="inventarioEncabezadoAgregar">
        <h2 className="inventarioTituloAgregar">Añadir nuevo proveedor</h2>
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
            void guardarProveedor(false);
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

          <div className="inventarioAccionesFormulario inventarioAccionesFormularioProveedor">
            <button className="inventarioBotonGuardar" type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar proveedor'}
            </button>

            <button className="inventarioBotonGuardar" type="button" disabled={guardando} onClick={() => void guardarProveedor(true)}>
              {guardando ? 'Guardando...' : 'Guardar y añadir otro'}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

export default AgregarProveedores;