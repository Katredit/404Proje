import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addItem = useCallback((product, store) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.storeId === store.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id && i.storeId === store.id
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { product, storeId: store.id, storeName: store.name, storeFlag: store.flag, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const removeItem = useCallback((productId, storeId) => {
    setItems(prev => prev.filter(i => !(i.product.id === productId && i.storeId === storeId)));
  }, []);

  const updateQty = useCallback((productId, storeId, qty) => {
    if (qty < 1) {
      removeItem(productId, storeId);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.product.id === productId && i.storeId === storeId ? { ...i, qty } : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalCount, totalPrice, cartOpen, setCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
