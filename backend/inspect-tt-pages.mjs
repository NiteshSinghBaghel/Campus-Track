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

  // 1. Check homeSchedule.js
  try {
    const res = await adapter.api.get('/scripts/commonJs/homeSchedule.js');
    console.log('=== homeSchedule.js === (size:', res.data.length, ')');
    console.log(res.data.slice(0, 1500));
  } catch (e) {
    console.log('homeSchedule.js err:', e.message);
  }

  // 2. Check stu_timetableStudent.htm
  try {
    const res = await adapter.api.get('/stu_timetableStudent.htm', {
      headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_myDashBoard.htm' }
    });
    console.log('=== stu_timetableStudent.htm === (size:', res.data.length, ')');
    fs.writeFileSync('./timetable-student.html', res.data, 'utf8');
    // Extract endpoints and scripts
    const eps = [...new Set([...res.data.matchAll(/(?:stu_[a-zA-Z0-9_-]+\.(?:htm|json))/g)].map(m => m[0]))];
    console.log('Endpoints in stu_timetableStudent.htm:', eps);
  } catch (e) {
    console.log('stu_timetableStudent.htm err:', e.message);
  }

  // 3. Check stu_academicTimetableStudent.htm
  try {
    const res = await adapter.api.get('/stu_academicTimetableStudent.htm', {
      headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_myDashBoard.htm' }
    });
    console.log('=== stu_academicTimetableStudent.htm === (size:', res.data.length, ')');
    fs.writeFileSync('./academic-timetable.html', res.data, 'utf8');
    const eps = [...new Set([...res.data.matchAll(/(?:stu_[a-zA-Z0-9_-]+\.(?:htm|json))/g)].map(m => m[0]))];
    console.log('Endpoints in stu_academicTimetableStudent.htm:', eps);
  } catch (e) {
    console.log('stu_academicTimetableStudent.htm err:', e.message);
  }
}

main().catch(console.error);
