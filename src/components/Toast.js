import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md`}
        >
            {icons[type]}
            <span className="flex-1 font-medium">{message}</span>
            <button
                onClick={onClose}
                className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
