import React from 'react';
import { LayoutDashboard, ShieldAlert, BarChart3, Octagon, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  currentPage: 'dashboard' | 'entity-search' | 'blacklist' | 'sdn-list' | 'reports';
  onNavigate: (page: 'dashboard' | 'entity-search' | 'blacklist' | 'sdn-list' | 'reports') => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Navbar({ currentPage, onNavigate, isDark, onToggleTheme }: NavbarProps) {
  return (
    <nav className="bg-[#008766] shadow-lg dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white">
              AIB SWIFT Message Checker
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'dashboard'
                  ? 'bg-[#007055] text-white'
                  : 'text-white hover:bg-[#007055]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('entity-search')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'entity-search'
                  ? 'bg-[#007055] text-white'
                  : 'text-white hover:bg-[#007055]'
              }`}
            >
              <Search className="w-4 h-4 mr-2" />
              Entity Search
            </button>
            <button
              onClick={() => onNavigate('blacklist')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'blacklist'
                  ? 'bg-[#007055] text-white'
                  : 'text-white hover:bg-[#007055]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Blacklist
            </button>
            <button
              onClick={() => onNavigate('sdn-list')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'sdn-list'
                  ? 'bg-[#007055] text-white'
                  : 'text-white hover:bg-[#007055]'
              }`}
            >
              <Octagon className="w-4 h-4 mr-2" />
              SDN List
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === 'reports'
                  ? 'bg-[#007055] text-white'
                  : 'text-white hover:bg-[#007055]'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </button>
            <div className="border-l border-[#007055] h-6 mx-2" />
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
        </div>
      </div>
    </nav>
  );
}
