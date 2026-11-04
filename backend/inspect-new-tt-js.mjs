import fs from 'fs';
import { decrypt } from './dist/utils/crypto.js';
import { DYPIUJunoAdapter } from './dist/adapters/juno/DYPIUJunoAdapter.js';

async function main() {
  const accounts = JSON.parse(fs.readFileSync('./data/accounts.json', 'utf8'));
  const acc = accounts[0];
  const username = decrypt(acc.encryptedUsername);
  const password = decrypt(acc.encryptedPassword);

  const adapter = new DYPIUJunoAdapter('https://erp.dypiu.ac.in', true);
  await adapter.authenticate(username, password);

  const res = await adapter.api.get('/studentMPW/scripts/studentTimeTableNew.js', {
    headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_academicTimetableStudent.htm' }
  });
  console.log('studentTimeTableNew.js size:', res.data.length);
  fs.writeFileSync('./studentTimeTableNew.js', res.data, 'utf8');

  // Find all ajax calls or .json endpoints
  const urls = [...res.data.matchAll(/['"]([^'"]+\.json[^'"]*)['"]/g)].map(m => m[1]);
  console.log('JSON URLs in studentTimeTableNew.js:', [...new Set(urls)]);
}

main().catch(console.error);
