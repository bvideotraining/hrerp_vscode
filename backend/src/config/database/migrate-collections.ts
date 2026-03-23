import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateData() {
  if (!admin.apps.length) {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: 'key-id',
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: 'client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  const db = admin.firestore();

  // Migrate USERS -> users
  console.log('Migrating USERS -> users...');
  const oldUsers = await db.collection('USERS').get();
  for (const doc of oldUsers.docs) {
    const existing = await db.collection('users').doc(doc.id).get();
    if (!existing.exists) {
      await db.collection('users').doc(doc.id).set(doc.data());
      console.log(`  Migrated user: ${doc.data().email}`);
    } else {
      console.log(`  Skipped (already exists): ${doc.data().email}`);
    }
  }

  // Migrate EMPLOYEES -> employees  
  console.log('Migrating EMPLOYEES -> employees...');
  const oldEmps = await db.collection('EMPLOYEES').get();
  for (const doc of oldEmps.docs) {
    const existing = await db.collection('employees').doc(doc.id).get();
    if (!existing.exists) {
      await db.collection('employees').doc(doc.id).set(doc.data());
      console.log(`  Migrated employee: ${doc.data().name || doc.data().fullName}`);
    } else {
      console.log(`  Skipped (already exists): ${doc.data().name || doc.data().fullName}`);
    }
  }

  console.log('\n✅ Migration complete!');

  // Verify
  const users = await db.collection('users').get();
  console.log(`\nusers: ${users.size} documents`);
  users.forEach(d => console.log(`  - ${d.data().email} (${d.data().role})`));

  const emps = await db.collection('employees').get();
  console.log(`employees: ${emps.size} documents`);
  emps.forEach(d => console.log(`  - ${d.data().fullName || d.data().name} (${d.data().jobTitle || d.data().position})`));

  process.exit(0);
}

migrateData().catch(err => { console.error(err); process.exit(1); });
