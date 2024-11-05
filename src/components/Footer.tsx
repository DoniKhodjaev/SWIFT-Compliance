import React from 'react';

export function Footer() {
  return (
    <footer className="bg-[#008766] shadow-lg mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm text-white">Made by </span>
          <a 
            href="https://www.linkedin.com/in/doniyor-khodjaev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-gray-200 transition-colors"
          >
            Doniyor Khodjaev
          </a>
        </div>
      </div>
    </footer>
  );
} 