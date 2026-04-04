// Usage: node addDummyEmployees.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const branch = 'Royal';
const departments = ['Administration', 'Academic'];
const dummyEmployees = [
  {
    fullName: 'John Doe',
    employeeCode: 'EMP-10122',
    branch,
    department: 'Administration',
    jobTitle: 'Accountant',
    category: 'Management',
    email: 'john.doe@dummy.com',
    employmentStatus: 'Active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    fullName: 'Jane Smith',
    employeeCode: 'EMP-10123',
    branch,
    department: 'Academic',
    jobTitle: 'Teacher',
    category: 'Academic',
    email: 'jane.smith@dummy.com',
    employmentStatus: 'Active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    fullName: 'Michael Brown',
    employeeCode: 'EMP-10124',
    branch,
    department: 'Administration',
    jobTitle: 'HR Assistant',
    category: 'Support',
    email: 'michael.brown@dummy.com',
    employmentStatus: 'Active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    fullName: 'Emily White',
    employeeCode: 'EMP-10125',
    branch,
    department: 'Academic',
    jobTitle: 'Lab Assistant',
    category: 'Academic',
    email: 'emily.white@dummy.com',
    employmentStatus: 'Active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function addEmployees() {
  for (const emp of dummyEmployees) {
    const ref = db.collection('employees').doc();
    await ref.set(emp);
    console.log(`Added dummy employee: ${emp.fullName}`);
  }
  console.log('All dummy employees added.');
  process.exit(0);
}

addEmployees().catch(err => {
  console.error('Error adding dummy employees:', err);
  process.exit(1);
});
