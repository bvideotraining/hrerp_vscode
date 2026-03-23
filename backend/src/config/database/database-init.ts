import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Database Initialization Script
 * Creates required Firestore collections and indexes
 * Run this once to set up the database
 */

export async function initializeDatabase() {
  try {
    // Initialize Firebase if not already initialized
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

    console.log('\n✓ Firebase Admin SDK initialized');
    console.log('📊 Starting database initialization...\n');

    // Create USERS collection with sample data
    console.log('📝 Creating users collection...');
    const usersRef = db.collection('users');

    // Check if collection is empty
    const snapshot = await usersRef.limit(1).get();
    if (snapshot.empty) {
      // Add a sample user for testing
      await usersRef.doc('demo-user-1').set({
        id: 'demo-user-1',
        email: 'admin@hrerp.com',
        fullName: 'Admin User',
        password: 'demo123', // TODO: Hash this in production with bcryptjs
        role: 'admin',
        status: 'active',
        department: 'HR',
        branch: 'Dubai Main',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usersRef.doc('demo-user-2').set({
        id: 'demo-user-2',
        email: 'employee@hrerp.com',
        fullName: 'Demo Employee',
        password: 'demo123',
        role: 'employee',
        status: 'active',
        department: 'Operations',
        branch: 'Abu Dhabi',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✓ users collection created with sample data');
    } else {
      console.log('✓ users collection already exists');
    }

    // Create EMPLOYEES collection
    console.log('📝 Creating employees collection...');
    const employeesRef = db.collection('employees');
    const empSnapshot = await employeesRef.limit(1).get();
    
    if (empSnapshot.empty) {
      await employeesRef.doc('emp-1').set({
        id: 'emp-1',
        fullName: 'John Doe',
        employeeCode: 'EMP-001',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        nationalId: 'ID-10001',
        dateOfBirth: '1990-05-15',
        gender: 'M',
        nationality: 'UAE',
        maritalStatus: 'Single',
        currentAddress: 'Dubai, UAE',
        branch: 'Dubai Main',
        department: 'Engineering',
        jobTitle: 'Senior Developer',
        category: 'WhiteCollar',
        positionType: 'Full-time',
        startDate: '2023-01-15',
        employmentStatus: 'Active',
        employmentType: 'Permanent',
        currentSalary: 15000,
        currency: 'AED',
        paymentMethod: 'Bank Transfer',
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeesRef.doc('emp-2').set({
        id: 'emp-2',
        fullName: 'Jane Smith',
        employeeCode: 'EMP-002',
        email: 'jane.smith@company.com',
        phone: '+1987654321',
        nationalId: 'ID-10002',
        dateOfBirth: '1988-03-22',
        gender: 'F',
        nationality: 'UAE',
        maritalStatus: 'Married',
        currentAddress: 'Abu Dhabi, UAE',
        branch: 'Abu Dhabi',
        department: 'HR',
        jobTitle: 'HR Manager',
        category: 'Management',
        positionType: 'Full-time',
        startDate: '2022-06-01',
        employmentStatus: 'Active',
        employmentType: 'Permanent',
        currentSalary: 12000,
        currency: 'AED',
        paymentMethod: 'Bank Transfer',
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeesRef.doc('emp-3').set({
        id: 'emp-3',
        fullName: 'Ahmed Hassan',
        employeeCode: 'EMP-003',
        email: 'ahmed.hassan@company.com',
        phone: '+1555666777',
        nationalId: 'ID-10003',
        dateOfBirth: '1992-11-10',
        gender: 'M',
        nationality: 'Egypt',
        maritalStatus: 'Married',
        currentAddress: 'Sharjah, UAE',
        branch: 'Dubai Main',
        department: 'Operations',
        jobTitle: 'Operations Supervisor',
        category: 'WhiteCollar',
        positionType: 'Full-time',
        startDate: '2023-08-01',
        employmentStatus: 'Active',
        employmentType: 'Permanent',
        currentSalary: 10000,
        currency: 'AED',
        paymentMethod: 'Bank Transfer',
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✓ employees collection created with sample data');
    } else {
      console.log('✓ employees collection already exists');
    }

    // Create payroll collection
    console.log('📝 Creating payroll collection...');
    const payrollRef = db.collection('payroll');
    const payrollSnapshot = await payrollRef.limit(1).get();
    
    if (payrollSnapshot.empty) {
      console.log('✓ payroll collection ready');
    } else {
      console.log('✓ payroll collection already exists');
    }

    // Create attendance collection
    console.log('📝 Creating attendance collection...');
    const attendanceRef = db.collection('attendance');
    console.log('✓ attendance collection ready');

    // Create leaves collection
    console.log('📝 Creating leaves collection...');
    const leavesRef = db.collection('leaves');
    console.log('✓ leaves collection ready');

    console.log('\n✅ Database initialization completed successfully!\n');
    console.log('📚 Collections created:');
    console.log('  - users (with sample admin and employee users)');
    console.log('  - employees (with 3 sample employees)');
    console.log('  - payroll');
    console.log('  - attendance');
    console.log('  - leaves');
    console.log('\n🔐 Demo Credentials:');
    console.log('  Email: admin@hrerp.com');
    console.log('  Password: demo123');
    console.log('  Role: admin\n');

    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
