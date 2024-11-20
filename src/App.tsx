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
import { BlacklistManager } from './components/BlacklistManager';
import { Reports } from './components/Reports';
import { DashboardFilters } from './components/DashboardFilters';
import type { SwiftMessage, BlacklistEntry, NameCheckResult } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useDarkMode } from './hooks/useDarkMode';
import { OfacChecker } from './utils/ofacChecker';
import { SDNList } from './components/SDNList';
import { SDNStatus } from './types';
import EntitySearch from './components/EntitySearch'; 

const STORAGE_KEY = 'swift_messages';
const BLACKLIST_STORAGE_KEY = 'blacklist_entries';

const checkAllFields = async (message: SwiftMessage): Promise<Record<string, NameCheckResult>> => {
  const results: Record<string, NameCheckResult> = {};

  // Check sender fields
  if (message.sender.name) {
    const checkResult = await OfacChecker.checkName(message.sender.name);
    results['sender_name'] = { ...checkResult, name: message.sender.name };
  }

  // Check CEO in sender's company details
  if (message.sender.company_details?.CEO) {
    const checkResult = await OfacChecker.checkName(message.sender.company_details.CEO);
    results['sender_ceo'] = { ...checkResult, name: message.sender.company_details.CEO };
  }

  // Check Founders in sender's company details
  if (message.sender.company_details?.Founders) {
    await Promise.all(
      message.sender.company_details.Founders.map(async (founder, index) => {
        if (founder.owner) {
          const checkResult = await OfacChecker.checkName(founder.owner);
          results[`sender_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
        }
      })
    );
  }

  // Check receiver fields
  if (message.receiver.name) {
    const checkResult = await OfacChecker.checkName(message.receiver.name);
    results['receiver_name'] = { ...checkResult, name: message.receiver.name };
  }

  // Check CEO in receiver's company details
  if (message.receiver.CEO) {
    const checkResult = await OfacChecker.checkName(message.receiver.CEO);
    results['receiver_ceo'] = { ...checkResult, name: message.receiver.CEO };
  }

  // Check Founders in receiver's company details
  if (message.receiver.Founders) {
    await Promise.all(
      message.receiver.Founders.map(async (founder, index) => {
        if (founder.owner) {
          const checkResult = await OfacChecker.checkName(founder.owner);
          results[`receiver_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
        }
      })
    );
  }

  // Check receiver bank name
  if (message.receiver.bankName) {
    const checkResult = await OfacChecker.checkName(message.receiver.bankName);
    results['receiver_bank'] = { ...checkResult, name: message.receiver.bankName };
  }

  return results;
};

const loadMessages = (): (SwiftMessage & { manuallyUpdated?: boolean })[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

const loadBlacklist = (): BlacklistEntry[] => {
  const saved = localStorage.getItem(BLACKLIST_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export default function App() {
  const [isDark, setIsDark] = useDarkMode();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'entity-search' | 'blacklist' | 'sdn-list' | 'reports'>('dashboard');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SwiftMessage | null>(null);
  const [messages, setMessages] = useState<(SwiftMessage & { manuallyUpdated?: boolean })[]>(loadMessages);
  const [filteredMessages, setFilteredMessages] = useState<SwiftMessage[]>(messages);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>(loadBlacklist);
  const [messageChecks, setMessageChecks] = useState<Record<string, Record<string, NameCheckResult>>>({});
  const [isOfacInitialized, setIsOfacInitialized] = useState(false);

  useEffect(() => {
    const initializeOfacChecker = async () => {
      try {
        await OfacChecker.initialize();
        setIsOfacInitialized(true);
        console.log('OFAC Checker initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize OFAC Checker:', error);
      }
    };
    initializeOfacChecker();
  }, []);

  interface ParsedSwiftFile {
    transaction_reference: string;
    transaction_type: string;
    transaction_date: string;
    transaction_currency: string;
    transaction_amount: string;
    transaction_purpose: string;
    sender_account: string;
    sender_inn?: string | null;
    sender_name: string;
    sender_address: string;
    sender_bank_code: string;
    receiver_account: string;
    receiver_transit_account: string | null;
    receiver_bank_code: string | null;
    receiver_bank_name: string | null;
    receiver_name: string;
    receiver_inn?: string | null;
    receiver_kpp: string;
    transaction_fees: string;
    company_info?: {
      CEO?: string;
      Founders?: {
        isCompany: boolean;
        owner: string;
        percentage: number | null;
      }[];
    };
    receiver_info?: {
      CEO?: string;
      Founders?: {
        isCompany: boolean;
        owner: string;
        percentage: number;
        companyDetails?: {
          CEO?: string;
          Founders?: {
            isCompany: boolean;
            owner: string;
            percentage: number;
          }[];
          inn?: string;
          registrationDate: string | null;
        };
      }[];
    };
  }
  
  useEffect(() => {
    const fetchParsedFiles = async () => {
      try {
        const response = await axios.get<Record<string, ParsedSwiftFile>>(
          'http://localhost:3001/api/parsed-swift-files'
        );
        const parsedFiles = response.data;
    
        const loadedMessages = Object.entries(parsedFiles).map(([key, data]) => ({
          id: key,
          transactionRef: data.transaction_reference,
          type: data.transaction_type,
          date: data.transaction_date,
          currency: data.transaction_currency,
          amount: data.transaction_amount,
          notes: data.transaction_purpose,
          sender: {
            account: data.sender_account,
            inn: data.sender_inn || '',
            name: data.sender_name,
            address: data.sender_address,
            bankCode: data.sender_bank_code,
            sdnStatus: 'pending' as SDNStatus, // Ensure 'sdnStatus' uses SdnStatusType
            company_details: data.company_info
              ? {
                  CEO: data.company_info.CEO,
                  Founders: data.company_info.Founders?.map(founder => ({
                    owner: founder.owner,
                    percentage: founder.percentage ?? undefined,
                    companyDetails: founder.companyDetails
                      ? {
                          CEO: founder.companyDetails.CEO,
                          Founders: founder.companyDetails.Founders || [],
                          inn: founder.companyDetails.inn,
                          registrationDate: founder.companyDetails.registrationDate ?? undefined,
                        }
                      : undefined,
                  })),
                }
              : undefined,
          },
          receiver: {
            account: data.receiver_account,
            transitAccount: data.receiver_transit_account || '',
            bankCode: data.receiver_bank_code || '',
            bankName: data.receiver_bank_name || '',
            name: data.receiver_name,
            inn: data.receiver_inn || '',
            kpp: data.receiver_kpp,
            sdnStatus: 'pending' as SDNStatus,
            CEO: data.receiver_info?.CEO || '',
            Founders: data.receiver_info?.Founders?.map(founder => ({
              owner: founder.owner,
              percentage: founder.percentage ?? undefined,
              isCompany: founder.isCompany,
              companyDetails: founder.companyDetails
                ? {
                    CEO: founder.companyDetails.CEO,
                    Founders: founder.companyDetails.Founders || [],
                    inn: founder.companyDetails.inn,
                    registrationDate: founder.companyDetails.registrationDate ?? undefined,
                  }
                : undefined,
            })) || [],
          },
          purpose: data.transaction_purpose,
          fees: data.transaction_fees,
          status: 'processing' as SwiftMessage['status'],
          manuallyUpdated: false,
        }));
    
        setMessages(loadedMessages);
        setFilteredMessages(loadedMessages);
      } catch (error) {
        console.error('Error fetching parsed SWIFT files:', error);
      }
    };
  
    fetchParsedFiles();
  }, []);  

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    setFilteredMessages(messages);
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklist));
  }, [blacklist]);

  const handleFilterChange = (filters: any) => {
    const filtered = messages.filter(message => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch = 
          message.sender.name.toLowerCase().includes(searchLower) ||
          message.receiver.name.toLowerCase().includes(searchLower) ||
          message.sender.bankCode?.toLowerCase().includes(searchLower) ||
          message.receiver.bankCode?.toLowerCase().includes(searchLower) ||
          message.receiver.bankName?.toLowerCase().includes(searchLower) ||
          message.transactionRef.toLowerCase().includes(searchLower);

        if (!searchMatch) return false;
      }

      if (filters.senderName && !message.sender.name.toLowerCase().includes(filters.senderName.toLowerCase())) {
        return false;
      }

      if (filters.receiverName && !message.receiver.name.toLowerCase().includes(filters.receiverName.toLowerCase())) {
        return false;
      }

      if (filters.dateFrom && new Date(message.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(message.date) > new Date(filters.dateTo)) return false;

      const amount = parseFloat(message.amount);
      if (filters.amountFrom && amount < parseFloat(filters.amountFrom)) return false;
      if (filters.amountTo && amount > parseFloat(filters.amountTo)) return false;

      if (filters.reference && !message.transactionRef.toLowerCase().includes(filters.reference.toLowerCase())) {
        return false;
      }

      if (filters.bankName) {
        const bankNameLower = filters.bankName.toLowerCase();
        const bankMatch = 
          message.receiver.bankName?.toLowerCase().includes(bankNameLower) ||
          message.sender.bankCode?.toLowerCase().includes(bankNameLower) ||
          message.receiver.bankCode?.toLowerCase().includes(bankNameLower);

        if (!bankMatch) return false;
      }

      if (filters.status && message.status !== filters.status) return false;

      return true;
    });

    setFilteredMessages(filtered);
  };

  const handleViewMessage = async (id: string) => {
    const message = messages.find(m => m.id === id);
    if (message && isOfacInitialized) {
      if (!messageChecks[id]) {
        const checks = await checkAllFields(message);
        setMessageChecks(prev => ({
          ...prev,
          [id]: checks
        }));
      }
      setSelectedMessage(message);
    }
  };

  const handleStoreChecks = (messageId: string, checks: Record<string, NameCheckResult>) => {
    setMessageChecks(prev => ({
      ...prev,
      [messageId]: checks
    }));
  };

  const handleUpload = async (messageText: string, comments: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/process-swift', {
        message: messageText,
      });

      const { data } = response;
      const newMessage: SwiftMessage & { manuallyUpdated?: boolean } = {
        id: crypto.randomUUID(),
        transactionRef: data.transaction_reference || '',
        type: data.transaction_type || '',
        date: data.transaction_date || '',
        currency: data.transaction_currency || '',
        amount: data.transaction_amount || '',
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
        manuallyUpdated: false
      };

      if (isOfacInitialized) {
        const checks = await checkAllFields(newMessage);
        setMessageChecks(prev => ({
          ...prev,
          [newMessage.id]: checks
        }));
      }

      setMessages(prev => [...prev, newMessage]);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Error processing SWIFT message:', error);
      throw error;
    }
  };

  const handleAddBlacklistEntry = (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    const newEntry: BlacklistEntry = {
      ...entry,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    };
    setBlacklist(prev => [...prev, newEntry]);
  };

  const handleUpdateBlacklistEntry = (id: string, entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    setBlacklist(prev =>
      prev.map(item =>
        item.id === id
          ? { ...entry, id, dateAdded: item.dateAdded }
          : item
      )
    );
  };

  const handleDeleteBlacklistEntry = (id: string) => {
    setBlacklist(prev => prev.filter(entry => entry.id !== id));
  };

  const handleDeleteMessage = async (id: string) => {
    try {
        // Attempt to delete the message from the backend
        await axios.delete(`http://localhost:3001/api/delete-message/${id}`);
    } catch (error) {
        console.error('Error deleting message from backend:', error);
    } finally {
        // Always remove the message from the frontend list
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        setMessageChecks((prev) => {
            const newChecks = { ...prev };
            delete newChecks[id];
            return newChecks;
        });
    }
};


