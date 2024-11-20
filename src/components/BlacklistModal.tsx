import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { BlacklistEntry } from '../types';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  editingEntry?: BlacklistEntry | null;
}

const emptyForm = {
  inn: '',
  names: {
    fullNameEn: '',
    fullNameRu: '',
    shortNameEn: '',
    shortNameRu: '',
    abbreviationEn: '',
    abbreviationRu: '',
  },
  notes: '',
};

export function BlacklistModal({ isOpen, onClose, onSave, editingEntry }: BlacklistModalProps) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        inn: editingEntry.inn || '',
        names: { ...editingEntry.names },
        notes: editingEntry.notes || '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(emptyForm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingEntry ? 'Edit Blacklist Entry' : 'Add to Blacklist'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                INN (Optional)
              </label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter INN"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">English Names</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Full Name</label>
                    <input
                      type="text"
                      value={formData.names.fullNameEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, fullNameEn: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Short Name</label>
                    <input
                      type="text"
                      value={formData.names.shortNameEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, shortNameEn: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Abbreviation</label>
                    <input
                      type="text"
                      value={formData.names.abbreviationEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, abbreviationEn: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Russian Names</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Full Name</label>
                    <input
                      type="text"
                      value={formData.names.fullNameRu}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, fullNameRu: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Short Name</label>
                    <input
                      type="text"
                      value={formData.names.shortNameRu}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, shortNameRu: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Abbreviation</label>
                    <input
                      type="text"
                      value={formData.names.abbreviationRu}
                      onChange={(e) => setFormData({
                        ...formData,
                        names: { ...formData.names, abbreviationRu: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Add any notes about this entity..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] transition-colors"
              >
                {editingEntry ? 'Save Changes' : 'Add to Blacklist'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}