/**
 * Safely extracts and parses JSON from LLM responses
 * Handles:
 *  - ```json blocks
 *  - plain JSON
 *  - accidental text before/after JSON
 */
export function cleanAndParseJSON<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('AI response is empty or invalid');
  }

  let cleaned = raw.trim();

  // Remove ```json and ``` wrappers
  cleaned = cleaned.replace(/```json/gi, '');
  cleaned = cleaned.replace(/```/g, '');

  // Attempt to extract first JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in AI response');
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse AI JSON response: ${(err as Error).message}`,
    );
  }
}
