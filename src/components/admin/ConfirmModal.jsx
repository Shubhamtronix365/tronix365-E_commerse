import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Are you sure?", 
    message = "This action cannot be undone.", 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "danger" // 'danger' or 'warning' or 'info'
}) => {
    const getTheme = () => {
        switch (type) {
            case 'danger':
                return {
                    iconBg: 'bg-red-500/20',
                    iconColor: 'text-red-500',
                    confirmBg: 'bg-red-500 hover:bg-red-600'
                };
            case 'warning':
                return {
                    iconBg: 'bg-yellow-500/20',
                    iconColor: 'text-yellow-500',
                    confirmBg: 'bg-yellow-500 hover:bg-yellow-600 text-black'
                };
            default:
                return {
                    iconBg: 'bg-violet-500/20',
                    iconColor: 'text-violet-500',
                    confirmBg: 'bg-tronix-primary hover:bg-violet-600'
                };
        }
    };

    const theme = getTheme();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-tronix-card border border-white/10 rounded-2xl w-full max-w-sm p-6 text-center z-10 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className={`mx-auto w-12 h-12 ${theme.iconBg} rounded-full flex items-center justify-center mb-4`}>
                            <AlertTriangle className={theme.iconColor} size={24} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                        <p className="text-gray-400 text-sm mb-6">{message}</p>
                        
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors flex-1"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`px-4 py-2.5 rounded-xl ${theme.confirmBg} text-white text-sm font-bold transition-colors flex-1`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
