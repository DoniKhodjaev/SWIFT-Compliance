import React from 'react';
import type { DashboardCardProps } from '../types';

export function DashboardCard({ title, value, icon: Icon }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-[#008766] bg-opacity-10 rounded-full">
          <Icon className="w-6 h-6 text-[#008766]" />
        </div>
      </div>
    </div>
  );
}