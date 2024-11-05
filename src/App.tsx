import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  Upload as UploadIcon,
} from 'lucide-react';
import axios from 'axios';
import { DashboardCard } from './components/DashboardCard';
import { MessageList } from './components/MessageList';
import { UploadModal } from './components/UploadModal';
import { MessageDetailsModal } from './components/MessageDetailsModal';
import type { SwiftMessage } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

const STORAGE_KEY = 'swift_messages';

const loadMessages = (): SwiftMessage[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : mockMessages;
};

const mockMessages: SwiftMessage[] = [
  {
    id: '1',
    transactionRef: '+SHB15810252024',
    date: '2024-10-25',
    type: 'CRED',
    currency: 'RUB',
    amount: '1537679.72',
    notes: 'Initial transaction review completed',
    sender: {
      account: '22614643300956011001',
      inn: '305937815',
      name: "OOO 'MEGA PLAST'",
      address: 'TOSHKENT SH 1PR QAMARNISO 24 UY, UZ/TOSHKENT',
      bankCode: 'INIPUZ21SHB',
      sdnStatus: 'clear',
      ownership: [
        { owner: 'John Smith', percentage: 60 },
        { owner: 'Jane Doe', percentage: 40 },
      ],
      registrationDoc: 'megaplast_reg.pdf',
    },
    receiver: {
      account: '40702810000000020089',
      transitAccount: '30101810200000000700',
      bankCode: 'RU044525700',
      bankName: 'AO RAiFFAiZENBANK',
      name: 'OOO SINIKON',
      inn: '7710200649',
      kpp: '775101001',
      sdnStatus: 'pending',
      ownership: [{ owner: 'Robert Johnson', percentage: 100 }],
      registrationDoc: 'sinikon_reg.pdf',
    },
    purpose:
      '(VO10100) PREDOPLATA ZA POLIPROPILENOVYE TRUBY I FITINGI, PO KONTRAKTU 002/22-100/00-C OT 03.03.2022 BEZ NDS',
    fees: 'OUR',
    status: 'clear',
  },
];

export default function App() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SwiftMessage | null>(null);
  const [messages, setMessages] = useState<SwiftMessage[]>(loadMessages);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleUpload = async (messageText: string, comments: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/process-swift', {
        message: messageText,
      });

      const { data } = response;
      
      const newMessage: SwiftMessage = {
        id: crypto.randomUUID(),
        transactionRef: data.transaction_reference || '',
        type: data.transaction_type || '',
        date: data.transaction_date || '',
        currency: (data.transaction_currency || '').split(' ')[0],
        amount: (data.transaction_currency || '').split(' ')[1] || '',
        notes: comments,
        sender: {
          account: data.sender_account || '',
          inn: data.sender_inn || '',
          name: data.sender_name || '',
          address: data.sender_address || '',
          bankCode: data.sender_bank_code || '',
          sdnStatus: 'pending',
          company_details: data.company_info || {},
        },
        receiver: {
          account: data.receiver_account || '',
          transitAccount: data.receiver_transit_account || '',
          bankCode: data.receiver_bank_code || '',
          bankName: data.receiver_bank_name || '',
          name: data.receiver_name || '',
          inn: data.receiver_inn || '',
          kpp: data.receiver_kpp || '',
          sdnStatus: 'pending',
          CEO: data.receiver_info?.CEO || '',
          Founders: data.receiver_info?.Founders || [],
        },
        purpose: data.transaction_purpose || '',
        fees: data.transaction_fees || '',
        status: 'processing',
      };

      setMessages((prev) => [...prev, newMessage]);

      // Simulate SDN check after 2 seconds
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id
              ? { ...msg, status: Math.random() > 0.8 ? 'flagged' : 'clear' }
              : msg
          )
        );
      }, 200);
    } catch (error) {
      console.error('Error processing SWIFT message:', error);
      alert(
        'Error processing SWIFT message. Please check the format and try again.'
      );
      throw error;
    }
  };

  const handleViewMessage = (id: string) => {
    const message = messages.find((m) => m.id === id);
    if (message) {
      setSelectedMessage(message);
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }
  };

  const handleStatusChange = (id: string, status: SwiftMessage['status']) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status } : msg))
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, notes } : msg))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            title="Total Messages"
            value={messages.length}
            icon={MessageSquare}
          />
          <DashboardCard
            title="Flagged Messages"
            value={messages.filter((m) => m.status === 'flagged').length}
            icon={AlertTriangle}
          />
          <DashboardCard
            title="Processing"
            value={messages.filter((m) => m.status === 'processing').length}
            icon={Clock}
          />
        </div>

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055]"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            New Message
          </button>
        </div>

        <MessageList
          messages={messages}
          onViewMessage={handleViewMessage}
          onDeleteMessage={handleDeleteMessage}
        />

        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleUpload}
        />

        {selectedMessage && (
          <MessageDetailsModal
            message={selectedMessage}
            isOpen={!!selectedMessage}
            onClose={() => setSelectedMessage(null)}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}