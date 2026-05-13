import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../../hooks/useToast';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center pointer-events-none space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let bgColor = 'bg-[#0F1117]/95 border-white/10';
          let textColor = 'text-white';
          
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            bgColor = 'bg-emerald-500/10 border-emerald-500/20';
            textColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            bgColor = 'bg-rose-500/10 border-rose-500/20';
            textColor = 'text-rose-400';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`pointer-events-auto flex items-center space-x-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${bgColor}`}
            >
              <Icon className={`w-5 h-5 ${textColor}`} />
              <span className="font-semibold text-sm text-gray-100">{toast.message}</span>
              <button 
                onClick={() => removeToast(toast.id)}
                className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
