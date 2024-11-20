import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { SwiftMessage } from '../types';

interface DeleteConfirmationModalProps {
  message: SwiftMessage;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  message,
  isOpen,
  onClose,
  onConfirm
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const formatAmount = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount)) + ' ' + currency;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl transform transition-all">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Deletion
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Please confirm deletion of this SWIFT message:
            </p>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Reference:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {message.transactionRef}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Date:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {message.date}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Amount:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {formatAmount(message.amount, message.currency)}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Sender:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {message.sender.name}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Receiver:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {message.receiver.name}
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ This action cannot be undone. The message will be permanently deleted.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-500 transition-colors"
            >
              Delete Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}