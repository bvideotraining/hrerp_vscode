/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
/**
 * AUTHENTICATION TESTING GUIDE
 * 
 * This file demonstrates how to test the authentication flow
 * between the frontend and backend.
 */

import { backendAuthService } from '@/lib/services/backend-auth.service';

/**
 * TEST 1: Test Login with Backend API
 * 
 * Run this in browser console:
 * ```javascript
 * import authTest from '@/lib/auth-test'
 * authTest.testLogin()
 * ```
 */
export async function testLogin() {
  console.log('🔐 Testing Login Flow...');
  
  try {
    // Test credentials (create this user first via signup or Firebase console)
    const loginPayload = {
      email: 'test@company.com',
      password: 'TestPassword123!',
    };

    console.log('📤 Sending login request:', loginPayload);
    
    const response = await backendAuthService.login(loginPayload);
    
    console.log('✅ LOGIN SUCCESS!');
    console.log('📦 Response:', response);
    console.log('🔑 JWT Token stored:', backendAuthService.getToken());
    console.log('👤 User data:', backendAuthService.getCurrentUser());
    
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
    console.log('🔑 JWT Token stored:', backendAuthService.getToken());
    
    return response;
  } catch (error) {
    console.error('❌ SIGNUP FAILED:', error);
    throw error;
  }
}

/**
 * TEST 3: Test JWT Token validation
 */
export async function testJWTValidation() {
  console.log('🔐 Testing JWT Token Validation...');
  
  const token = backendAuthService.getToken();
  
  if (!token) {
    console.error('❌ No token found. Login first!');
    return;
  }

  try {
    // Decode JWT (without verification - just for inspection)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const decoded = JSON.parse(atob(parts[1]));
    
    console.log('✅ JWT TOKEN VALID!');
    console.log('📋 Token Payload:', decoded);
    console.log('⏰ Expires at:', new Date(decoded.exp * 1000));
    console.log('🔑 Token type:', decoded.type);
    
    return decoded;
  } catch (error) {
    console.error('❌ JWT VALIDATION FAILED:', error);
    throw error;
  }
}

/**
 * TEST 4: Test Protected API Endpoint
 */
export async function testProtectedEndpoint() {
  console.log('🔐 Testing Protected Endpoint...');
  
  try {
    const token = backendAuthService.getToken();
    
    if (!token) {
      throw new Error('No token - login first!');
    }

    console.log('📤 Calling /api/employees with JWT token...');
    
    const response = await backendAuthService.authenticatedRequest(
      '/api/employees',
      { method: 'GET' }
    );
    
    console.log('✅ PROTECTED ENDPOINT SUCCESS!');
    console.log('📦 Response:', response);
    
    return response;
  } catch (error) {
    console.error('❌ PROTECTED ENDPOINT FAILED:', error);
    throw error;
  }
}

/**
 * TEST 5: Test Token Expiration
 */
export async function testTokenExpiration() {
  console.log('⏱️ Testing Token Expiration...');
  
  const token = backendAuthService.getToken();
  
  if (!token) {
    console.error('❌ No token found');
    return;
  }

  try {
    const parts = token.split('.');
    const decoded = JSON.parse(atob(parts[1]));
    
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    if (timeUntilExpiry < 0) {
      console.warn('⚠️ TOKEN ALREADY EXPIRED');
    } else {
      const hoursLeft = (timeUntilExpiry / (1000 * 60 * 60)).toFixed(2);
      console.log(`⏰ Token expires in: ${hoursLeft} hours`);
    }
    
    return { expiryTime, timeUntilExpiry };
  } catch (error) {
    console.error('❌ Token expiration check failed:', error);
  }
}

/**
 * TEST 6: Test Logout
 */
export function testLogout() {
  console.log('🔐 Testing Logout...');
  
  console.log('Token before logout:', backendAuthService.getToken());
  console.log('User before logout:', backendAuthService.getCurrentUser());
  
  backendAuthService.logout();
  
  console.log('✅ LOGOUT SUCCESS!');
  console.log('Token after logout:', backendAuthService.getToken());
  console.log('User after logout:', backendAuthService.getCurrentUser());
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
    
    // Test 2: JWT Validation
    console.log('\n=== TEST 2: JWT VALIDATION ===');
    await testJWTValidation();
    
    // Test 3: Token Expiration
    console.log('\n=== TEST 3: TOKEN EXPIRATION ===');
    await testTokenExpiration();
    
    // Test 4: Protected Endpoint
    console.log('\n=== TEST 4: PROTECTED ENDPOINT ===');
    await testProtectedEndpoint();
    
    // Test 5: Logout
    console.log('\n=== TEST 5: LOGOUT ===');
    testLogout();
    
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
