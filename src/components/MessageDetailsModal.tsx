import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  User, 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  Shield, 
  RefreshCw
} from 'lucide-react';
import type { SwiftMessage, BlacklistEntry, NameCheckResult, Owner } from '../types';
import { OfacChecker } from '../utils/ofacChecker';
import { BlacklistChecker } from '../utils/blacklistChecker';
import { transliterate as transliterateText } from 'transliteration';

interface MessageDetailsModalProps {
  message: SwiftMessage;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: SwiftMessage['status']) => void;
  onNotesChange?: (id: string, notes: string) => void;
  savedChecks?: Record<string, NameCheckResult>;
  onStoreChecks?: (checks: Record<string, NameCheckResult>) => void;
  blacklist?: BlacklistEntry[];
}

interface OwnershipNodeState {
  [key: string]: boolean;
}

export function MessageDetailsModal({
  message,
  isOpen,
  onClose,
  onStatusChange,
  onNotesChange,
  savedChecks,
  onStoreChecks,
  blacklist,
}: MessageDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<OwnershipNodeState>({});
  const [notes, setNotes] = useState(message.notes || '');
  const [currentStatus, setStatus] = useState<SwiftMessage['status']>(message.status);
  const [nameChecks, setNameChecks] = useState<Record<string, NameCheckResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(message.manuallyUpdated || false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (isOpen && !hasChecked) {
      const performChecks = async () => {
        try {
          setIsChecking(true);
          await OfacChecker.initialize();
  
          const results: Record<string, NameCheckResult> = {};
          const namesToCheck = new Set<string>();
  
          collectNames(message.sender, namesToCheck);
          collectNames(message.sender.company_details, namesToCheck);
          collectNames(message.receiver, namesToCheck);
  
          for (const name of namesToCheck) {
            const checkResult = await OfacChecker.checkName(name) as NameCheckResult;
            results[name] = { ...checkResult, name };
          }
  
          setNameChecks(results);
          if (!isManualOverride) {
            const newStatus = determineStatus();
            setStatus(newStatus);
            onStatusChange?.(message.id, newStatus);
          }
          
          setHasChecked(true);
          message.nameChecks = results;
          onStoreChecks?.(results);
        } catch (error) {
          console.error('Error during OFAC checks:', error);
        } finally {
          setIsChecking(false);
        }
      };
  
      performChecks();
    }
  }, [isOpen, hasChecked]);
  
    const handleStatusChange = (newStatus: SwiftMessage['status']) => {
      setStatus(newStatus);
      setIsManualOverride(true);
      onStatusChange?.(message.id, newStatus);
    };

  const calculateMatchScore = (results: Record<string, NameCheckResult>) => {
    const scores = Object.values(results).map(check => check?.matchScore || 0);
    const totalScore = scores.reduce((acc, score) => acc + score, 0);
    return totalScore / scores.length || 0;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const renderNameCheckIcon = (name: string, isInnCheck = false) => {
    if (!name) return null;

    const ofacCheck = nameChecks[name];
    const blacklistMatch = blacklist ? BlacklistChecker.checkName(name, blacklist) : null;

    return (
      <div className="flex items-center space-x-1">
        <div className="group relative">
          {ofacCheck ? (
            ofacCheck.matchScore === 1 ? (
              <XCircle className="w-5 h-5 text-red-500 cursor-help" />
            ) : ofacCheck.isMatch ? (
              <AlertTriangle className="w-5 h-5 text-yellow-500 cursor-help" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 cursor-help" />
            )
          ) : (
            <AlertOctagon className="w-5 h-5 text-gray-400 cursor-help" />
          )}
          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm left-6 top-0">
            {ofacCheck ? (
              <div className="text-xs">
                <p className="font-semibold">
                  {ofacCheck.matchScore === 1 ? "100% match" : 
                   ofacCheck.isMatch ? `${(ofacCheck.matchScore * 100).toFixed(1)}% match` : 
                   "No OFAC match"}
                </p>
                {ofacCheck.matchedName && (
                  <p>Matched with: {ofacCheck.matchedName}</p>
                )}
                {ofacCheck.details && (
                  <>
                    {ofacCheck.details.type && <p>Type: {ofacCheck.details.type}</p>}
                    {ofacCheck.details.programs && ofacCheck.details.programs.length > 0 && (
                      <p>Programs: {ofacCheck.details.programs.join(', ')}</p>
                    )}
                    {ofacCheck.details.remarks && <p>Remarks: {ofacCheck.details.remarks}</p>}
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs">OFAC check pending...</p>
            )}
          </div>
        </div>

        {blacklistMatch && (
          <div className="group relative">
            <Shield className="w-5 h-5 text-red-500 cursor-help" />
            <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm left-6 top-0">
              <div className="text-xs">
                <p className="font-semibold text-red-600 dark:text-red-400">
                ⚠ Blacklisted Entity {isInnCheck ? '(Matched by INN)' : ''}
                </p>
                <p>Matched with: {blacklistMatch.matchedName}</p>
                <p>Match type: {blacklistMatch.matchType}</p>
                <p>Language: {blacklistMatch.language.toUpperCase()}</p>
                {blacklistMatch.entry.notes && (
                  <div className="mt-1">
                    <p className="font-medium">Notes:</p>
                    <p>{blacklistMatch.entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const determineStatus = () => {
    // Check if there is a blacklist match
    const hasBlacklistMatch = blacklist?.some(entry => {
        const blacklistMatch = BlacklistChecker.checkName(entry.names.fullNameEn, blacklist);
        return blacklistMatch && blacklistMatch.isMatch;
    });

    // If a blacklist match is found, set status to 'flagged'
    if (hasBlacklistMatch) {
        return 'flagged';
    }

    // Check OFAC name checks for match scores
    let hasRedMatch = false;
    let hasYellowMatch = false;

    Object.values(nameChecks).forEach((check) => {
        if (check.matchScore === 1) {
            hasRedMatch = true; // 100% match, considered high-risk
        } else if (check.isMatch) {
            hasYellowMatch = true; // Potential match, lower risk
        }
    });

    // Determine status based on OFAC check results
    if (hasRedMatch) {
        return 'flagged';
    }
    if (hasYellowMatch) {
        return 'processing';
    }

    // Default to 'clear' if no high or low-risk matches
    return 'clear';
  };


  const renderOwnershipTree = (owners?: any[], depth = 0, parentId = '') => {
    if (!owners || owners.length === 0) return null;

    return (
      <ul className={`space-y-1 ${depth > 0 ? 'ml-4 mt-1' : ''}`}>
        {owners.map((owner, idx) => {
          const nodeId = `${parentId}_${idx}`;
          const hasDetails = owner.isCompany && owner.companyDetails;
          const isExpanded = expandedNodes[nodeId];

          return (
            <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                {hasDetails && (
                  <button
                    onClick={() => toggleNode(nodeId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
                {owner.isCompany ? (
                  <Building2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
                <span>{owner.owner}</span>
                {renderNameCheckIcon(owner.owner)}
                {owner.percentage && <span>({owner.percentage}%)</span>}
              </div>
              {hasDetails && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                  {owner.companyDetails.inn && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <span>INN: {owner.companyDetails.inn}</span>
                      {renderNameCheckIcon(owner.companyDetails.inn)}
                    </div>
                  )}
                  {owner.companyDetails.CEO && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <span>CEO: {owner.companyDetails.CEO}</span>
                      {renderNameCheckIcon(owner.companyDetails.CEO)}
                    </div>
                  )}
                  {renderOwnershipTree(owner.companyDetails.Founders, depth + 1, nodeId)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderEntityInfo = (name: string, ceo?: string, founders?: any[]) => {
    return (
      <div className="flex items-start space-x-2">
        <div className="flex-grow">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-900 dark:text-gray-100">{name}</span>
            {renderNameCheckIcon(name)}
          </div>
          {ceo && (
            <div className="mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">CEO:</span>
              <div className="ml-4 text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                <span>{ceo}</span>
                {renderNameCheckIcon(ceo)}
              </div>
            </div>
          )}
          {founders && founders.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ownership Structure:</p>
              {renderOwnershipTree(founders)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const collectNames = (entity: any, namesToCheck: Set<string>) => {
    if (entity.name) {
      const latinName = transliterateText(entity.name);
      namesToCheck.add(latinName);
    }
    if (entity.CEO) {
      namesToCheck.add(entity.CEO);
    }
    if (entity.Founders) {
      entity.Founders.forEach((founder: Owner) => {
        namesToCheck.add(founder.owner);
        if (founder.isCompany && founder.companyDetails) {
          collectNames(founder.companyDetails, namesToCheck);
        }
      });
    }
    if (entity.inn) {
      namesToCheck.add(entity.inn);
    }
  };

  const recheck = async () => {
    try {
      setIsChecking(true);
      await OfacChecker.initialize();

      const results: Record<string, NameCheckResult> = {};
      const namesToCheck = new Set<string>();

      collectNames(message.sender, namesToCheck);
      collectNames(message.sender.company_details, namesToCheck);
      collectNames(message.receiver, namesToCheck);

      for (const name of namesToCheck) {
        const checkResult = await OfacChecker.checkName(name) as NameCheckResult; // Cast result as NameCheckResult
        results[name] = { ...checkResult, name }; // Now it matches NameCheckResult
      }

      setNameChecks(results);
      message.nameChecks = results;
      message.matchScore = calculateMatchScore(results);
      setHasChecked(true);
    } catch (error) {
      console.error('Error during OFAC checks:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRecheck = async () => {
    await recheck();
    setHasChecked(true);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onNotesChange?.(message.id, newNotes);
  };

  useEffect(() => {
    if (savedChecks && message.id in savedChecks) {
      setNotes((savedChecks[message.id] as { notes?: string }).notes || '');
    }
  }, [savedChecks, message.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transaction Details</h2>
            <button
              onClick={handleRecheck}
              className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              Transaction Information
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.transactionRef}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{message.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{message.date}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.currency} {new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(parseFloat(message.amount))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fees</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{message.fees}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="text-sm">
                  <div className="flex items-center space-x-2">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(e.target.value as SwiftMessage['status'])}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
                      disabled={isChecking}
                    >
                      <option value="processing">Processing</option>
                      <option value="clear">Clear</option>
                      <option value="flagged">Flagged</option>
                    </select>
                    {isManualOverride && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                        (Manually set)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {currentStatus === 'flagged' ? '️ Flagged for review' : currentStatus === 'processing' ? '⏳ In processing' : '✅ Clear'}
                  </p>
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mt-6 mb-4 text-gray-900 dark:text-white">Purpose</h3>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {message.purpose}
            </p>

            <h3 className="text-lg font-medium mt-6 mb-4 text-gray-900 dark:text-white">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full h-32 px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-[#008766] focus:border-transparent dark:bg-gray-700"
              placeholder="Add transaction notes..."
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Sender Information</h3>
            <dl className="space-y-2 mb-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd>
                  {renderEntityInfo(
                    message.sender.name,
                    message.sender.company_details?.CEO,
                    message.sender.company_details?.Founders
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">INN</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.inn || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Code</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.bankCode || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.address}
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Receiver Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd>
                  {renderEntityInfo(
                    message.receiver.name,
                    message.receiver.CEO,
                    message.receiver.Founders
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Transit Account
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.transitAccount}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Name</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.bankName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Code</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.bankCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">INN</dt>
                <dd className="text-sm text-gray-900 dark:text-white flex items-center space-x-1">
                  <span>{message.receiver.inn}</span>
                  {renderNameCheckIcon(message.receiver.inn)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">KPP</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
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
