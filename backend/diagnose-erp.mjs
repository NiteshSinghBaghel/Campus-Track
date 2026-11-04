import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as qs from 'querystring';

const username = process.argv[2] || process.env.STUDENT_EMAIL;
const password = process.argv[3] || process.env.STUDENT_PASSWORD;
const baseUrl = process.env.DYPIU_BASE_URL || 'https://erp.dypiu.ac.in';

console.log('=== DYPIU Juno ERP Comprehensive Endpoint Diagnostics ===');
console.log(`Base URL: ${baseUrl}`);
console.log(`Username: ${username}`);

if (!username || !password || username.includes('@example.com')) {
  console.log('\n❌ Usage: node diagnose-erp.mjs <username> <password>');
  console.log('Please pass your real Juno username & password to run live diagnosis.');
  process.exit(1);
}

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    baseURL: baseUrl,
    jar,
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
);

async function diagnose() {
  try {
    console.log('\n1. Fetching login page...');
    const lp = await client.get('/login.htm');
    console.log(`   Login page status: ${lp.status}`);

    console.log('\n2. Posting credentials to /j_spring_security_check...');
    const res = await client.post('/j_spring_security_check', qs.stringify({
      j_username: username,
      j_password: password
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${baseUrl}/login.htm`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400
    });

    const loc = res.headers.location || '';
    console.log(`   Response status: ${res.status}, Location: ${loc}`);
    if (loc.includes('failure=true') || loc.includes('login_error') || res.status >= 400) {
      console.error('❌ Login failed! Invalid credentials or account locked.');
      return;
    }
    console.log('✅ Login successful!');

    const redirectPath = loc.startsWith('http') ? loc : `${baseUrl}${loc.startsWith('/') ? '' : '/'}${loc || 'home.htm'}`;
    await client.get(redirectPath, { headers: { 'Referer': `${baseUrl}/login.htm` } });
    const dashRes = await client.get('/stu_myDashBoard.htm', { headers: { 'Referer': `${baseUrl}/home.htm` } });
    console.log(`   Dashboard primed: ${dashRes.status}`);

    // Probe 1: Student ID
    try {
      const idRes = await client.get('/stu_getStudentIdFromSession.json');
      console.log(`\n3. [stu_getStudentIdFromSession.json]:`, idRes.data);
    } catch (e) {
      console.log(`\n3. [stu_getStudentIdFromSession.json] FAILED:`, e.message);
    }

    // Probe 2: Personal Information
    try {
      const piRes = await client.get('/stu_getPersonalInformation.json', { headers: { 'Referer': `${baseUrl}/stu_myDashBoard.htm` } });
      console.log(`\n4. [stu_getPersonalInformation.json]:`);
      console.log(JSON.stringify(piRes.data, null, 2));
    } catch (e) {
      console.log(`\n4. [stu_getPersonalInformation.json] FAILED:`, e.message);
    }

    // Probe 3: Academic Information
    let semesterICS = '';
    try {
      const aiRes = await client.get('/stu_getAcademicInformationForBothCources.json', { headers: { 'Referer': `${baseUrl}/stu_myDashBoard.htm` } });
      console.log(`\n5. [stu_getAcademicInformationForBothCources.json]:`);
      console.log(JSON.stringify(aiRes.data, null, 2));
      const parsed = typeof aiRes.data === 'string' ? JSON.parse(aiRes.data) : aiRes.data;
      if (Array.isArray(parsed) && parsed[0]?.AcademicInfo) {
        semesterICS = parsed[0].AcademicInfo.semester_ICS;
      }
    } catch (e) {
      console.log(`\n5. [stu_getAcademicInformationForBothCources.json] FAILED:`, e.message);
    }

    // Probe 4: Attendance Details
    try {
      const attRes = await client.get('/stu_getAttendanceDetails.json', { headers: { 'Referer': `${baseUrl}/stu_myDashBoard.htm` } });
      console.log(`\n6. [stu_getAttendanceDetails.json]:`);
      console.log(JSON.stringify(attRes.data, null, 2));
    } catch (e) {
      console.log(`\n6. [stu_getAttendanceDetails.json] FAILED:`, e.message);
    }

    // Probe 5: Attendance Graph / Distribution
    try {
      const graphRes = await client.post('/stu_getGraphForStudentAttendence.json', 'termId=All', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': `${baseUrl}/stu_myDashBoard.htm`
        }
      });
      console.log(`\n7. [stu_getGraphForStudentAttendence.json (termId=All)]:`);
      console.log(JSON.stringify(graphRes.data, null, 2));
    } catch (e) {
      console.log(`\n7. [stu_getGraphForStudentAttendence.json] FAILED:`, e.message);
    }

    // Probe 6: Today's Schedule with various date formats
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();

    const dateFormats = [
      `${d}/${m}/${y}`,       // DD/MM/YYYY
      `${d}-${m}-${y}`,       // DD-MM-YYYY
      `${y}-${m}-${d}`,       // YYYY-MM-DD
    ];

    for (const df of dateFormats) {
      try {
        const schedRes = await client.get(`/stu_getTodaysScheduleForStudentLoggedIn.json?date=${encodeURIComponent(df)}`, {
          headers: { 'Referer': `${baseUrl}/stu_myDashBoard.htm` }
        });
        console.log(`\n8. [stu_getTodaysScheduleForStudentLoggedIn.json (date=${df})]:`);
        console.log(JSON.stringify(schedRes.data, null, 2));
      } catch (e) {
        console.log(`\n8. [stu_getTodaysScheduleForStudentLoggedIn.json (date=${df})] FAILED:`, e.message);
      }
    }

    // Probe 7: Between Dates Timetable
    try {
      const start = `01/${m}/${y}`;
      const end = `30/${m}/${y}`;
      const ttRes = await client.get(`/stu_getBetweenDatesTimetableForStudentSP.json?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&termId=0`, {
        headers: { 'Referer': `${baseUrl}/stu_getBetweenDatesTimetableForStudentSP.htm` }
      });
      console.log(`\n9. [stu_getBetweenDatesTimetableForStudentSP.json (${start} to ${end})]:`);
      console.log(JSON.stringify(ttRes.data, null, 2));
    } catch (e) {
      console.log(`\n9. [stu_getBetweenDatesTimetableForStudentSP.json] FAILED:`, e.message);
    }

  } catch (err) {
    console.error('Fatal error during diagnosis:', err);
  }
}

diagnose();

