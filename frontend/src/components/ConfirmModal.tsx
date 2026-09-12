import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-arena-red" />,
      badgeBg: 'bg-arena-red/10 border-arena-red/20',
      btnClass: 'btn-danger',
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-arena-yellow" />,
      badgeBg: 'bg-arena-yellow/10 border-arena-yellow/20',
      btnClass: 'px-4 py-2 bg-arena-yellow/20 hover:bg-arena-yellow/30 text-arena-yellow border border-arena-yellow/30 text-sm font-medium rounded-lg transition-all',
    },
    info: {
      icon: <Info className="w-6 h-6 text-arena-blue" />,
      badgeBg: 'bg-arena-blue/10 border-arena-blue/20',
      btnClass: 'btn-primary',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-arena-surface border border-arena-border rounded-xl max-w-md w-full p-6 shadow-2xl animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-arena-muted hover:text-arena-text transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border flex-shrink-0 ${iconConfig.badgeBg}`}>
            {iconConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-arena-text mb-1">{title}</h3>
            <p className="text-sm text-arena-text-dim leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-arena-border/50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm py-2 px-4"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`${iconConfig.btnClass} py-2 px-4`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
