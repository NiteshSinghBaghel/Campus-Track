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

  // 1. Fetch stu_myDashBoard.htm and search for all links/scripts mentioning timetable or schedule
  const dashRes = await adapter.api.get('/stu_myDashBoard.htm');
  const dashHtml = dashRes.data;
  console.log('Dashboard HTML size:', dashHtml.length);

  // Look for any hrefs or onclicks matching timetable or schedule
  const matches = [...dashHtml.matchAll(/(?:href|action|src)=["']([^"']*(?:time|sched|lecture|table)[^"']*)["']/gi)];
  console.log('Found links in dashboard:', matches.map(m => m[1]));

  // Also search for any JS functions or URLs in the script tags
  const jsMatches = [...dashHtml.matchAll(/(?:stu_[a-zA-Z0-9_-]+\.(?:htm|json))/g)];
  const uniqueEndpoints = [...new Set(jsMatches.map(m => m[0]))];
  console.log('Found endpoints in dashboard JS:', uniqueEndpoints);

  // Let's check common timetable URLs
  const candidateHtm = [
    '/stu_getBetweenDatesTimetableForStudentSP.htm',
    '/stu_viewTimeTable.htm',
    '/stu_timeTable.htm',
    '/stu_studentTimeTable.htm',
    '/stu_viewStudentTimetable.htm',
    '/stu_getTimeTable.htm',
    '/stu_batchWiseTimetable.htm'
  ];

  for (const page of candidateHtm) {
    try {
      const res = await adapter.api.get(page, {
        headers: { 'Referer': 'https://erp.dypiu.ac.in/stu_myDashBoard.htm' }
      });
      console.log(`Page ${page} status:`, res.status, 'size:', res.data?.length);
      if (res.status === 200 && res.data && typeof res.data === 'string' && !res.data.includes('login.htm')) {
        // Look for endpoints or table data inside this page
        const subEndpoints = [...new Set([...res.data.matchAll(/(?:stu_[a-zA-Z0-9_-]+\.(?:htm|json))/g)].map(m => m[0]))];
        console.log(`  -> Endpoints inside ${page}:`, subEndpoints);
      }
    } catch (e) {
      console.log(`Page ${page} err:`, e.response?.status || e.message);
    }
  }
}

main().catch(console.error);
