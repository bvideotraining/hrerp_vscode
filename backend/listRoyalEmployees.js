// Usage: node listRoyalEmployees.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listRoyalEmployees() {
  const branch = 'Royal';
  const departments = ['Administration', 'Academic'];
  const snap = await db.collection('employees').where('branch', '==', branch).get();
  const employees = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (departments.includes(data.department)) {
      employees.push({ id: doc.id, ...data });
    }
  });
  if (employees.length === 0) {
    console.log('No employees found for Royal branch in Administration or Academic departments.');
  } else {
    console.log('Employees found:', employees);
  }
  process.exit(0);
}

listRoyalEmployees().catch(err => {
  console.error('Error listing employees:', err);
  process.exit(1);
});
