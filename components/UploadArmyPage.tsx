'use client';

import { useState, useRef } from 'react';
import { importCompleteArmy } from '../lib/army-import';

interface UploadArmyPageProps {
  user: any;
  onSuccess?: () => void;
}

export default function UploadArmyPage({ user, onSuccess }: UploadArmyPageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous states
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Please upload a JSON file');
      }

      // Read file content
      const fileContent = await file.text();
      let jsonData;

      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please check the file format.');
      }

      // Validate that it looks like a NewRecruit/BattleScribe roster
      if (!jsonData.roster) {
        throw new Error('This doesn\'t appear to be a valid army roster file. Please ensure you\'re uploading a NewRecruit or BattleScribe JSON export.');
      }

      // Import the army
      const result = await importCompleteArmy(jsonData, user.id);
      
      // Get army name from roster data
      const armyName = jsonData.roster?.name || 'Unnamed Army';
      
      setSuccess(`Successfully imported army "${armyName}" with ${result.unitIds.length} units, ${result.modelIds.length} models, and ${result.weaponIds.length} weapons!`);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call success callback if provided
      onSuccess?.();

    } catch (err: any) {
      console.error('Army import error:', err);
      setError(err.message || 'Failed to import army. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 pt-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">Upload Army</h1>
          <p className="text-gray-400">
            Import your army list from NewRecruit or BattleScribe JSON files
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          {/* Upload Area */}
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
              <div className="text-4xl mb-4">📁</div>
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

          {/* Loading State */}
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

          {/* Success Message */}
          {success && (
            <div className="bg-green-800 border border-green-600 rounded-lg p-4 mb-4">
              <p className="text-green-200">
                ✓ {success}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-800 border border-red-600 rounded-lg p-4 mb-4">
              <p className="text-red-200">
                ✗ {error}
              </p>
            </div>
          )}

          {/* Instructions */}
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