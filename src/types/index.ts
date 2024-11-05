export interface SwiftMessage {
  id: string;
  transactionRef: string;
  type: string;
  date: string;
  currency: string;
  amount: string;
  sender: {
    account: string;
    inn: string;
    name: string;
    address: string;
    bankCode: string;
  };
  receiver: {
    account: string;
    transitAccount: string;
    bankCode: string;
    bankName: string;
    name: string;
    inn: string;
    kpp: string;
  };
  purpose: string;
  fees: string;
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