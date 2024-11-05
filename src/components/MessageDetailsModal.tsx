import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Download } from 'lucide-react';
import type { SwiftMessage } from '../types';
import { OfacChecker } from '../utils/ofacChecker';

interface MessageDetailsModalProps {
  message: SwiftMessage;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: SwiftMessage['status']) => void;
  onNotesChange?: (id: string, notes: string) => void;
}

interface Owner {
  owner: string;
  percentage?: number;
}

interface NameCheckResult {
  name: string;
  isMatch: boolean;
  matchScore: number;
  matchedName?: string;
  matchType?: 'name' | 'address' | 'id' | 'other';
  details?: {
    type?: string;
    programs?: string[];
    remarks?: string;
    addresses?: string[];
    ids?: string[];
  };
}

export function MessageDetailsModal({
  message,
  isOpen,
  onClose,
  onStatusChange,
  onNotesChange,
}: MessageDetailsModalProps) {
  const [notes, setNotes] = useState(message.notes || '');
  const [status, setStatus] = useState(message.status);
  const [nameChecks, setNameChecks] = useState<Record<string, NameCheckResult>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Initialize OFAC checker
  useEffect(() => {
    const initializeChecker = async () => {
      await OfacChecker.initialize();
      setIsInitialized(true);
    };
    initializeChecker();
  }, []);

  // Set status to processing when checking starts
  useEffect(() => {
    if (isChecking) {
      setStatus('processing');
      onStatusChange?.(message.id, 'processing');
    }
  }, [isChecking, message.id, onStatusChange]);

  // Check names after initialization and update status
  useEffect(() => {
    if (!isInitialized) return;

    setIsChecking(true); // Start checking
    const results: Record<string, NameCheckResult> = {};

    const checkName = (name: string) => {
      const result = OfacChecker.checkName(name);
      results[name] = {
        name,
        isMatch: result.isMatch,
        matchScore: result.matchScore,
        matchedName: result.matchedName,
        matchType: result.matchType,
        details: result.details
      };
    };

    // Check all relevant names
    if (message.sender.name) checkName(message.sender.name);
    if (message.sender.company_details?.CEO) checkName(message.sender.company_details.CEO);
    message.sender.company_details?.Founders?.forEach(founder => {
      if (founder.owner) checkName(founder.owner);
    });

    if (message.receiver.name) checkName(message.receiver.name);
    if (message.receiver.CEO) checkName(message.receiver.CEO);
    message.receiver.Founders?.forEach(founder => {
      if (founder.owner) checkName(founder.owner);
    });

    setNameChecks(results);

    // Determine status based on check results
    const checkResults = Object.values(results);
    
    // If any name has 100% match, set to flagged
    if (checkResults.some(check => check.matchScore === 1)) {
      setStatus('flagged');
      onStatusChange?.(message.id, 'flagged');
    }
    // If any name has a match (yellow triangle) but no 100% matches, set to processing
    else if (checkResults.some(check => check.isMatch)) {
      setStatus('processing');
      onStatusChange?.(message.id, 'processing');
    }
    // If all checks passed (green checkmarks), set to clear
    else if (checkResults.length > 0) {
      setStatus('clear');
      onStatusChange?.(message.id, 'clear');
    }

    setIsChecking(false); // Finished checking

  }, [message, isInitialized, onStatusChange]);

  const renderMatchDetails = (check: NameCheckResult) => {
    if (!check.isMatch) return "No OFAC matches found";

    return (
      <div className="text-xs">
        <p className="font-semibold">
          {check.matchScore === 1 ? "100% match" : `${(check.matchScore * 100).toFixed(1)}% match`}
          {check.matchType && ` (${check.matchType})`}
        </p>
        <p>Matched with: {check.matchedName}</p>
        {check.details && (
          <>
            {check.details.type && <p>Type: {check.details.type}</p>}
            {check.details.programs && check.details.programs.length > 0 && (
              <p>Programs: {check.details.programs.join(', ')}</p>
            )}
            {check.details.remarks && <p>Remarks: {check.details.remarks}</p>}
            {check.details.addresses && check.details.addresses.length > 0 && (
              <div>
                <p>Addresses:</p>
                <ul className="ml-2">
                  {check.details.addresses.map((addr, i) => (
                    <li key={i}>{addr}</li>
                  ))}
                </ul>
              </div>
            )}
            {check.details.ids && check.details.ids.length > 0 && (
              <div>
                <p>IDs:</p>
                <ul className="ml-2">
                  {check.details.ids.map((id, i) => (
                    <li key={i}>{id}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderNameCheckIcon = (name: string) => {
    const check = nameChecks[name];
    if (!check) return null;

    let icon;
    if (check.matchScore === 1) {
      icon = (
        <div className="group relative">
          <XCircle className="w-5 h-5 text-red-500 cursor-help" />
          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm left-6 top-0">
            {renderMatchDetails(check)}
          </div>
        </div>
      );
    } else if (check.isMatch) {
      icon = (
        <div className="group relative">
          <AlertTriangle className="w-5 h-5 text-yellow-500 cursor-help" />
          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm left-6 top-0">
            {renderMatchDetails(check)}
          </div>
        </div>
      );
    } else {
      icon = (
        <div className="group relative">
          <CheckCircle className="w-5 h-5 text-green-500 cursor-help" />
          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm left-6 top-0">
            {renderMatchDetails(check)}
          </div>
        </div>
      );
    }
    return icon;
  };

  const renderEntityInfo = (
    name: string,
    sdnStatus?: 'clear' | 'flagged' | 'pending',
    ownership?: Owner[],
    registrationDoc?: string,
    ceo?: string,
    founders?: Owner[]
  ) => {
    const ownersList = founders || ownership || [];

    return (
      <div className="flex items-start space-x-2">
        <div className="flex-grow">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-900">{name}</span>
            {renderNameCheckIcon(name)}
            {registrationDoc && (
              <a
                href={registrationDoc}
                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                target="_blank"
                rel="noopener noreferrer"
                title="Download Registration Document"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
          </div>
          {ceo && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">CEO:</span>
              <div className="ml-4 text-xs text-gray-600 flex items-center space-x-2">
                <span>{ceo}</span>
                {renderNameCheckIcon(ceo)}
              </div>
            </div>
          )}
          {ownersList.length > 0 && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">Founders:</span>
              <ul className="ml-4 text-xs text-gray-600">
                {ownersList.map((owner, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span>{owner.owner}</span>
                    {renderNameCheckIcon(owner.owner)}
                    {owner.percentage && <span>({owner.percentage}%)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: SwiftMessage['status']) => {
    setStatus(newStatus);
    onStatusChange?.(message.id, newStatus);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onNotesChange?.(message.id, newNotes);
  };

  const renderSDNStatus = (status?: 'clear' | 'flagged' | 'pending') => {
    switch (status) {
      case 'clear':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'flagged':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">
              Transaction Information
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference</dt>
                <dd className="text-sm text-gray-900">
                  {message.transactionRef}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="text-sm text-gray-900">{message.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="text-sm text-gray-900">{message.date}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Amount</dt>
                <dd className="text-sm text-gray-900">
                  {message.currency} {message.amount}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fees</dt>
                <dd className="text-sm text-gray-900">{message.fees}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  <select
                    value={status}
                    onChange={(e) =>
                      handleStatusChange(
                        e.target.value as SwiftMessage['status']
                      )
                    }
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="processing">Processing</option>
                    <option value="clear">Clear</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mt-6 mb-4">Purpose</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {message.purpose}
            </p>

            <h3 className="text-lg font-medium mt-6 mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full h-32 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add transaction notes..."
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Sender Information</h3>
            <dl className="space-y-2 mb-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd>
                  {renderEntityInfo(
                    message.sender.name,
                    message.sender.sdnStatus,
                    message.sender.ownership,
                    message.sender.registrationDoc,
                    message.sender.company_details?.CEO,
                    message.sender.company_details?.Founders
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account</dt>
                <dd className="text-sm text-gray-900">
                  {message.sender.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">INN</dt>
                <dd className="text-sm text-gray-900">
                  {message.sender.inn || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Code</dt>
                <dd className="text-sm text-gray-900">
                  {message.sender.bankCode || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">
                  {message.sender.address}
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mb-4">Receiver Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd>
                  {renderEntityInfo(
                    message.receiver.name,
                    message.receiver.sdnStatus,
                    message.receiver.ownership,
                    message.receiver.registrationDoc,
                    message.receiver.CEO,
                    message.receiver.Founders
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account</dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Transit Account
                </dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.transitAccount}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.bankName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Code</dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.bankCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">INN</dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.inn}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">KPP</dt>
                <dd className="text-sm text-gray-900">
                  {message.receiver.kpp}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}