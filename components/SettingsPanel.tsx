'use client';

import { useState, useEffect } from 'react';

interface Settings {
  vectordb: {
    topK: number;
    scoreThreshold: number;
  };
  langcache: {
    enabled: boolean;
    similarityThreshold: number;
  };
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPromptTemplate: string;
    noDocsPromptTemplate: string;
  };
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LLM_MODELS = [
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'vectordb' | 'langcache' | 'llm'>('vectordb');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      const response = await fetch('/api/settings', { method: 'DELETE' });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Hyperparameters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { id: 'vectordb', label: 'Vector DB', icon: '🗄️' },
            { id: 'langcache', label: 'LangCache', icon: '⚡' },
            { id: 'llm', label: 'LLM', icon: '🤖' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : settings ? (
            <>
              {activeTab === 'vectordb' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Top K (Number of chunks to retrieve)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={settings.vectordb.topK}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          vectordb: { ...settings.vectordb, topK: parseInt(e.target.value) },
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span className="font-medium text-blue-600">{settings.vectordb.topK}</span>
                      <span>20</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score Threshold (Minimum similarity score)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.vectordb.scoreThreshold * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          vectordb: { ...settings.vectordb, scoreThreshold: parseInt(e.target.value) / 100 },
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.0</span>
                      <span className="font-medium text-blue-600">{settings.vectordb.scoreThreshold.toFixed(2)}</span>
                      <span>1.0</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Chunks with similarity below this threshold will be filtered out
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'langcache' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enable Semantic Cache
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Cache LLM responses for similar queries to save tokens
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          langcache: { ...settings.langcache, enabled: !settings.langcache.enabled },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.langcache.enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.langcache.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className={settings.langcache.enabled ? '' : 'opacity-50 pointer-events-none'}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Similarity Threshold
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.langcache.similarityThreshold * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          langcache: { ...settings.langcache, similarityThreshold: parseInt(e.target.value) / 100 },
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.5</span>
                      <span className="font-medium text-blue-600">{settings.langcache.similarityThreshold.toFixed(2)}</span>
                      <span>1.0</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Higher = stricter matching, Lower = more cache hits but potentially less accurate
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'llm' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <select
                      value={settings.llm.model}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          llm: { ...settings.llm, model: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {LLM_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={settings.llm.temperature * 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          llm: { ...settings.llm, temperature: parseInt(e.target.value) / 100 },
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 (Precise)</span>
                      <span className="font-medium text-blue-600">{settings.llm.temperature.toFixed(2)}</span>
                      <span>2 (Creative)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="256"
                      max="8192"
                      step="256"
                      value={settings.llm.maxTokens}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          llm: { ...settings.llm, maxTokens: parseInt(e.target.value) || 2048 },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt (when documents found)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Use <code className="bg-gray-100 px-1 rounded">{'{{context}}'}</code> as placeholder for retrieved chunks
                    </p>
                    <textarea
                      value={settings.llm.systemPromptTemplate}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          llm: { ...settings.llm, systemPromptTemplate: e.target.value },
                        })
                      }
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt (when no documents found)
                    </label>
                    <textarea
                      value={settings.llm.noDocsPromptTemplate}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          llm: { ...settings.llm, noDocsPromptTemplate: e.target.value },
                        })
                      }
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500">Failed to load settings</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={resetSettings}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
