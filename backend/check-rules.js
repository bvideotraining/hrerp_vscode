const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, '..', 'hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json');
const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function main() {
  console.log('\n=== attendance_rules collection ===');
  const rules = await db.collection('attendance_rules').get();
  if (rules.empty) {
    console.log('EMPTY - no rules in Firestore');
  } else {
    rules.docs.forEach((doc) => {
      const d = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  category: ${d.category}`);
      console.log(`  freeMinutes: ${d.freeMinutes}`);
      console.log(`  deductionSchedule: ${JSON.stringify(d.deductionSchedule)}`);
    });
  }

  console.log('\n=== attendance records for EMP-10497 (March 2026) ===');
  const byEmployeeId = await db.collection('attendance').where('employeeId', '==', 'EMP-10497').get();
  if (byEmployeeId.empty) {
    console.log('No records with employeeId=EMP-10497, trying employeeCode...');
    const byEmployeeCode = await db.collection('attendance').where('employeeCode', '==', 'EMP-10497').get();
    console.log(`Found ${byEmployeeCode.size} records by employeeCode`);
    byEmployeeCode.docs.slice(0, 3).forEach((doc) => console.log(JSON.stringify(doc.data())));
  } else {
    console.log(`Found ${byEmployeeId.size} records`);
    const march = byEmployeeId.docs.filter((d) => {
      const date = d.data().date || '';
      return date.startsWith('2026-03') || date.startsWith('2026-02');
    });
    console.log(`March/Feb 2026 records: ${march.length}`);
    let total = 0;
    march.forEach((doc) => {
      const d = doc.data();
      total += d.lateMinutes || 0;
      console.log(`  date:${d.date} late:${d.lateMinutes} category:${d.category} deductionDays:${d.deductionDays}`);
    });
    console.log(`  TOTAL lateMinutes: ${total}`);
  }

  console.log('\n=== employee document ===');
  const emps = await db.collection('employees').where('employeeCode', '==', 'EMP-10497').limit(1).get();
  if (!emps.empty) {
    const e = emps.docs[0].data();
    console.log(`  id: ${emps.docs[0].id}`);
    console.log(`  fullName: ${e.fullName}`);
    console.log(`  category: ${e.category}`);
    console.log(`  employeeCode: ${e.employeeCode}`);
  } else {
    console.log('No employee found with code EMP-10497');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
