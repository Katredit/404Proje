import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product, store) => {
    setItems(prev => {
      const existing = prev.find(
        item => item.product.id === product.id && item.store.id === store.id
      );
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.store.id === store.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, store, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId, storeId) => {
    setItems(prev =>
      prev.filter(item => !(item.product.id === productId && item.store.id === storeId))
    );
  }, []);

  const updateQuantity = useCallback((productId, storeId, delta) => {
    setItems(prev =>
      prev
        .map(item => {
          if (item.product.id === productId && item.store.id === storeId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        totalCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
