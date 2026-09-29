import {
  canonicalStringify,
  checksumOfData,
  findForbiddenKeys,
  readRecordCounts,
  sha256Hex,
  toMetadata,
} from './backup-format';

describe('backup-format', () => {
  describe('canonicalStringify', () => {
    it('is stable regardless of key insertion order', () => {
      const a = { b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } };
      const b = { a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 };
      expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    });

    it('preserves array ordering', () => {
      expect(canonicalStringify([1, 2, 3])).not.toBe(canonicalStringify([3, 2, 1]));
    });
  });

  describe('checksumOfData', () => {
    it('hashes the canonical JSON with SHA-256', () => {
      expect(checksumOfData({ hello: 'world' })).toBe(
        sha256Hex('{"hello":"world"}'),
      );
    });

    it('agrees with the published SHA-256 of "hello world"', () => {
      expect(sha256Hex('hello world')).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
      );
    });

    it('changes when the data changes', () => {
      expect(checksumOfData({ a: 1 })).not.toBe(checksumOfData({ a: 2 }));
    });
  });

  describe('findForbiddenKeys', () => {
    it('finds credential keys at any depth', () => {
      const found = findForbiddenKeys({
        data: { notes: [{ id: 'n1', password: 'x' }], auth: { accessToken: 'y' } },
      });
      expect(found).toHaveLength(2);
    });

    it('ignores ordinary content fields', () => {
      expect(
        findForbiddenKeys({
          data: { notes: [{ id: 'n1', title: 'Shopping', content: 'spent 100' }] },
        }),
      ).toEqual([]);
    });

    it('is depth bounded', () => {
      let deep: Record<string, unknown> = { password: 'x' };
      for (let i = 0; i < 40; i += 1) deep = { nested: deep };
      expect(() => findForbiddenKeys(deep)).not.toThrow();
    });
  });

  describe('readRecordCounts', () => {
    it('keeps only finite non-negative numbers', () => {
      expect(readRecordCounts({ entities: 10, notes: 'x', bad: -1, ok: 0 })).toEqual({
        entities: 10,
        ok: 0,
      });
    });

    it('returns an empty object for junk input', () => {
      expect(readRecordCounts(null)).toEqual({});
      expect(readRecordCounts([1, 2])).toEqual({});
    });
  });

  describe('toMetadata', () => {
    it('never leaks the payload into metadata', () => {
      const meta = toMetadata({
        id: 'b1',
        backupVersion: 2,
        sizeBytes: 5,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        appVersion: '1.0.0',
        checksum: 'abc',
        encoding: 'json',
        recordCounts: { entities: 1 },
      } as never);

      expect(meta).toEqual({
        id: 'b1',
        backupVersion: 2,
        sizeBytes: 5,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        appVersion: '1.0.0',
        checksum: 'abc',
        encoding: 'json',
        recordCounts: { entities: 1 },
      });
      expect(meta).not.toHaveProperty('payload');
    });
  });
});
