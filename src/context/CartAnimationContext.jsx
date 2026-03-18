import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

const CartAnimationContext = createContext();

export const useCartAnimation = () => useContext(CartAnimationContext);

export const CartAnimationProvider = ({ children }) => {
    const [animations, setAnimations] = useState([]);

    const animateToCart = useCallback((startRect) => {
        const id = Date.now();
        const cartIcon = document.getElementById('navbar-cart-icon');
        if (!cartIcon) return;

        const cartRect = cartIcon.getBoundingClientRect();
        
        const newAnimation = {
            id,
            startX: startRect.left + startRect.width / 2,
            startY: startRect.top + startRect.height / 2,
            endX: cartRect.left + cartRect.width / 2,
            endY: cartRect.top + cartRect.height / 2
        };

        setAnimations(prev => [...prev, newAnimation]);

        // Cleanup after animation completes
        setTimeout(() => {
            setAnimations(prev => prev.filter(anim => anim.id !== id));
        }, 1000);
    }, []);

    return (
        <CartAnimationContext.Provider value={{ animateToCart }}>
            {children}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                <AnimatePresence>
                    {animations.map(anim => (
                        <motion.div
                            key={anim.id}
                            initial={{ 
                                x: anim.startX - 12, 
                                y: anim.startY - 12, 
                                scale: 1, 
                                opacity: 1 
                            }}
                            animate={{ 
                                x: anim.endX - 12, 
                                y: anim.endY - 12, 
                                scale: 0.5, 
                                opacity: 0 
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                                duration: 0.8, 
                                ease: [0.4, 0, 0.2, 1] 
                            }}
                            className="fixed flex items-center justify-center w-6 h-6 bg-tronix-primary text-white rounded-full shadow-lg shadow-tronix-primary/50"
                        >
                            <ShoppingCart size={12} fill="white" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </CartAnimationContext.Provider>
    );
};
