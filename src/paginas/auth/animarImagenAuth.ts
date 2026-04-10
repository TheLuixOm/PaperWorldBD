type LadoDestino = 'izquierda' | 'derecha';

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function esperar(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), ms);
  });
}

export async function animarImagenAuth(params: {
  contenedor: HTMLElement;
  visual: HTMLElement;
  ladoDestino: LadoDestino;
  duracionMs?: number;
}) {
  const { contenedor, visual, ladoDestino, duracionMs = 420 } = params;

  if (typeof window === 'undefined') {
    return;
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduceMotion) {
    return;
  }

  const origen = visual.getBoundingClientRect();
  const cont = contenedor.getBoundingClientRect();

  if (!origen.width || !origen.height || !cont.width || !cont.height) {
    return;
  }

  const destinoLeft = ladoDestino === 'izquierda' ? cont.left : cont.right - origen.width;
  const destinoTop = cont.top;

  const dx = destinoLeft - origen.left;
  const dy = destinoTop - origen.top;

  const clon = visual.cloneNode(true) as HTMLElement;

  clon.style.position = 'fixed';
  clon.style.left = `${origen.left}px`;
  clon.style.top = `${origen.top}px`;
  clon.style.width = `${origen.width}px`;
  clon.style.height = `${origen.height}px`;
  clon.style.margin = '0';
  clon.style.zIndex = '9999';
  clon.style.pointerEvents = 'none';
  clon.style.transform = 'translate3d(0, 0, 0)';
  clon.style.willChange = 'transform';
  clon.style.transition = `transform ${duracionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;

  const prevOpacity = visual.style.opacity;
  visual.style.opacity = '0';

  document.body.appendChild(clon);

  // fuerza layout
  clon.getBoundingClientRect();

  clon.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;

  let terminado = false;

  const fin = () => {
    if (terminado) {
      return;
    }
    terminado = true;

    clon.remove();
    visual.style.opacity = prevOpacity;
  };

  clon.addEventListener(
    'transitionend',
    (event) => {
      if (event.target === clon) {
        fin();
      }
    },
    { once: true },
  );

  await Promise.race([esperar(duracionMs + 80), new Promise<void>((resolve) => clon.addEventListener('transitionend', () => resolve(), { once: true }))]);

  fin();
}

export async function animarImagenAuthOverlay(params: {
  desde: Rect;
  hasta: Rect;
  imageSrc: string;
  duracionMs?: number;
}) {
  const { desde, hasta, imageSrc, duracionMs = 420 } = params;

  if (typeof window === 'undefined') {
    return;
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduceMotion) {
    return;
  }

  if (!desde.width || !desde.height || !hasta.width || !hasta.height) {
    return;
  }

  const dx = hasta.left - desde.left;
  const dy = hasta.top - desde.top;
  const sx = hasta.width / desde.width;
  const sy = hasta.height / desde.height;

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.left = `${desde.left}px`;
  overlay.style.top = `${desde.top}px`;
  overlay.style.width = `${desde.width}px`;
  overlay.style.height = `${desde.height}px`;
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';
  overlay.style.transformOrigin = 'top left';
  overlay.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
  overlay.style.willChange = 'transform';
  overlay.style.transition = `transform ${duracionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = '';
  img.draggable = false;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  overlay.appendChild(img);

  document.body.appendChild(overlay);

  // fuerza layout
  overlay.getBoundingClientRect();

  overlay.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;

  let terminado = false;

  const fin = () => {
    if (terminado) {
      return;
    }
    terminado = true;
    overlay.remove();
  };

  overlay.addEventListener(
    'transitionend',
    (event) => {
      if (event.target === overlay) {
        fin();
      }
    },
    { once: true },
  );

  await Promise.race([esperar(duracionMs + 80), new Promise<void>((resolve) => overlay.addEventListener('transitionend', () => resolve(), { once: true }))]);
  fin();
}
