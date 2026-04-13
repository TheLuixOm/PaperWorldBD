import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import UsuarioMenu from '../Barras/UsuarioMenu';

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  precio: string;
  cantidad: number;
  vendidos: number;
  imagen: string;
};

type DatosFormulario = {
  nombre: string;
  referencia: string;
  categoria: string;
  precio: string;
  cantidad: string;
  descripcion: string;
};

export type DatosModificarProducto = DatosFormulario & {
  imagen: string;
};

type ModificarProductoProps = {
  productoInicial: Producto;
  onGuardar: (datos: DatosModificarProducto) => Promise<boolean>;
  onCancelar: () => void;
};

function construirFormulario(producto: Producto): DatosFormulario {
  return {
    nombre: producto.nombre,
    referencia: producto.id,
    categoria: producto.categoria,
    precio: producto.precio,
    cantidad: String(producto.cantidad),
    descripcion: '',
  };
}

function ModificarProducto({ productoInicial, onGuardar, onCancelar }: ModificarProductoProps) {
  const [formularioProducto, setFormularioProducto] = useState<DatosFormulario>(
    construirFormulario(productoInicial)
  );
  const [imagenSeleccionada, setImagenSeleccionada] = useState(productoInicial.imagen ?? '');
  const inputImagenRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormularioProducto(construirFormulario(productoInicial));
    setImagenSeleccionada(productoInicial.imagen ?? '');

    if (inputImagenRef.current) {
      inputImagenRef.current.value = '';
    }
  }, [productoInicial]);

  useEffect(() => {
    return () => {
      if (imagenSeleccionada.startsWith('blob:')) {
        URL.revokeObjectURL(imagenSeleccionada);
      }
    };
  }, [imagenSeleccionada]);

  const actualizarCampoFormulario = (campo: keyof DatosFormulario, valor: string) => {
    setFormularioProducto((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const manejarSeleccionImagen = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];

    if (!archivo) {
      return;
    }

    if (imagenSeleccionada.startsWith('blob:')) {
      URL.revokeObjectURL(imagenSeleccionada);
    }

    const urlTemporal = URL.createObjectURL(archivo);
    setImagenSeleccionada(urlTemporal);
  };

  const guardarCambios = async () => {
    if (!formularioProducto.nombre.trim()) {
      return;
    }

    await onGuardar({
      ...formularioProducto,
      imagen: imagenSeleccionada,
    });
  };

  return (
    <>
      <header className="inventarioEncabezadoAgregar inventarioEncabezadoEditar">
        <h2 className="inventarioTituloAgregar">Modificar producto</h2>
        <button className="inventarioBotonCancelar" type="button" onClick={onCancelar}>
          Cancelar
        </button>
        <UsuarioMenu className="inventarioUsuarioMenu" ariaLabel="Perfil del usuario" />
      </header>

      <section className="inventarioPanel inventarioPanelAgregar">
        <form
          className="inventarioFormularioAgregar"
          onSubmit={(event) => {
            event.preventDefault();
            void guardarCambios();
          }}
        >
          <input
            className="inventarioFormularioInput"
            type="text"
            placeholder="Nombre del producto"
            value={formularioProducto.nombre}
            onChange={(event) => actualizarCampoFormulario('nombre', event.target.value)}
            required
          />
          <input
            className="inventarioFormularioInput"
            type="text"
            placeholder="Referencia/codigo"
            value={formularioProducto.referencia}
            onChange={(event) => actualizarCampoFormulario('referencia', event.target.value)}
            readOnly
          />
          <input
            className="inventarioFormularioInput"
            type="text"
            placeholder="categoria"
            value={formularioProducto.categoria}
            onChange={(event) => actualizarCampoFormulario('categoria', event.target.value)}
          />
          <input
            className="inventarioFormularioInput"
            type="text"
            placeholder="Precio de venta"
            value={formularioProducto.precio}
            onChange={(event) => actualizarCampoFormulario('precio', event.target.value)}
          />
          <input
            className="inventarioFormularioInput"
            type="number"
            min="0"
            placeholder="cantidad en stock"
            value={formularioProducto.cantidad}
            onChange={(event) => actualizarCampoFormulario('cantidad', event.target.value)}
          />

          <div className="inventarioFilaImagen">
            <input
              className="inventarioFormularioInput inventarioFormularioInputDescripcion"
              type="text"
              placeholder="descripcion (opcional)"
              value={formularioProducto.descripcion}
              onChange={(event) => actualizarCampoFormulario('descripcion', event.target.value)}
            />

            <p className="inventarioTextoImagen">Imagen del producto:</p>

            <div className="inventarioCargaImagenContenedor">
              <button
                type="button"
                className="inventarioBotonSubirImagen"
                onClick={() => inputImagenRef.current?.click()}
              >
                Subir imagen
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5-1.7A3.8 3.8 0 0 1 18 17" />
                  <path d="M12 11v8" />
                  <path d="m8.9 13.8 3.1-3.1 3.1 3.1" />
                </svg>
              </button>

              <input
                ref={inputImagenRef}
                type="file"
                accept="image/*"
                className="inventarioInputArchivo"
                onChange={manejarSeleccionImagen}
              />
            </div>
          </div>

          <div className="inventarioAccionesFormulario">
            <button className="inventarioBotonGuardar" type="submit">
              Guardar producto
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

export default ModificarProducto;
