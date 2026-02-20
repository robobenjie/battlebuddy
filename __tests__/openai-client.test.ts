import { describe, expect, it } from 'vitest';
import { getOpenAIClient } from '../lib/openai-client';

describe('getOpenAIClient', () => {
  it('throws when OPENAI_API_KEY is missing', () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      expect(() => getOpenAIClient()).toThrow('Missing OPENAI_API_KEY environment variable');
    } finally {
      if (previous === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previous;
      }
    }
  });
});
