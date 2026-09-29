// Backup wire format — the single source of truth shared by the mobile client
// and this API. Keep in sync with src/services/backupService.ts (mobile).
//
// The payload envelope is deliberately small and stable:
//
//   {
//     "backupVersion": 2,
//     "appVersion": "1.0.0",
//     "createdAt": "2026-09-28T12:30:00.000Z",
//     "userId": "<server-side user id, always the JWT subject>",
//     "checksum": "<sha256 hex of the canonical data string>",
//     "recordCounts": { "entities": 10, "timelines": 50, ... },
//     "data": { ... }          // plain JSON object
//   }
//
// Notes:
//  - `userId` inside the payload is CROSS-CHECKED, never trusted. The stored
//    row's userId always comes from the verified JWT subject (req.user.id).
//  - The envelope never contains credentials: no access token, password or
//    SecureStore material is ever part of a backup.
//  - `checksum` is verified here on upload and again by the client on restore.

import { createHash } from 'node:crypto';

export const BACKUP_VERSION_MIN = 1;
export const BACKUP_VERSION_MAX = 2;
export const CURRENT_BACKUP_VERSION = 2;

/** 12 MB of payload; comfortably above a real user's dataset. */
export const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;

/**
 * Only plain JSON is accepted.
 *
 * The wire format reserves an `encoding` field so a future version can add
 * compression, but accepting `gzip+base64` today would be actively unsafe: the
 * server can only verify the checksum of the *bytes it was given*, and a client
 * that decompresses before hashing would compute a different digest, so every
 * such backup would be permanently unrestorable. Rejecting it here keeps a
 * corrupt-by-design format out of the database. The column stays so existing
 * rows and future clients are not affected.
 */
export const ALLOWED_ENCODINGS = ['json'] as const;
export type BackupEncoding = (typeof ALLOWED_ENCODINGS)[number];

/** Keys that must never appear anywhere in a stored backup payload. */
const FORBIDDEN_KEYS = [
  'password',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'token',
  'secret',
  'jwt',
  'authorization',
];

export type BackupEnvelope = {
  backupVersion: number;
  appVersion?: string | null;
  createdAt?: string | null;
  userId?: string | null;
  checksum?: string | null;
  recordCounts?: Record<string, number> | null;
  data?: unknown;
  encoding?: string | null;
};

export type BackupMetadata = {
  id: string;
  backupVersion: number;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
  appVersion: string | null;
  checksum: string | null;
  encoding: string;
  recordCounts: Record<string, number>;
};

/**
 * Deterministic JSON serialization (recursively sorted object keys) so the
 * same logical data always hashes to the same value, regardless of the key
 * order the client happened to serialize.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`)
    .join(',')}}`;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** SHA-256 of the canonical `data` section — the integrity fingerprint. */
export function checksumOfData(data: unknown): string {
  return sha256Hex(canonicalStringify(data));
}

/**
 * Walks the payload and reports any credential-shaped key. Depth is bounded so
 * a hostile payload cannot cause a stack overflow.
 */
export function findForbiddenKeys(
  value: unknown,
  path = '$',
  depth = 0,
): string[] {
  if (depth > 12 || value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      found.push(...findForbiddenKeys(item, `${path}[${i}]`, depth + 1)),
    );
    return found;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
      found.push(`${path}.${key}`);
    }
    found.push(...findForbiddenKeys(child, `${path}.${key}`, depth + 1));
  }
  return found;
}

/** Coerces a stored JSONB value into a plain record, or null. */
export function asRecord(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n) && n >= 0) out[key] = n;
  }
  return out;
}

/** Normalizes client-supplied metadata for storage/response. */
export function readRecordCounts(value: unknown): Record<string, number> {
  return asRecord(value) ?? {};
}

export function toMetadata(row: {
  id: string;
  backupVersion: number;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
  appVersion: string | null;
  checksum: string | null;
  encoding: string;
  recordCounts: unknown;
}): BackupMetadata {
  return {
    id: row.id,
    backupVersion: row.backupVersion,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    appVersion: row.appVersion,
    checksum: row.checksum,
    encoding: row.encoding,
    recordCounts: asRecord(row.recordCounts) ?? {},
  };
}
