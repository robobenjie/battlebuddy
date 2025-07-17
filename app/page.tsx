'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import AuthenticatedApp from '../components/AuthenticatedApp';
import EmailModal from '../components/EmailModal';
import { CurrentGames } from '../components/CurrentGamesPage';

export default function Home() {
  const { isLoading, user, error } = db.useAuth();
  const { data } = db.useQuery({ games: {}, players: {} });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const sendMagicLink = async (email: string) => {
    setIsEmailSending(true);
    try {
      await db.auth.sendMagicCode({ email });
      setCurrentEmail(email);
      setEmailSent(true);
      setShowEmailModal(false);
    } catch (error) {
      console.error('Error sending magic link:', error);
      alert('Failed to send magic link. Please try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  const verifyMagicCode = async () => {
    if (!magicCode.trim() || !currentEmail) return;
    
    setIsVerifying(true);
    try {
      await db.auth.signInWithMagicCode({ email: currentEmail, code: magicCode });
      setMagicCode('');
      setEmailSent(false);
      setCurrentEmail('');
    } catch (error) {
      console.error('Error verifying magic code:', error);
      alert('Invalid magic code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetAuth = () => {
    setEmailSent(false);
    setMagicCode('');
    setCurrentEmail('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Authentication Error: {error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (user) {
    return <AuthenticatedApp user={user} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-red-500 mb-2">BattleBuddy</h1>
          <h2 className="text-2xl font-semibold text-gray-300 mb-4">Warhammer 40k Companion</h2>
          <p className="text-gray-400 mb-8">
            Create and join games, track your armies, and battle with friends in real-time.
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Sign In to Continue</h3>
          
          {!emailSent ? (
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Sign in with Magic Link
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-800 border border-green-600 rounded-lg p-4">
                <p className="text-green-200 text-sm mb-2">
                  ✓ Magic code sent to {currentEmail}
                </p>
                <p className="text-green-300 text-xs">
                  Check your email and enter the magic code below.
                </p>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter magic code"
                  value={magicCode}
                  onChange={(e) => setMagicCode(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={verifyMagicCode}
                    disabled={isVerifying || !magicCode.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button
                    onClick={resetAuth}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={sendMagicLink}
        isLoading={isEmailSending}
      />
    </div>
  );
}
