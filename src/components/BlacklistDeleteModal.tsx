import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { BlacklistEntry } from '../types';

interface BlacklistDeleteModalProps {
  entry: BlacklistEntry;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BlacklistDeleteModal({
  entry,
  isOpen,
  onClose,
  onConfirm
}: BlacklistDeleteModalProps) {
  if (!isOpen) return null;

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
              Please confirm deletion of this blacklist entry:
            </p>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                {entry.inn && (
                  <>
                    <div className="text-gray-500 dark:text-gray-400">INN:</div>
                    <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                      {entry.inn}
                    </div>
                  </>
                )}

                <div className="text-gray-500 dark:text-gray-400">English Name:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {entry.names.fullNameEn}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Russian Name:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {entry.names.fullNameRu}
                </div>

                <div className="text-gray-500 dark:text-gray-400">Date Added:</div>
                <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                  {new Date(entry.dateAdded).toLocaleDateString()}
                </div>

                {entry.notes && (
                  <>
                    <div className="text-gray-500 dark:text-gray-400">Notes:</div>
                    <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                      {entry.notes}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ This action cannot be undone. The entry will be permanently removed from the blacklist.
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
              Delete Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}