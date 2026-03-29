const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, '..', 'hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json');
const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const DEFAULT_DEDUCTION_SCHEDULE = [
  { upToMinutes: 60, days: 0 },
  { upToMinutes: 120, days: 1 },
  { upToMinutes: 180, days: 2 },
  { upToMinutes: 240, days: 3 },
  { upToMinutes: 300, days: 4 },
  { upToMinutes: 360, days: 5 },
  { upToMinutes: 9999, days: 6 },
];

async function main() {
  const snap = await db.collection('attendance_rules').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.deductionSchedule || data.deductionSchedule.length === 0) {
      await db.collection('attendance_rules').doc(doc.id).update({
        deductionSchedule: DEFAULT_DEDUCTION_SCHEDULE,
      });
      console.log(`Fixed: ${doc.id} - deductionSchedule written`);
    } else {
      console.log(`OK: ${doc.id} - already has deductionSchedule (${data.deductionSchedule.length} entries)`);
    }
  }
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
