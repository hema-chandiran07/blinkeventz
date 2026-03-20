// src/audit/utils/hash-chain.util.ts
import * as crypto from 'crypto';

const ALGORITHM = 'sha256';

/**
 * Generates a hash for an audit log entry to ensure integrity
 */
export function computeHash(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash(ALGORITHM).update(payload).digest('hex');
}

/**
 * Computes a chain hash that includes the previous hash
 * This ensures tamper detection across audit log entries
 */
export function computeChainHash(
  previousHash: string | null,
  currentData: Record<string, unknown>,
): string {
  const currentHash = computeHash(currentData);
  
  if (!previousHash) {
    // First entry - use current hash as is
    return currentHash;
  }
  
  // Chain: combine previous hash with current data
  const chainPayload = `${previousHash}:${currentHash}`;
  return crypto.createHash(ALGORITHM).update(chainPayload).digest('hex');
}

/**
 * Verifies the integrity of an audit log entry
 * Returns true if the hash matches, false otherwise
 */
export function verifyHash(
  data: Record<string, unknown>,
  expectedHash: string,
): boolean {
  const actualHash = computeHash(data);
  return actualHash === expectedHash;
}

/**
 * Verifies the chain integrity across multiple entries
 * Returns true if all entries form a valid chain
 */
export function verifyChain(
  entries: Array<{ data: Record<string, unknown>; hash: string }>,
): boolean {
  if (entries.length === 0) return true;
  
  let previousHash: string | null = null;
  
  for (const entry of entries) {
    const expectedChainHash = computeChainHash(previousHash, entry.data);
    
    if (expectedChainHash !== entry.hash) {
      return false;
    }
    
    previousHash = entry.hash;
  }
  
  return true;
}

/**
 * Generates a unique hash for an audit entry including metadata
 */
export function generateAuditHash(
  entityType: string,
  entityId: string,
  action: string,
  actorId: number | undefined,
  timestamp: Date,
): string {
  const payload = `${entityType}:${entityId}:${action}:${actorId || 'system'}:${timestamp.toISOString()}`;
  return crypto.createHash(ALGORITHM).update(payload).digest('hex');
}
