import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../inventario/Inventario.css';
import './agregar_proveedores.css';

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
  const [logoSeleccionado, setLogoSeleccionado] = useState<string>('');
  const inputLogoRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (logoSeleccionado.startsWith('blob:')) {
        URL.revokeObjectURL(logoSeleccionado);
      }
    };
  }, [logoSeleccionado]);

  const actualizarCampoFormulario = (campo: keyof FormularioProveedor, valor: string) => {
    setFormularioProveedor((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const limpiarFormulario = () => {
    setFormularioProveedor(formularioVacio);
    setLogoSeleccionado('');

    if (inputLogoRef.current) {
      inputLogoRef.current.value = '';
    }
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

  const guardarProveedor = (mantenerFormularioAbierto: boolean) => {
    if (!formularioProveedor.nombre.trim()) {
      return;
    }

    if (mantenerFormularioAbierto) {
      limpiarFormulario();
      return;
    }

    navigate('/proveedores');
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
        <form
          className="inventarioFormularioAgregar inventarioFormularioAgregarProveedor"
          onSubmit={(event) => {
            event.preventDefault();
            guardarProveedor(false);
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
                Subir logo
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5-1.7A3.8 3.8 0 0 1 18 17" />
                  <path d="M12 11v8" />
                  <path d="m8.9 13.8 3.1-3.1 3.1 3.1" />
                </svg>
              </button>

              <input ref={inputLogoRef} type="file" accept="image/*" className="inventarioInputArchivo" onChange={manejarSeleccionLogo} />
            </div>
          </div>

          <div className="inventarioAccionesFormulario inventarioAccionesFormularioProveedor">
            <button className="inventarioBotonGuardar" type="submit">
              Guardar proveedor
            </button>

            <button className="inventarioBotonGuardar" type="button" onClick={() => guardarProveedor(true)}>
              Guardar y añadir otro
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

export default AgregarProveedores;