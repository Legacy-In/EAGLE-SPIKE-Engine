'use client';

import React, { useEffect } from 'react';

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      {/* Backdrop click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content */}
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-[#232A35] bg-[#0A0D12] p-5 shadow-2xl transition-transform md:max-w-xl md:mx-auto md:rounded-b-2xl md:border-b">
        {/* Grab Handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#232A35]" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-[#232A35] pb-3">
          <div className="text-base font-bold text-[#E8ECF2]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#232A35] bg-[#11151C] text-sm text-[#9AA6B5] hover:text-[#E8ECF2]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
