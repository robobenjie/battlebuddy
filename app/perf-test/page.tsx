'use client';

import { useEffect, useRef } from 'react';
import { db } from '../../lib/db';

export default function PerfTestPage() {
  const lastClickTime = useRef<number | null>(null);

  // Query both counter types
  const { data } = db.useQuery({
    perfCounters: {},
    perfCountersIndexed: {}
  });

  const counters = data?.perfCounters || [];
  const counter = counters[0];

  const indexedCounters = data?.perfCountersIndexed || [];
  const indexedCounter = indexedCounters[0];

  // Track re-renders
  useEffect(() => {
    if (lastClickTime.current !== null) {
      const now = performance.now();
      const clickToRenderTime = now - lastClickTime.current;
      console.log(`⏱️  CLICK TO RENDER: ${clickToRenderTime.toFixed(2)}ms`);
      console.log(`   Counter value: ${counter?.value}`);
      lastClickTime.current = null;
    }
  }, [counter]);

  const increment = () => {
    if (!counter) return;

    const t0 = performance.now();
    lastClickTime.current = t0;

    const newValue = (counter.value || 0) + 1;

    console.log(`📋 Incrementing from ${counter.value} to ${newValue}`);

    const tBefore = performance.now();
    db.transact(
      db.tx.perfCounters[counter.id].update({
        value: newValue
      })
    );
    const tAfter = performance.now();

    console.log(`⏱️  db.transact() took: ${(tAfter - tBefore).toFixed(2)}ms`);
  };

  const decrement = () => {
    if (!counter) return;

    const t0 = performance.now();
    lastClickTime.current = t0;

    const newValue = Math.max(0, (counter.value || 0) - 1);

    console.log(`📋 Decrementing from ${counter.value} to ${newValue}`);

    const tBefore = performance.now();
    db.transact(
      db.tx.perfCounters[counter.id].update({
        value: newValue
      })
    );
    const tAfter = performance.now();

    console.log(`⏱️  db.transact() took: ${(tAfter - tBefore).toFixed(2)}ms`);
  };

  const createCounter = () => {
    db.transact(
      db.tx.perfCounters[crypto.randomUUID()].update({
        value: 0,
        createdAt: Date.now()
      })
    );
  };

  const createIndexedCounter = () => {
    db.transact(
      db.tx.perfCountersIndexed[crypto.randomUUID()].update({
        value: 0,
        gameId: 'test-game-123',
        userId: 'test-user-456',
        createdAt: Date.now()
      })
    );
  };

  const incrementIndexed = () => {
    if (!indexedCounter) return;

    const t0 = performance.now();
    lastClickTime.current = t0;

    const newValue = (indexedCounter.value || 0) + 1;

    console.log(`📋 [INDEXED] Incrementing from ${indexedCounter.value} to ${newValue}`);

    const tBefore = performance.now();
    db.transact(
      db.tx.perfCountersIndexed[indexedCounter.id].update({
        value: newValue
      })
    );
    const tAfter = performance.now();

    console.log(`⏱️  [INDEXED] db.transact() took: ${(tAfter - tBefore).toFixed(2)}ms`);
  };

  const decrementIndexed = () => {
    if (!indexedCounter) return;

    const t0 = performance.now();
    lastClickTime.current = t0;

    const newValue = Math.max(0, (indexedCounter.value || 0) - 1);

    console.log(`📋 [INDEXED] Decrementing from ${indexedCounter.value} to ${newValue}`);

    const tBefore = performance.now();
    db.transact(
      db.tx.perfCountersIndexed[indexedCounter.id].update({
        value: newValue
      })
    );
    const tAfter = performance.now();

    console.log(`⏱️  [INDEXED] db.transact() took: ${(tAfter - tBefore).toFixed(2)}ms`);
  };

  if (!counter && !indexedCounter) {
    return (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Performance Test</h1>
          <p className="text-gray-400 mb-4">No counters found. Create them to start testing.</p>
          <div className="space-x-4">
            <button
              onClick={createCounter}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Create Simple Counter
            </button>
            <button
              onClick={createIndexedCounter}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Create Indexed Counter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">InstantDB Performance Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Simple Counter */}
          {counter ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border-2 border-blue-500">
              <div className="text-sm text-blue-400 mb-4 font-bold">Simple Counter (No Indexes)</div>

              <div className="flex items-center justify-center space-x-6 mb-8">
                <button
                  onClick={decrement}
                  disabled={(counter.value || 0) === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-16 h-16 rounded-lg text-2xl transition-colors"
                >
                  −
                </button>

                <div className="text-6xl font-bold text-white min-w-[120px]">
                  {counter.value || 0}
                </div>

                <button
                  onClick={increment}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold w-16 h-16 rounded-lg text-2xl transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-4">
                <p>Counter ID: {counter.id.substring(0, 8)}...</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border-2 border-gray-600">
              <div className="text-sm text-gray-400 mb-4">Simple Counter (No Indexes)</div>
              <p className="text-gray-500 mb-4">No counter created yet</p>
              <button
                onClick={createCounter}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Create Simple Counter
              </button>
            </div>
          )}

          {/* Indexed Counter */}
          {indexedCounter ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border-2 border-purple-500">
              <div className="text-sm text-purple-400 mb-4 font-bold">Indexed Counter (gameId + userId)</div>

              <div className="flex items-center justify-center space-x-6 mb-8">
                <button
                  onClick={decrementIndexed}
                  disabled={(indexedCounter.value || 0) === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold w-16 h-16 rounded-lg text-2xl transition-colors"
                >
                  −
                </button>

                <div className="text-6xl font-bold text-white min-w-[120px]">
                  {indexedCounter.value || 0}
                </div>

                <button
                  onClick={incrementIndexed}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold w-16 h-16 rounded-lg text-2xl transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-4">
                <p>Counter ID: {indexedCounter.id.substring(0, 8)}...</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border-2 border-gray-600">
              <div className="text-sm text-gray-400 mb-4">Indexed Counter (gameId + userId)</div>
              <p className="text-gray-500 mb-4">No counter created yet</p>
              <button
                onClick={createIndexedCounter}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Create Indexed Counter
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Test Instructions</h2>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• Create both counters to compare performance</li>
            <li>• Click + or - to increment/decrement each counter</li>
            <li>• Check console for timing logs:</li>
            <li className="ml-6">- "db.transact() took: XXms" (synchronous call time)</li>
            <li className="ml-6">- "CLICK TO RENDER: XXms" (total update time)</li>
            <li>• Compare simple vs indexed counter performance</li>
            <li>• The indexed counter has the same schema as the players table</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
