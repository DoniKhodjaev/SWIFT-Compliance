import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (messageText: string, comments: string) => Promise<void>;
}

export function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [messageText, setMessageText] = useState('');
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateSwiftMessage = (text: string): boolean => {
    const requiredFields = [':20:', ':32A:', ':50K:', ':59:'];
    return requiredFields.every(field => text.includes(field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!validateSwiftMessage(messageText)) {
        throw new Error('Invalid SWIFT message format');
      }
      await onUpload(messageText, comments);
      setMessageText('');
      setComments('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process message');
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file: File): Promise<string> => {
    const text = await file.text();
    if (!validateSwiftMessage(text)) {
      throw new Error(`Invalid SWIFT message format in file: ${file.name}`);
    }
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsLoading(true);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i + 1);
        const file = files[i];
        const text = await processFile(file);
        await onUpload(text, `Uploaded from file: ${file.name}`);
      }
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload SWIFT Message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Batch Upload
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt"
            multiple
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-[#008766] file:text-white
              hover:file:bg-[#007055]
              dark:file:bg-[#007055] dark:hover:file:bg-[#006045]
              file:cursor-pointer cursor-pointer"
          />
          {isLoading && totalFiles > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Processing files...</span>
                <span>{currentFileIndex} of {totalFiles}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#008766] dark:bg-[#007055] transition-all duration-300"
                  style={{ width: `${(currentFileIndex / totalFiles) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or paste message manually</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Message Text
            </label>
            <textarea
              id="message"
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Paste SWIFT message here..."
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="comments"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Comments
            </label>
            <textarea
              id="comments"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-[#008766] focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about this message..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Processing...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}