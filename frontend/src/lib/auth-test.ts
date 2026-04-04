/**
 * AUTHENTICATION TESTING GUIDE
 * 
 * This file demonstrates how to test the authentication flow
 * between the frontend and backend.
 * 
 * NOTE: Auth uses HTTP-only cookies — tokens are managed by the server,
 * not accessible via JS. Use getMe() to verify session status.
 */

import { backendAuthService } from '@/lib/services/backend-auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

/**
 * TEST 1: Test Login with Backend API
 */
export async function testLogin() {
  console.log('🔐 Testing Login Flow...');
  
  try {
    const loginPayload = {
      email: 'test@company.com',
      password: 'TestPassword123!',
    };

    console.log('📤 Sending login request:', loginPayload);
    
    const response = await backendAuthService.login(loginPayload);
    
    console.log('✅ LOGIN SUCCESS!');
    console.log('📦 Response:', response);
    // JWT is stored in HTTP-only cookie, not accessible via JS
    console.log('🔑 Session established (HTTP-only cookie)');
    
    // Verify session via getMe
    const me = await backendAuthService.getMe();
    console.log('👤 Verified user via getMe():', me);
    
    return response;
  } catch (error) {
    console.error('❌ LOGIN FAILED:', error);
    throw error;
  }
}

/**
 * TEST 2: Test Signup with Backend API
 */
export async function testSignup() {
  console.log('🔐 Testing Signup Flow...');
  
  try {
    const signupPayload = {
      email: `testuser${Date.now()}@company.com`,
      password: 'TestPassword123!',
      fullName: 'Test User',
    };

    console.log('📤 Sending signup request:', signupPayload);
    
    const response = await backendAuthService.signup(signupPayload);
    
    console.log('✅ SIGNUP SUCCESS!');
    console.log('📦 Response:', response);
    console.log('🔑 Session established (HTTP-only cookie)');
    
    return response;
  } catch (error) {
    console.error('❌ SIGNUP FAILED:', error);
    throw error;
  }
}

/**
 * TEST 3: Test session validation via getMe
 */
export async function testJWTValidation() {
  console.log('🔐 Testing Session Validation...');
  
  try {
    const me = await backendAuthService.getMe();
    
    if (!me) {
      console.error('❌ No active session. Login first!');
      return;
    }

    console.log('✅ SESSION VALID!');
    console.log('👤 Current user:', me);
    
    return me;
  } catch (error) {
    console.error('❌ SESSION VALIDATION FAILED:', error);
    throw error;
  }
}

/**
 * TEST 4: Test Protected API Endpoint
 */
export async function testProtectedEndpoint() {
  console.log('🔐 Testing Protected Endpoint...');
  
  try {
    // Verify session exists first
    const me = await backendAuthService.getMe();
    if (!me) {
      throw new Error('No active session - login first!');
    }

    console.log('📤 Calling /api/employees with session cookie...');
    
    const response = await fetch(`${API_URL}/api/employees`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ PROTECTED ENDPOINT SUCCESS!');
    console.log('📦 Response:', data);
    
    return data;
  } catch (error) {
    console.error('❌ PROTECTED ENDPOINT FAILED:', error);
    throw error;
  }
}

/**
 * TEST 5: Test Session Expiration
 */
export async function testTokenExpiration() {
  console.log('⏱️ Testing Session Status...');
  
  try {
    const me = await backendAuthService.getMe();
    
    if (!me) {
      console.warn('⚠️ No active session (expired or not logged in)');
      return { active: false };
    }

    console.log('✅ Session is active');
    console.log('👤 User:', me.email);
    return { active: true, user: me };
  } catch (error) {
    console.error('❌ Session check failed:', error);
  }
}

/**
 * TEST 6: Test Logout
 */
export async function testLogout() {
  console.log('🔐 Testing Logout...');
  
  const meBefore = await backendAuthService.getMe();
  console.log('User before logout:', meBefore);
  
  await backendAuthService.logout();
  
  const meAfter = await backendAuthService.getMe();
  console.log('✅ LOGOUT SUCCESS!');
  console.log('User after logout:', meAfter);
}

/**
 * FULL TEST SUITE
 */
export async function runFullAuthTestSuite() {
  console.log('🚀 Starting Full Authentication Test Suite...\n');
  
  try {
    // Test 1: Signup
    console.log('\n=== TEST 1: SIGNUP ===');
    await testSignup();
    
    // Test 2: Session Validation
    console.log('\n=== TEST 2: SESSION VALIDATION ===');
    await testJWTValidation();
    
    // Test 3: Session Status
    console.log('\n=== TEST 3: SESSION STATUS ===');
    await testTokenExpiration();
    
    // Test 4: Protected Endpoint
    console.log('\n=== TEST 4: PROTECTED ENDPOINT ===');
    await testProtectedEndpoint();
    
    // Test 5: Logout
    console.log('\n=== TEST 5: LOGOUT ===');
    await testLogout();
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
  }
}

export default {
  testLogin,
  testSignup,
  testJWTValidation,
  testProtectedEndpoint,
  testTokenExpiration,
  testLogout,
  runFullAuthTestSuite,
};
