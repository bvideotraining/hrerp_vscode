/**
 * seedBranchAssignments.js
 *
 * Migration script: creates branch_assignments sub-collection for every existing
 * employee who already has a `branchId` field set, using their existing `employeeCode`.
 *
 * Usage:  node seedBranchAssignments.js
 * Requires: npm install firebase-admin  (already in backend/package.json)
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../hrerpvs-firebase-adminsdk-fbsvc-70ed2c2ca4.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  console.log('Fetching all employees...');
  const employeesSnap = await db.collection('employees').get();
  console.log(`Found ${employeesSnap.size} employees.`);

  let seeded = 0;
  let skipped = 0;

  for (const empDoc of employeesSnap.docs) {
    const emp = empDoc.data();
    const employeeId = empDoc.id;
    const branchId = emp.branchId;
    const employeeCode = emp.employeeCode;

    if (!branchId) {
      console.log(`  SKIP ${emp.fullName || employeeId} — no branchId set`);
      skipped++;
      continue;
    }

    if (!employeeCode) {
      console.log(`  SKIP ${emp.fullName || employeeId} — no employeeCode set`);
      skipped++;
      continue;
    }

    // Check if assignment already exists (idempotent)
    const existingRef = db
      .collection('employees').doc(employeeId)
      .collection('branch_assignments').doc(branchId);
    const existing = await existingRef.get();

    if (existing.exists) {
      console.log(`  EXISTS ${emp.fullName || employeeId} → branch ${branchId}`);
      skipped++;
      continue;
    }

    await existingRef.set({
      employeeCode: employeeCode,
      branchId: branchId,
      isPrimary: true,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  SEEDED ${emp.fullName || employeeId} (${employeeCode}) → branch ${branchId}`);
    seeded++;
  }

  console.log(`\nDone. Seeded: ${seeded}, Skipped/Existed: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
