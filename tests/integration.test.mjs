import assert from 'node:assert';
import test from 'node:test';
import { encrypt, decrypt } from '../backend/dist/utils/crypto.js';
import { DYPIUJunoAdapter } from '../backend/dist/adapters/juno/DYPIUJunoAdapter.js';
import { multiAccountService } from '../backend/dist/services/multiAccountService.js';
import { groupAttendanceEngine } from '../backend/dist/services/groupAttendanceEngine.js';

test('Security: AES-256-GCM Encryption & Decryption roundtrip', () => {
  const secret = 'dypiu-student-password-12345';
  const encrypted = encrypt(secret);
  assert.notStrictEqual(encrypted, secret);
  assert.ok(encrypted.includes(':'), 'Token should contain iv:tag:ciphertext structure');

  const decrypted = decrypt(encrypted);
  assert.strictEqual(decrypted, secret, 'Decrypted value must match original plaintext');
});

test('Adapter: DYPIUJunoAdapter target and university code', () => {
  const adapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in');
  assert.strictEqual(adapter.universityCode, 'DYPIU');
  assert.strictEqual(adapter.baseUrl, 'https://erp.dypiu.ac.in');
});

test('Multi-Account Service: Isolation and Account Retrieval', () => {
  const accounts = multiAccountService.getAccounts('user-default');
  assert.ok(accounts.length >= 3, 'Should have initial connected accounts');
  const primary = accounts.find(a => a.isPrimary);
  assert.ok(primary, 'Must designate a primary student account');
  assert.strictEqual(primary.prn, 'DYPIU2023001');
});

test('One-Scan Attendance Engine: Batch Dispatch and Confirmation Tracking', async () => {
  const qrMock = JSON.stringify({
    sessionId: 'DYP-TEST-SESSION-999',
    subjectCode: 'CS301',
    subjectName: 'Software Engineering',
    facultyName: 'Dr. M. Kulkarni'
  });

  const batch = await groupAttendanceEngine.processOneScan({
    userId: 'user-default',
    qrPayload: qrMock
  });

  assert.ok(batch.sessionId.startsWith('SESSION-'));
  assert.strictEqual(batch.subjectCode, 'CS301');
  assert.strictEqual(batch.subjectName, 'Software Engineering');
  assert.strictEqual(batch.totalEligible, 3, 'Should process all 3 connected accounts');
  assert.strictEqual(batch.results.length, 3, 'Must return individual results for each student');
});

