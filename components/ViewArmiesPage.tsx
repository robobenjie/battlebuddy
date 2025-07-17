'use client';

import { useState, useRef } from 'react';
import { db } from '../lib/db';
import ConfirmationModal from './ConfirmationModal';
import { importCompleteArmy } from '../lib/army-import';

interface ViewArmiesPageProps {
  user: any;
  onNavigateToArmy?: (armyId: string) => void;
}

export default function ViewArmiesPage({ user, onNavigateToArmy }: ViewArmiesPageProps) {
  const [deletingArmyId, setDeletingArmyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Filter out game copies (armies with gameId set)
  const armies = (armyData?.armies || []).filter((army: any) => !army.gameId);

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
    // Navigate to army detail view
    onNavigateToArmy?.(armyId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      if (!file.name.endsWith('.json')) {
        throw new Error('Please upload a JSON file');
      }
      const fileContent = await file.text();
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please check the file format.');
      }
      if (!jsonData.roster) {
        throw new Error('This doesn\'t appear to be a valid army roster file. Please ensure you\'re uploading a NewRecruit or BattleScribe JSON export.');
      }
      const result = await importCompleteArmy(jsonData, user.id);
      const armyName = jsonData.roster?.name || 'Unnamed Army';
      setUploadSuccess(`Successfully imported army "${armyName}" with ${result.unitIds.length} units, ${result.modelIds.length} models, and ${result.weaponIds.length} weapons!`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Optionally, you could refresh the army list here if needed
    } catch (err: any) {
      console.error('Army import error:', err);
      setUploadError(err.message || 'Failed to import army. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
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
                        <span>{army.faction}</span>
                        <span>{formatPoints(army.totalPoints, army.pointsLimit)}</span>
                        <span>{formatDate(army.createdAt)}</span>
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
                    ✕
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
      {/* Upload Army Widget */}
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Army Roster File
            </label>
            <div
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isUploading
                  ? 'border-gray-600 bg-gray-700'
                  : 'border-gray-600 hover:border-red-500 hover:bg-gray-700'
              }`}
            >
              <div className="text-lg font-medium text-gray-300 mb-2">
                {isUploading ? 'Importing Army...' : 'Click to select JSON file'}
              </div>
              <div className="text-sm text-gray-400">
                Supports NewRecruit and BattleScribe JSON exports
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </div>
          {isUploading && (
            <div className="bg-blue-800 border border-blue-600 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300 mr-3"></div>
                <p className="text-blue-200">
                  Importing army... This may take a moment.
                </p>
              </div>
            </div>
          )}
          {uploadSuccess && (
            <div className="bg-green-800 border border-green-600 rounded-lg p-4 mb-4">
              <p className="text-green-200">
                ✓ {uploadSuccess}
              </p>
            </div>
          )}
          {uploadError && (
            <div className="bg-red-800 border border-red-600 rounded-lg p-4 mb-4">
              <p className="text-red-200">
                ✗ {uploadError}
              </p>
            </div>
          )}
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-2">How to get your army file:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <strong>NewRecruit:</strong> Export your army as JSON from the roster builder</li>
              <li>• <strong>BattleScribe:</strong> Export your roster as .json file</li>
              <li>• The file should contain army metadata, units, models, and weapons</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 