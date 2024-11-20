import React, { useState } from 'react';
import { Plus, Trash2, Search, Edit2 } from 'lucide-react';
import type { BlacklistEntry } from '../types';
import { BlacklistModal } from './BlacklistModal';
import { BlacklistDeleteModal } from './BlacklistDeleteModal';

interface BlacklistManagerProps {
  entries: BlacklistEntry[];
  onAddEntry: (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  onUpdateEntry: (id: string, entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  onDeleteEntry: (id: string) => void;
}

export function BlacklistManager({ entries, onAddEntry, onUpdateEntry, onDeleteEntry }: BlacklistManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<BlacklistEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<BlacklistEntry | null>(null);

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.inn?.toLowerCase().includes(searchLower) ||
      Object.values(entry.names).some(name => 
        name.toLowerCase().includes(searchLower)
      ) ||
      entry.notes?.toLowerCase().includes(searchLower)
    );
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = (formData: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    if (editingEntry) {
      onUpdateEntry(editingEntry.id, formData);
    } else {
      onAddEntry(formData);
    }
    handleCloseModal();
  };

  const handleEdit = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (entry: BlacklistEntry) => {
    setEntryToDelete(entry);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Blacklist Management</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search blacklist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">INN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Names</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {entry.inn || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">EN: </span>
                      {entry.names.fullNameEn}
                    </div>
                    <div>
                      <span className="font-medium">RU: </span>
                      {entry.names.fullNameRu}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Date(entry.dateAdded).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entry.notes || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit Entry"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(entry)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BlacklistModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingEntry={editingEntry}
      />

      <BlacklistDeleteModal
        entry={entryToDelete!}
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}