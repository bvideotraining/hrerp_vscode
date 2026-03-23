'use client';

import React from 'react';
import { Toast } from '@/hooks/use-toast';
import { X, CheckCircle, AlertCircle, InfoIcon, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const toastColors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    text: 'text-green-900'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    text: 'text-red-900'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    text: 'text-yellow-900'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <InfoIcon className="h-5 w-5 text-blue-600" />,
    text: 'text-blue-900'
  }
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        const colors = toastColors[toast.type];
        return (
          <div
            key={toast.id}
            className={`${colors.bg} ${colors.border} border rounded-lg p-4 shadow-lg flex items-start gap-3 pointer-events-auto max-w-sm animate-in fade-in slide-in-from-top-2 duration-200`}
          >
            <div className="flex-shrink-0 mt-0.5">{colors.icon}</div>
            <div className="flex-1">
              <p className={`${colors.text} text-sm font-medium`}>{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className={`flex-shrink-0 ${colors.text} hover:opacity-75 transition-opacity`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
