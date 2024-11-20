// Define a reusable type for SDN status options
type SdnStatusType = 'clear' | 'flagged' | 'pending';

// Define a type for details about founders, used in company details
interface FounderDetails {
  owner: string;
  percentage?: number;
  companyDetails?: {
    CEO?: string;
    Founders?: FounderDetails[];
    inn?: string;
    registrationDate?: string | null;
  };
}

// Interface for name check results, including optional details
export interface NameCheckResult {
  name: string;
  isMatch: boolean;
  matchScore: number;
  matchedName?: string;
  matchType: 'name' | 'id' | 'address' | 'other';
  details?: {
    type?: string;
    programs?: string[];
    remarks?: string;
    ids?: string[];
    addresses?: string[];
  };
}

// Interface for a Swift message, including sender and receiver details
export interface SwiftMessage {
  id: string;
  transactionRef: string;
  type: string;
  date: string;
  currency: string;
  amount: string;
  notes?: string;
  manuallyUpdated?: boolean;
  sender: {
    account: string;
    inn: string;
    name: string;
    address: string;
    bankCode: string;
    sdnStatus?: SdnStatusType;
    company_details?: {
      CEO?: string;
      Founders?: FounderDetails[];
    };
  };
  receiver: {
    account: string;
    transitAccount: string;
    bankCode: string;
    bankName: string;
    name: string;
    inn: string;
    kpp: string;
    sdnStatus?: SdnStatusType;
    CEO?: string;
    Founders?: FounderDetails[];
  };
  purpose: string;
  fees: string;
  status: 'processing' | 'clear' | 'flagged';
}

// Interface for blacklist entries
export interface BlacklistEntry {
  id: string;
  inn?: string;
  names: {
    fullNameEn: string;
    fullNameRu: string;
    shortNameEn: string;
    shortNameRu: string;
    abbreviationEn: string;
    abbreviationRu: string;
  };
  dateAdded: string;
  notes?: string;
}

// Interface for matches found in the blacklist
export interface BlacklistMatch {
  isMatch: boolean;
  matchedName: string;
  matchType: 'full' | 'short' | 'abbreviation' | 'inn';
  language: 'en' | 'ru' | 'numeric';
  entry: BlacklistEntry;
}

// Interface for properties of a dashboard card component
export interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
