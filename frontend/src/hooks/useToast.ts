import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  
  return {
    toast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      addToast({ message, type });
    }
  };
}
