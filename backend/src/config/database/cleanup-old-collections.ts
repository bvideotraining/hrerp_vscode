/**
 * Cleanup Script — deletes old uppercase EMPLOYEES and USERS collections
 * Run with: npx ts-node src/config/database/cleanup-old-collections.ts
 */
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteCollection(db: admin.firestore.Firestore, collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`  ⚠️  "${collectionName}" is empty or does not exist — skipping.`);
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ✓ Deleted ${snapshot.size} document(s) from "${collectionName}"`);
  return snapshot.size;
}

async function cleanup() {
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
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  const db = admin.firestore();

  console.log('\n🔍 Listing all current collections before cleanup:');
  const before = await db.listCollections();
  for (const col of before) {
    const snap = await db.collection(col.id).get();
    console.log(`  - "${col.id}" (${snap.size} documents)`);
  }

  console.log('\n🗑️  Deleting old uppercase collections...');
  await deleteCollection(db, 'EMPLOYEES');
  await deleteCollection(db, 'USERS');

  console.log('\n✅ Collections after cleanup:');
  const after = await db.listCollections();
  for (const col of after) {
    const snap = await db.collection(col.id).get();
    console.log(`  - "${col.id}" (${snap.size} documents)`);
  }

  console.log('\n✓ Cleanup complete!');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
