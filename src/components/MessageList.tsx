import React, { useState, useEffect } from 'react';
import type { SwiftMessage } from '../types';
import { Eye, Trash2 } from 'lucide-react';
import { OfacChecker } from '../utils/ofacChecker';

interface MessageListProps {
  messages: SwiftMessage[];
  onViewMessage: (id: string) => void;
  onDeleteMessage: (id: string) => void;
}

export function MessageList({ messages, onViewMessage, onDeleteMessage }: MessageListProps) {
  useEffect(() => {
    // Initialize OFAC checker when component mounts
    OfacChecker.initialize();
  }, []);

  const handleMessageCheck = async (senderName: string) => {
    const result = OfacChecker.checkName(senderName);
    
    if (result.isMatch) {
      // Show warning or handle matched name
      alert(`WARNING: Sender name matches OFAC SDN list entry (${result.matchScore * 100}% match)\nMatched name: ${result.matchedName}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {messages.map((message) => (
              <tr key={message.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.transactionRef}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.sender.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.receiver.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${message.status === 'clear' ? 'bg-green-100 text-green-800' : 
                      message.status === 'flagged' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {message.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onViewMessage(message.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteMessage(message.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Message"
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
    </div>
  );
}