import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

export type CartProductInput = {
  id: string;
  nombre: string;
  precio: number;
  imagen: string;
  categoria?: string;
};

export type CartItem = CartProductInput & {
  cantidad: number;
};

type CartState = {
  items: CartItem[];
};

type CartAction =
  | { type: 'ADD'; product: CartProductInput; cantidad: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_QTY'; id: string; cantidad: number }
  | { type: 'CLEAR' }
  | { type: 'REPLACE_ALL'; state: CartState };

const STORAGE_KEY = 'paperworld.cart.v1';

function normalizarCantidad(valor: number) {
  if (!Number.isFinite(valor)) {
    return 1;
  }
  return Math.max(1, Math.round(valor));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === 'REPLACE_ALL') {
    return action.state;
  }

  if (action.type === 'CLEAR') {
    return { items: [] };
  }

  if (action.type === 'REMOVE') {
    return { items: state.items.filter((i) => i.id !== action.id) };
  }

  if (action.type === 'SET_QTY') {
    const cantidad = normalizarCantidad(action.cantidad);
    return {
      items: state.items.map((i) => (i.id === action.id ? { ...i, cantidad } : i)),
    };
  }

  if (action.type === 'ADD') {
    const cantidad = normalizarCantidad(action.cantidad);
    const existente = state.items.find((i) => i.id === action.product.id);
    if (existente) {
      return {
        items: state.items.map((i) =>
          i.id === action.product.id ? { ...i, cantidad: i.cantidad + cantidad } : i,
        ),
      };
    }

    return {
      items: [...state.items, { ...action.product, cantidad }],
    };
  }

  return state;
}

function cargarDesdeStorage(): CartState {
  if (typeof window === 'undefined') {
    return { items: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { items: [] };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { items: [] };
    }

    const items = (parsed as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return { items: [] };
    }

    const sane: CartItem[] = [];
    for (const it of items) {
      if (!it || typeof it !== 'object') {
        continue;
      }

      const obj = it as Partial<CartItem>;
      if (typeof obj.id !== 'string' || typeof obj.nombre !== 'string' || typeof obj.imagen !== 'string') {
        continue;
      }

      const precio = typeof obj.precio === 'number' && Number.isFinite(obj.precio) ? obj.precio : 0;
      const cantidad = normalizarCantidad(typeof obj.cantidad === 'number' ? obj.cantidad : 1);
      const categoria = typeof obj.categoria === 'string' ? obj.categoria : undefined;

      sane.push({
        id: obj.id,
        nombre: obj.nombre,
        imagen: obj.imagen,
        precio,
        cantidad,
        categoria,
      });
    }

    return { items: sane };
  } catch {
    return { items: [] };
  }
}

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: CartProductInput, cantidad?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, cantidad: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, cargarDesdeStorage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = state.items.reduce((acc, it) => acc + it.cantidad, 0);
    const totalPrice = state.items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

    return {
      items: state.items,
      totalItems,
      totalPrice,
      addItem: (product, cantidad = 1) => {
        dispatch({ type: 'ADD', product, cantidad });
      },
      removeItem: (id) => {
        dispatch({ type: 'REMOVE', id });
      },
      setQuantity: (id, cantidad) => {
        dispatch({ type: 'SET_QTY', id, cantidad });
      },
      clear: () => {
        dispatch({ type: 'CLEAR' });
      },
    };
  }, [state.items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de <CartProvider />');
  }
  return ctx;
}
