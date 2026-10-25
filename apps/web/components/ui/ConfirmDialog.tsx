'use client';

import React, { useState } from 'react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmWord,
  confirmButtonText = 'Confirm Action',
  isDanger = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmWord?: string;
  confirmButtonText?: string;
  isDanger?: boolean;
}) {
  const [typedInput, setTypedInput] = useState('');

  if (!isOpen) return null;

  const canConfirm = !confirmWord || typedInput.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[#232A35] bg-[#0A0D12] p-6 shadow-2xl">
        <h3 className={`text-lg font-bold ${isDanger ? 'text-[#F2495C]' : 'text-[#E8ECF2]'}`}>
          {isDanger && '⚠️ '}
          {title}
        </h3>

        <div className="mt-3 text-sm text-[#9AA6B5] leading-relaxed">
          {description}
        </div>

        {confirmWord && (
          <div className="mt-4">
            <label className="block text-xs font-mono text-[#9AA6B5] mb-1.5">
              Type <strong className="text-[#E8ECF2] font-bold tracking-wider">{confirmWord}</strong> to confirm:
            </label>
            <input
              type="text"
              autoFocus
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={confirmWord}
              className="w-full rounded-lg border border-[#232A35] bg-[#11151C] px-3 py-2 font-mono text-sm uppercase text-[#E8ECF2] focus:border-[#F2495C] focus:outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setTypedInput('');
              onClose();
            }}
            className="rounded-lg border border-[#232A35] bg-[#11151C] px-4 py-2 text-sm font-medium text-[#9AA6B5] hover:text-[#E8ECF2]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              !canConfirm
                ? 'cursor-not-allowed bg-[#232A35] text-[#6B7686]'
                : isDanger
                ? 'bg-[#F2495C] text-white hover:bg-[#F2495C]/90 shadow-lg shadow-[#F2495C]/20'
                : 'bg-[#1FD18A] text-black hover:bg-[#1FD18A]/90'
            }`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
