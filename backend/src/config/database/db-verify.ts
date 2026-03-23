import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
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

  // List collections
  const collections = await db.listCollections();
  console.log('\n📚 Firestore Collections:');
  for (const col of collections) {
    console.log(`  - ${col.id}`);
  }

  // Show users (lowercase)
  const users = await db.collection('users').get();
  console.log(`\n👥 users (${users.size} documents):`);
  users.forEach((doc) => {
    const d = doc.data();
    console.log(`  [${doc.id}] ${d.email} | ${d.fullName} | role: ${d.role} | status: ${d.status}`);
  });

  // Show employees (lowercase)
  const emps = await db.collection('employees').get();
  console.log(`\n🏢 employees (${emps.size} documents):`);
  emps.forEach((doc) => {
    const d = doc.data();
    console.log(`  [${doc.id}] ${d.fullName || d.name} | ${d.jobTitle || d.position} | ${d.employmentStatus || d.status}`);
  });

  console.log('\n✅ Database verification complete\n');
  process.exit(0);
}

verifyDatabase().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
