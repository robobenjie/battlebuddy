'use client';

import { useState } from 'react';
import { db } from '../lib/db';
import ConfirmationModal from './ConfirmationModal';

interface ViewArmiesPageProps {
  user: any;
}

export default function ViewArmiesPage({ user }: ViewArmiesPageProps) {
  const [deletingArmyId, setDeletingArmyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query user's armies
  const { data: armyData, isLoading } = db.useQuery({
    armies: {
      $: {
        where: {
          ownerId: user.id,
        },
      },
    },
  });

  const armies = armyData?.armies || [];

  const handleDeleteClick = (armyId: string) => {
    setDeletingArmyId(armyId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingArmyId) return;

    setIsDeleting(true);
    try {
      // Delete the army
      await db.transact([
        db.tx.armies[deletingArmyId].delete(),
      ]);

      // Note: In a complete implementation, you might also want to delete
      // related units, models, and weapons, but for now we'll just delete the army
      
      setDeletingArmyId(null);
    } catch (error) {
      console.error('Error deleting army:', error);
      alert('Failed to delete army. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingArmyId(null);
  };

  const handleArmyClick = (armyId: string) => {
    // TODO: Navigate to army detail view (not implemented yet)
    console.log('Navigate to army:', armyId);
    alert('Army detail view not implemented yet');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatPoints = (points: number, limit: number) => {
    return `${points}/${limit} pts`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading armies...</p>
          </div>
        </div>
      </div>
    );
  }

  const armyToDelete = armies.find((army: any) => army.id === deletingArmyId);

  return (
    <div className="min-h-screen bg-gray-900 p-8 pt-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">My Armies</h1>
          <p className="text-gray-400">
            Manage your imported army lists
          </p>
        </div>

        {armies.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No armies yet
            </h3>
            <p className="text-gray-400 mb-4">
              Upload your first army list to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {armies.map((army: any) => (
              <div
                key={army.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <button
                      onClick={() => handleArmyClick(army.id)}
                      className="text-left w-full group"
                    >
                      <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors mb-1">
                        {army.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <span className="mr-1">⚔️</span>
                          {army.faction}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">📊</span>
                          {formatPoints(army.totalPoints, army.pointsLimit)}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">🗓️</span>
                          {formatDate(army.createdAt)}
                        </span>
                      </div>
                      {army.detachment && (
                        <div className="mt-1 text-sm text-gray-500">
                          Detachment: {army.detachment}
                        </div>
                      )}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteClick(army.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete army"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingArmyId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Army"
          message={`Are you sure you want to delete "${armyToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
} 