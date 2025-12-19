/**
 * Page to display the OpenAI prompt used for rule implementation
 */

'use client';

import { getOpenAIPrompt } from '../../lib/openai-prompt';

export default function PromptPage() {
  const prompt = getOpenAIPrompt();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">OpenAI Rule Implementation Prompt</h1>
        <p className="text-gray-400 mb-6">
          This is the prompt sent to OpenAI GPT-4 to convert natural language rules into structured JSON.
        </p>

        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-300">System Prompt</h2>
            <button
              onClick={handleCopy}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>

          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>

        <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">Usage</h3>
          <p className="text-sm text-gray-300">
            When implementing a rule, the system inserts the rule text at the <code className="bg-gray-800 px-1 py-0.5 rounded">{"{{RULE_TEXT}}"}</code> placeholder
            and sends the complete prompt to OpenAI GPT-4. The model responds with structured JSON following the schema defined above.
          </p>
        </div>

        <div className="mt-6">
          <a
            href="/rules_manager"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            ← Back to Rules Manager
          </a>
        </div>
      </div>
    </div>
  );
}
