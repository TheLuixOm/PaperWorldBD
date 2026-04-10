import { useCallback, useEffect, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../carrito/CarritoContext';
import './ProductoExpandidoPc.css';

const CIERRE_MS = 180;

export type ProductoExpandidoPcData = {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen: string;
  codigo?: string;
  stock?: number;
  categoria?: string;
  precioDetalle?: number;
};

type Props = {
  abierto: boolean;
  producto: ProductoExpandidoPcData | null;
  alCerrar: () => void;
};

export default function ProductoExpandidoPc({ abierto, producto, alCerrar }: Props) {
  const { addItem } = useCart();
  const [estadoAnimacion, setEstadoAnimacion] = useState<'opening' | 'open' | 'closing'>('opening');
  const cierreTimeoutRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  const cerrarConAnimacion = useCallback(() => {
    setEstadoAnimacion((prev) => (prev === 'closing' ? prev : 'closing'));

    if (cierreTimeoutRef.current != null) {
      window.clearTimeout(cierreTimeoutRef.current);
    }

    cierreTimeoutRef.current = window.setTimeout(() => {
      alCerrar();
    }, CIERRE_MS);
  }, [alCerrar]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    setEstadoAnimacion('opening');
    const raf = window.requestAnimationFrame(() => {
      setEstadoAnimacion('open');
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrarConAnimacion();
      }
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      if (path.includes(modal)) {
        return;
      }

      cerrarConAnimacion();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDownCapture, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDownCapture, true);

      if (cierreTimeoutRef.current != null) {
        window.clearTimeout(cierreTimeoutRef.current);
      }
    };
  }, [abierto, cerrarConAnimacion]);

  if (!abierto || !producto) {
    return null;
  }

  const codigo = producto.codigo ?? producto.id;
  const stockLabel = typeof producto.stock === 'number' ? String(producto.stock) : '—';
  const categoria = producto.categoria ?? '—';
  const descripcion = producto.descripcion?.trim() ? producto.descripcion : 'Sin descripción.';

  return (
    <div
      className="productoExpandidoPcOverlay"
      data-state={estadoAnimacion}
      role="presentation"
    >
      <section
        className="productoExpandidoPcModal"
        data-state={estadoAnimacion}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del producto"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="productoExpandidoPcGrid">
          <div className="productoExpandidoPcIzq">
            <div className="productoExpandidoPcImagen" aria-label="Imagen del producto">
              <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
            </div>

            <div className="productoExpandidoPcInfo">
              <p className="productoExpandidoPcCodigo">CÓDIGO: {codigo}</p>
              <p className="productoExpandidoPcNombre">{producto.nombre}</p>
              <button type="button" className="productoExpandidoPcReadMore" onClick={(e) => e.preventDefault()}>
                Leer más
              </button>
              <p className="productoExpandidoPcPrecio">USD {producto.precio.toFixed(2)}</p>
            </div>
          </div>

          <div className="productoExpandidoPcDer">
            <h2 className="productoExpandidoPcTitulo">Detalles de Producto</h2>

            <div className="productoExpandidoPcDetalles">
              <div className="productoExpandidoPcDetalle">
                <p className="productoExpandidoPcDetalleLabel">Stock</p>
                <p className="productoExpandidoPcDetalleValor">{stockLabel}</p>
              </div>
              <div className="productoExpandidoPcDetalle">
                <p className="productoExpandidoPcDetalleLabel">Código</p>
                <p className="productoExpandidoPcDetalleValor">{codigo}</p>
              </div>
              <div className="productoExpandidoPcDetalle">
                <p className="productoExpandidoPcDetalleLabel">Precio</p>
                <p className="productoExpandidoPcDetalleValor">USD {producto.precio.toFixed(2)}</p>
              </div>
              <div className="productoExpandidoPcDetalle">
                <p className="productoExpandidoPcDetalleLabel">Categoría</p>
                <p className="productoExpandidoPcDetalleValor">{categoria}</p>
              </div>
              <div className="productoExpandidoPcDetalle productoExpandidoPcDetalleFull">
                <p className="productoExpandidoPcDetalleLabel">Descripción</p>
                <p className="productoExpandidoPcDetalleValor">{descripcion}</p>
              </div>
            </div>

            <div className="productoExpandidoPcAcciones">
              <button type="button" className="productoExpandidoPcCancelar" onClick={cerrarConAnimacion}>
                Cancelar
              </button>
              <button
                type="button"
                className="productoExpandidoPcAgregar"
                onClick={() => {
                  addItem({
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    imagen: producto.imagen,
                    categoria: producto.categoria,
                  });
                  cerrarConAnimacion();
                }}
              >
                <span className="productoExpandidoPcAgregarIcono" aria-hidden="true">
                  <ShoppingCart />
                </span>
                <span>Añadir al carrito</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