const handleStatusChange = async (id: string, status: SwiftMessage['status']) => {
  try {
      // Update the status in the backend
      await axios.patch(`http://localhost:3001/api/update-status/${id}`, { status });

      // Update the status in the frontend state
      setMessages((prev) =>
          prev.map((msg) =>
              msg.id === id
                  ? { ...msg, status }
                  : msg
          )
      );
  } catch (error) {
      console.error('Error updating status:', error);
  }
};

  const handleNotesChange = (id: string, notes: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, notes } : msg))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors">
      <Navbar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {currentPage === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <DashboardCard
                title="Total Messages"
                value={filteredMessages.length}
                icon={MessageSquare}
              />
              <DashboardCard
                title="Flagged Messages"
                value={filteredMessages.filter(m => m.status === 'flagged').length}
                icon={AlertTriangle}
              />
              <DashboardCard
                title="Processing"
                value={filteredMessages.filter(m => m.status === 'processing').length}
                icon={Clock}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex-grow">
                  <DashboardFilters onFilterChange={handleFilterChange} />
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex-shrink-0 h-10 flex items-center px-4 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] transition-colors"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  New Message
                </button>
              </div>
            </div>

            <MessageList
              messages={filteredMessages}
              onViewMessage={handleViewMessage}
              onDeleteMessage={handleDeleteMessage}
              onStatusChange={handleStatusChange}
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
                blacklist={blacklist}
                savedChecks={messageChecks[selectedMessage.id]}
                onStoreChecks={(checks) => handleStoreChecks(selectedMessage.id, checks)}
              />
            )}
          </>
        ) : currentPage === 'entity-search' ? (
          <EntitySearch /> /* Render EntitySearch component */
        ) : currentPage === 'reports' ? (
          <Reports messages={messages} />
        ) : currentPage === 'sdn-list' ? (
          <SDNList isDark={isDark} />
        ) : (
          <BlacklistManager
            entries={blacklist}
            onAddEntry={handleAddBlacklistEntry}
            onUpdateEntry={handleUpdateBlacklistEntry}
            onDeleteEntry={handleDeleteBlacklistEntry}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
