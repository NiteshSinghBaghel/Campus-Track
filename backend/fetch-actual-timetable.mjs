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

  console.log('Fetching getStudentSuggestedTimeTable.json...');
  try {
    const res = await adapter.api.get('/getStudentSuggestedTimeTable.json', {
      headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_timetableStudent.htm' }
    });
    console.log('getStudentSuggestedTimeTable status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
    fs.writeFileSync('./suggested-timetable.json', JSON.stringify(res.data, null, 2), 'utf8');
  } catch (e) {
    console.log('getStudentSuggestedTimeTable err:', e.message);
  }

  console.log('Fetching getStudentConductedTimeTable.json...');
  try {
    const res2 = await adapter.api.get('/getStudentConductedTimeTable.json', {
      headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_timetableStudent.htm' }
    });
    console.log('getStudentConductedTimeTable status:', res2.status);
    console.log('Data:', JSON.stringify(res2.data, null, 2));
    fs.writeFileSync('./conducted-timetable.json', JSON.stringify(res2.data, null, 2), 'utf8');
  } catch (e) {
    console.log('getStudentConductedTimeTable err:', e.message);
  }
}

main().catch(console.error);
