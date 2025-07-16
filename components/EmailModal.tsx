'use client';

import { useState } from 'react';
import Modal from './Modal';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  isLoading?: boolean;
}

export default function EmailModal({ isOpen, onClose, onSubmit, isLoading = false }: EmailModalProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onSubmit(email.trim());
      setEmail('');
    }
  };

  const handleClose = () => {
    setEmail('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Sign In with Magic Link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 