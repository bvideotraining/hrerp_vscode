// Usage: node checkAndFixUserRole.js <userId>
// Requires: npm install firebase-admin

const admin = require('firebase-admin');
const path = require('path');

// Path to your service account key
const serviceAccount = require(path.resolve(__dirname, '../hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndFixUserRole(userId) {
  if (!userId) {
    console.error('Usage: node checkAndFixUserRole.js <userId>');
    process.exit(1);
  }

  const userRef = db.collection('systemUser').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    console.error(`User document not found for userId: ${userId}`);
    process.exit(1);
  }

  const data = doc.data();
  const roleField = data.role !== undefined ? 'role' : (data.roleId !== undefined ? 'roleId' : null);

  if (!roleField) {
    console.error('No role or roleId field found in user document.');
    process.exit(1);
  }

  if (data[roleField] === 'branch_approver') {
    console.log(`User ${userId} already has role '${data[roleField]}'. No update needed.`);
    process.exit(0);
  }

  await userRef.update({ [roleField]: 'branch_approver' });
  console.log(`Updated user ${userId}: set ${roleField} to 'branch_approver'.`);
}

const userId = process.argv[2];
checkAndFixUserRole(userId).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
