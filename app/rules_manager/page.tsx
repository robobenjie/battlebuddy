'use client';

import { useState } from 'react';
import { db } from '../../lib/db';

interface Rule {
  id: string;
  name: string;
  rawText?: string;
  battlescribeId?: string;
  faction?: string;
  scope?: string;
  ruleObject?: string;
  createdAt: number;
}

export default function RulesManagerPage() {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleObjectText, setRuleObjectText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiDeclineMessage, setAiDeclineMessage] = useState<{ ruleName: string; message: string } | null>(null);

  // Query all rules with linked units to get unit names
  const { data, isLoading } = db.useQuery({
    rules: {
      rulesUnits: {
        $: {}
      },
      rulesModels: {
        unit: {}
      },
      rulesWeapons: {
        model: {
          unit: {}
        }
      }
    }
  });

  const allRules = (data?.rules || []) as any[];

  // Helper to get display name based on rule scope
  const getRuleSourceName = (rule: any): string => {
    // For army-level rules, show army name (from faction)
    if (rule.scope === 'army') {
      return rule.faction || '';
    }

    // For detachment-level rules, show detachment name
    // TODO: Add detachment support when we have detachment data
    if (rule.scope === 'detachment') {
      return rule.faction || '';
    }

    // For unit/model/weapon level rules, show unit names
    const unitNames = new Set<string>();

    // Get units directly linked to this rule
    rule.rulesUnits?.forEach((unit: any) => {
      if (unit?.name) unitNames.add(unit.name);
    });

    // Get units from models linked to this rule
    rule.rulesModels?.forEach((model: any) => {
      if (model?.unit?.name) unitNames.add(model.unit.name);
    });

    // Get units from weapons linked to this rule
    rule.rulesWeapons?.forEach((weapon: any) => {
      if (weapon?.model?.unit?.name) unitNames.add(weapon.model.unit.name);
    });

    const names = Array.from(unitNames);

    if (names.length === 0) return rule.faction || '';
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')}...`;
  };

  // Separate into implemented and not implemented
  const implementedRules = allRules.filter(r => r.ruleObject);
  const notImplementedRules = allRules.filter(r => !r.ruleObject);

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setRuleObjectText(rule.ruleObject || '');
    setError(null);
    setAiMessage(null);
  };

  const handleAiImplement = async (rule: Rule) => {
    if (!rule.rawText) {
      setError('No rule text available for AI implementation');
      return;
    }

    setIsImplementing(true);
    setError(null);
    setAiMessage(null);

    try {
      const response = await fetch('/api/rules/implement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleName: rule.name,
          ruleText: rule.rawText,
          faction: rule.faction,
          scope: rule.scope
        })
      });

      const result = await response.json();

      if (result.success && result.rules) {
        // Format the rules array nicely
        setRuleObjectText(JSON.stringify(result.rules, null, 2));
        setEditingRule(rule);
        const ruleCount = result.rules.length;
        setAiMessage(result.message || `AI generated ${ruleCount} rule${ruleCount > 1 ? 's' : ''}. Please review before saving.`);
      } else {
        // AI declined to implement - show modal with explanation
        setAiDeclineMessage({
          ruleName: rule.name,
          message: result.message || 'This rule cannot be implemented in the combat calculator.'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to call AI implementation API');
    } finally {
      setIsImplementing(false);
    }
  };

  const handleSave = async () => {
    if (!editingRule) return;

    setIsSaving(true);
    setError(null);

    try {
      // Validate JSON syntax only
      if (ruleObjectText.trim()) {
        JSON.parse(ruleObjectText);
        // Don't enforce structure - let users save any valid JSON
      }

      await db.transact([
        db.tx.rules[editingRule.id].update({
          ruleObject: ruleObjectText.trim() || undefined
        })
      ]);

      setEditingRule(null);
      setRuleObjectText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    setRuleObjectText('');
    setError(null);
    setAiMessage(null);
  };

  const handleDownloadAll = () => {
    try {
      // Collect all implemented rules
      const rulesData = implementedRules.map(rule => {
        try {
          // Parse the ruleObject JSON
          const ruleObj = JSON.parse(rule.ruleObject || '{}');
          return {
            id: rule.id,
            name: rule.name,
            faction: rule.faction,
            scope: rule.scope,
            battlescribeId: rule.battlescribeId,
            rawText: rule.rawText,
            ...ruleObj
          };
        } catch (err) {
          console.error(`Failed to parse rule ${rule.name}:`, err);
          return {
            id: rule.id,
            name: rule.name,
            error: 'Failed to parse JSON'
          };
        }
      });

      // Create JSON string
      const jsonString = JSON.stringify(rulesData, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `battlebuddy-rules-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download rules:', err);
      alert('Failed to download rules. Check console for details.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading rules...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-red-500">Rules Manager</h1>
          <button
            onClick={handleDownloadAll}
            disabled={implementedRules.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Download All ({implementedRules.length})
          </button>
        </div>

        {/* Global error display */}
        {error && !editingRule && (
          <div className="mb-6 p-4 bg-red-900/30 rounded-lg border border-red-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-red-300 mb-1">Error</div>
                <div className="text-sm text-red-200">{error}</div>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-3 text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Implemented Rules */}
          <div className="bg-gray-800 rounded-lg border border-green-700 p-6">
            <h2 className="text-xl font-bold text-green-400 mb-4">
              Implemented Rules ({implementedRules.length})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {implementedRules.map(rule => (
                <div
                  key={rule.id}
                  className="bg-gray-700 rounded p-3 flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{rule.name}</div>
                    <div className="text-xs text-gray-400">
                      {getRuleSourceName(rule) && <span className="mr-2">{getRuleSourceName(rule)}</span>}
                      {rule.scope && <span className="mr-2">({rule.scope})</span>}
                    </div>
                    {rule.rawText && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {rule.rawText}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="ml-3 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>
              ))}
              {implementedRules.length === 0 && (
                <p className="text-gray-500 text-center py-8">No implemented rules yet</p>
              )}
            </div>
          </div>

          {/* Not Implemented Rules */}
          <div className="bg-gray-800 rounded-lg border border-red-700 p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              Not Implemented ({notImplementedRules.length})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {notImplementedRules.map(rule => (
                <div
                  key={rule.id}
                  className="bg-gray-700 rounded p-3 flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{rule.name}</div>
                    <div className="text-xs text-gray-400">
                      {getRuleSourceName(rule) && <span className="mr-2">{getRuleSourceName(rule)}</span>}
                      {rule.scope && <span className="mr-2">({rule.scope})</span>}
                    </div>
                    {rule.rawText && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {rule.rawText}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAiImplement(rule)}
                      disabled={isImplementing || !rule.rawText}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-3 py-1 rounded transition-colors"
                      title={!rule.rawText ? 'No rule text available' : 'Use AI to implement'}
                    >
                      {isImplementing ? '...' : 'AI'}
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                    >
                      Manual
                    </button>
                  </div>
                </div>
              ))}
              {notImplementedRules.length === 0 && (
                <p className="text-gray-500 text-center py-8">All rules implemented!</p>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editingRule && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{editingRule.name}</h2>
                <div className="text-sm text-gray-400 mb-4">
                  {editingRule.faction && <span className="mr-2">Faction: {editingRule.faction}</span>}
                  {editingRule.scope && <span className="mr-2">Scope: {editingRule.scope}</span>}
                  {editingRule.battlescribeId && (
                    <div className="mt-1">ID: {editingRule.battlescribeId}</div>
                  )}
                </div>

                {editingRule.rawText && (
                  <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Rule Text:</div>
                    <div className="text-sm text-gray-300">{editingRule.rawText}</div>
                  </div>
                )}

                {aiMessage && (
                  <div className="mb-4 p-3 bg-purple-900/30 rounded border border-purple-700">
                    <div className="text-xs text-purple-400 mb-1">AI Note:</div>
                    <div className="text-sm text-purple-300">{aiMessage}</div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rule Objects (JSON Array):
                  </label>
                  <div className="text-xs text-gray-400 mb-2">
                    Enter an array of rule objects. Each rule can have multiple effects.
                  </div>
                  <textarea
                    value={ruleObjectText}
                    onChange={(e) => setRuleObjectText(e.target.value)}
                    className="w-full h-64 bg-gray-900 text-white font-mono text-sm p-3 rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                    placeholder={`[
  {
    "type": "modifyAdvance",
    "params": {"modifier": 1}
  },
  {
    "type": "modifyCharge",
    "params": {"modifier": 1}
  }
]`}
                  />
                  {error && (
                    <div className="mt-2 text-red-400 text-sm">{error}</div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleAiImplement(editingRule)}
                    disabled={isImplementing || !editingRule.rawText}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition-colors flex items-center gap-2"
                    title={!editingRule.rawText ? 'No rule text available' : 'Use AI to re-implement this rule'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {isImplementing ? 'Generating...' : 'AI Re-implement'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Decline Modal */}
        {aiDeclineMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg border border-orange-700 max-w-2xl w-full">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-orange-400 mb-1">Cannot Implement Rule</h2>
                    <p className="text-lg text-white">{aiDeclineMessage.ruleName}</p>
                  </div>
                  <button
                    onClick={() => setAiDeclineMessage(null)}
                    className="text-gray-400 hover:text-gray-300 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-orange-900/20 rounded-lg border border-orange-700/50 p-4 mb-6">
                  <div className="text-sm font-medium text-orange-300 mb-2">AI Explanation:</div>
                  <div className="text-sm text-orange-100 whitespace-pre-wrap">{aiDeclineMessage.message}</div>
                </div>

                <div className="text-sm text-gray-400 mb-6">
                  This rule cannot be automatically implemented in the combat calculator.
                  You may still implement it manually if you believe it affects combat calculations,
                  or you can use it as a reminder in the rules list.
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setAiDeclineMessage(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Find the rule and open manual implementation
                      const rule = allRules.find(r => r.name === aiDeclineMessage.ruleName);
                      if (rule) {
                        handleEdit(rule);
                        setAiDeclineMessage(null);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors"
                  >
                    Implement Manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
