import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { SwiftMessage } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface ReportsProps {
  messages: SwiftMessage[];
}

export function Reports({ messages }: ReportsProps) {
  // Group transactions by currency
  const currencyGroups = useMemo(() => {
    return messages.reduce((acc, msg) => {
      const currency = msg.currency || 'Unknown';
      if (!acc[currency]) {
        acc[currency] = [];
      }
      acc[currency].push(msg);
      return acc;
    }, {} as { [key: string]: SwiftMessage[] });
  }, [messages]);

  // Calculate totals for each currency
  const currencyTotals = useMemo(() => {
    return Object.entries(currencyGroups).map(([currency, msgs]) => ({
      currency,
      total: msgs.reduce((sum, msg) => sum + parseFloat(msg.amount), 0),
      count: msgs.length,
      average: msgs.reduce((sum, msg) => sum + parseFloat(msg.amount), 0) / msgs.length,
    }));
  }, [currencyGroups]);

  // Daily transactions data
  const dailyTransactionsData = useMemo(() => {
    const dailyData = messages.reduce((acc, msg) => {
      const date = msg.date;
      if (!acc[date]) {
        acc[date] = {
          count: 0,
          amount: 0,
          currency: msg.currency
        };
      }
      acc[date].count++;
      acc[date].amount += parseFloat(msg.amount);
      return acc;
    }, {} as { [key: string]: { count: number; amount: number; currency: string } });

    const sortedDates = Object.keys(dailyData).sort();

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Number of Transactions',
          data: sortedDates.map(date => dailyData[date].count),
          borderColor: 'rgb(0, 135, 102)',
          backgroundColor: 'rgba(0, 135, 102, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Total Volume',
          data: sortedDates.map(date => dailyData[date].amount),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y1',
        },
      ],
    };
  }, [messages]);

  // Bank statistics data
  const bankStats = useMemo(() => {
    const bankData = messages.reduce((acc, msg) => {
      const bankName = msg.receiver.bankName || 'Unknown Bank';
      if (!acc[bankName]) {
        acc[bankName] = {
          count: 0,
          amount: 0,
          currency: msg.currency
        };
      }
      acc[bankName].count++;
      acc[bankName].amount += parseFloat(msg.amount);
      return acc;
    }, {} as { [key: string]: { count: number; amount: number; currency: string } });

    const banks = Object.keys(bankData);

    return {
      labels: banks,
      datasets: [
        {
          label: 'Number of Transactions',
          data: banks.map(bank => bankData[bank].count),
          backgroundColor: 'rgba(0, 135, 102, 0.6)',
          borderColor: 'rgb(0, 135, 102)',
          borderWidth: 1,
        },
      ],
    };
  }, [messages]);

  // Status distribution data
  const statusData = useMemo(() => {
    const statusCounts = messages.reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      labels: ['Clear', 'Flagged', 'Processing'],
      datasets: [
        {
          data: [
            statusCounts['clear'] || 0,
            statusCounts['flagged'] || 0,
            statusCounts['processing'] || 0,
          ],
          backgroundColor: [
            'rgba(0, 200, 83, 0.6)',
            'rgba(255, 87, 34, 0.6)',
            'rgba(255, 193, 7, 0.6)',
          ],
          borderColor: [
            'rgb(0, 200, 83)',
            'rgb(255, 87, 34)',
            'rgb(255, 193, 7)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [messages]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
      },
    },
  };

  // Format currency amount
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {currencyTotals.map(({ currency, total, count, average }) => (
          <React.Fragment key={currency}>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Volume ({currency})
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatAmount(total, currency)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Transactions ({currency})
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {count}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Average Amount ({currency})
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatAmount(average, currency)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Flagged Rate ({currency})
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {((currencyGroups[currency].filter(m => m.status === 'flagged').length / count) * 100).toFixed(1)}%
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Transactions Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Daily Transactions</h3>
          <div className="h-80">
            <Line data={dailyTransactionsData} options={chartOptions} />
          </div>
        </div>

        {/* Bank Statistics */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bank Activity</h3>
          <div className="h-80">
            <Bar data={bankStats} options={chartOptions} />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status Distribution</h3>
          <div className="h-80">
            <Doughnut data={statusData} options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins.legend,
                  position: 'right' as const,
                },
              },
            }} />
          </div>
        </div>

        {/* Amount Ranges by Currency */}
        {Object.entries(currencyGroups).map(([currency, msgs]) => (
          <div key={currency} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Transaction Amounts ({currency})
            </h3>
            <div className="h-80">
              <Bar 
                data={getAmountRangesData(msgs)} 
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      title: {
                        display: true,
                        text: `Amount (${currency})`,
                        color: 'rgb(156, 163, 175)',
                      },
                    },
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Number of Transactions',
                        color: 'rgb(156, 163, 175)',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to generate amount ranges data
function getAmountRangesData(messages: SwiftMessage[]) {
  const ranges = [
    { min: 0, max: 1000000 },
    { min: 1000000, max: 5000000 },
    { min: 5000000, max: 10000000 },
    { min: 10000000, max: 50000000 },
    { min: 50000000, max: 100000000 },
    { min: 100000000, max: Infinity },
  ];

  const rangeCounts = ranges.map(range => ({
    label: `${range.min.toLocaleString()} - ${range.max === Infinity ? '∞' : range.max.toLocaleString()}`,
    count: messages.filter(m => {
      const amount = parseFloat(m.amount);
      return amount >= range.min && amount < range.max;
    }).length,
  }));

  return {
    labels: rangeCounts.map(r => r.label),
    datasets: [
      {
        label: 'Number of Transactions',
        data: rangeCounts.map(r => r.count),
        backgroundColor: 'rgba(0, 135, 102, 0.6)',
        borderColor: 'rgb(0, 135, 102)',
        borderWidth: 1,
      },
    ],
  };
}