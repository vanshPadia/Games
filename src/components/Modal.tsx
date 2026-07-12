/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
}: ModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    danger: {
      accent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      button: 'bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-500/50',
      icon: <AlertOctagon className="w-5 h-5 text-rose-400" />
    },
    warning: {
      accent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      button: 'bg-amber-500 hover:bg-amber-600 text-slate-950 focus:ring-amber-500/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
    },
    success: {
      accent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      button: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 focus:ring-emerald-500/50',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    },
    info: {
      accent: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      button: 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500/50',
      icon: <Info className="w-5 h-5 text-sky-400" />
    },
  };

  const style = colorStyles[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all animate-fade-in" id="custom-modal-backdrop">
      <div className="bg-[#111625] w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-4 font-sans text-slate-100" id="custom-modal-container">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${style.accent}`}>
              {style.icon}
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{message}</p>

        {/* Footer actions */}
        <div className="flex justify-end gap-2.5 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all border border-slate-700/40 cursor-pointer"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer ${style.button}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
