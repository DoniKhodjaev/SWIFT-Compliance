export interface Owner {
  owner: string;
  percentage?: number;
}

export interface CompanyDetails {
  CEO?: string;
  Founders?: Owner[];
}

export interface Entity {
  name: string;
  account: string;
  address?: string;
  inn?: string;
  bankCode?: string;
  sdnStatus?: 'clear' | 'flagged' | 'pending';
  ownership?: Owner[];
  registrationDoc?: string;
  company_details?: CompanyDetails;
  CEO?: string;
  Founders?: Owner[];
  transitAccount?: string;
  bankName?: string;
  kpp?: string;
}

export interface SwiftMessage {
  id: string;
  transactionRef: string;
  date: string;
  type: string;
  currency: string;
  amount: string;
  notes?: string;
  sender: Entity;
  receiver: Entity;
  purpose?: string;
  fees?: string;
  status: 'processing' | 'clear' | 'flagged';
}

export interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}