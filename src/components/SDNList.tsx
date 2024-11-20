import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search } from 'lucide-react';
import stringSimilarity from 'string-similarity';

interface SDNEntry {
  uid: string;
  name: string;
  type: string;
  date_of_birth?: string;
  ids?: { id_type: string; id_number: string }[];
  programs?: string[];
  remarks?: string;
}

const ENTRIES_PER_PAGE = 15;
const FULL_NAME_THRESHOLD = 0.75;
const PARTIAL_NAME_THRESHOLD = 0.45;

export function SDNList({ isDark }: { isDark: boolean }) {
  const [entries, setEntries] = useState<SDNEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SDNEntry | null>(null);

  useEffect(() => {
    fetchSDNList();
  }, []);

  const fetchSDNList = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/api/sdn-list');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching SDN list:', error);
    }
  };

  const updateSDNList = () => {
    setIsUpdating(true);
    axios.post('http://127.0.0.1:5000/api/update-sdn-list')
      .then((response) => {
        console.log(response.data.status);
        fetchSDNList();  // Re-fetch the updated SDN list
      })
      .catch((error) => {
        console.error('Error updating SDN list:', error);
      })
      .finally(() => setIsUpdating(false));
  };
  

  const normalizeText = (text: string) => text.toLowerCase().trim();

  const enhancedMatch = (name: string, query: string) => {
    const normalizedQuery = normalizeText(query);
    const normalizedName = normalizeText(name);

    const fullNameSimilarity = stringSimilarity.compareTwoStrings(normalizedName, normalizedQuery);
    if (fullNameSimilarity >= FULL_NAME_THRESHOLD) return true;

    const nameTokens = normalizedName.split(/\s+/);
    const queryTokens = normalizedQuery.split(/\s+/);

    return queryTokens.every(queryToken =>
      nameTokens.some(nameToken => stringSimilarity.compareTwoStrings(nameToken, queryToken) >= PARTIAL_NAME_THRESHOLD)
    );
  };

  const filteredEntries = searchQuery
    ? entries.filter((entry) => enhancedMatch(entry.name, searchQuery))
    : entries;

  const totalPages = Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE);
  const currentEntries = filteredEntries.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );

  const renderDetailsModal = () => {
    if (!selectedEntry) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEntry.name}</h3>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4">
            <p><strong>Date of Birth:</strong> {selectedEntry.date_of_birth || ''}</p>
            <p><strong>Program:</strong> {selectedEntry.programs?.join(', ') || ''}</p>
            <p><strong>Remarks:</strong> {selectedEntry.remarks || ''}</p>
            <p><strong>IDs:</strong></p>
            <ul>
              {selectedEntry.ids?.map((id, index) => (
                <li key={index}>{id.id_type}: {id.id_number}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setSelectedEntry(null)}
            className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">SDN List</h2>
        <button
          onClick={updateSDNList}
          disabled={isUpdating}
          className={`h-10 px-4 rounded-lg ${isUpdating ? "bg-gray-500" : "bg-green-600 hover:bg-green-500"} text-white`}
        >
          {isUpdating ? "Updating..." : "Update List"}
        </button>
      </div>
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search SDN List..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="absolute left-3 top-2.5 w-5 h-5 text-gray-400">
            <Search />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Program</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Remarks</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentEntries.length > 0 ? (
              currentEntries.map((entry, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{entry.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{entry.uid}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{entry.programs?.join(', ') || ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{entry.remarks || ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">No entries found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {renderDetailsModal()}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:bg-gray-600"
        >
          Previous
        </button>
        <span className="text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:bg-gray-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default SDNList;
