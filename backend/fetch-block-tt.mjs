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

  // Step 1: stu_studentPersonalInformationData.json
  const res1 = await adapter.api.get('/stu_studentPersonalInformationData.json', {
    headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_academicTimetableStudent.htm' }
  });
  console.log('Step 1 (studentPersonalInformationData):', res1.data);
  const info = res1.data[0];
  const bachSemId = info.bachSemId;
  console.log('bachSemId:', bachSemId);

  // Step 2: loadDistinctBlockTimetableSession.json
  const res2 = await adapter.api.get(`/loadDistinctBlockTimetableSession.json?batchSemesterCapacityIds=${bachSemId}`, {
    headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_academicTimetableStudent.htm' }
  });
  console.log('Step 2 (loadDistinctBlockTimetableSession):', res2.data);
  const blocks = res2.data;

  for (const block of blocks) {
    const blockId = block.blockTeachingTimeTableId;
    console.log(`\n=== Checking Block ${blockId} (${block.fromDate} to ${block.toDate}) ===`);

    // Step 3: getTimeSlotsForTemetableFromPlannedTimetable.json
    try {
      const res3 = await adapter.api.get(`/getTimeSlotsForTemetableFromPlannedTimetable.json?batchSemesterCapacityIds=0&blockTeachingTimeTableId=${blockId}`, {
        headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_academicTimetableStudent.htm' }
      });
      console.log('Step 3 (time slots):', res3.data);
    } catch (e) {
      console.log('Step 3 err:', e.message);
    }

    // Step 4: fetchPlannedTimeTableforAllBatches.json
    try {
      const res4 = await adapter.api.get(`/fetchPlannedTimeTableforAllBatches.json?batchSemesterCapacityIds=${bachSemId}&blockTeachingTimeTableId=${blockId}`, {
        headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_academicTimetableStudent.htm' }
      });
      console.log('Step 4 (planned timetable):', JSON.stringify(res4.data, null, 2));
      fs.writeFileSync(`./planned-tt-block-${blockId}.json`, JSON.stringify(res4.data, null, 2), 'utf8');
    } catch (e) {
      console.log('Step 4 err:', e.message);
    }
  }
}

main().catch(console.error);
