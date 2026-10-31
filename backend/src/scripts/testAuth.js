process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { initDb } = require('../config/db');
const { ensureDefaultAdmin } = require('../server');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('       SUBNEX Phase 1: Authentication & RBAC Tests');
  console.log('=======================================================\n');

  await initDb();
  await ensureDefaultAdmin();

  // -----------------------------------------------------------------
  // TEST 1: Password Complexity Enforcement (>8 chars, upper, lower, special)
  // -----------------------------------------------------------------
  console.log('[Group 1: Password Complexity & Email Validation]');

  // 1a. Too short (<= 8 characters)
  const shortRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'short@example.com',
      password: 'Ab1!', // 4 chars
      full_name: 'Short Tester',
    });
  assert(
    shortRes.status === 400 && shortRes.body.message.includes('Validation failed'),
    'Reject registration with password <= 8 characters'
  );

  // 1b. Missing uppercase
  const noUpperRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'noupper@example.com',
      password: 'password@123', // 12 chars, no uppercase
      full_name: 'No Upper',
    });
  assert(
    noUpperRes.status === 400 && noUpperRes.body.errors.some(e => e.includes('uppercase')),
    'Reject registration with password missing uppercase letter'
  );

  // 1c. Missing lowercase
  const noLowerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'nolower@example.com',
      password: 'PASSWORD@123', // 12 chars, no lowercase
      full_name: 'No Lower',
    });
  assert(
    noLowerRes.status === 400 && noLowerRes.body.errors.some(e => e.includes('lowercase')),
    'Reject registration with password missing lowercase letter'
  );

  // 1d. Missing special character
  const noSpecialRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'nospecial@example.com',
      password: 'Password123', // 11 chars, no special char
      full_name: 'No Special',
    });
  assert(
    noSpecialRes.status === 400 && noSpecialRes.body.errors.some(e => e.includes('special character')),
    'Reject registration with password missing special character'
  );

  // -----------------------------------------------------------------
  // TEST 2: Successful Customer Signup & Unique Email
  // -----------------------------------------------------------------
  console.log('\n[Group 2: Customer Signup & Unique Email]');

  const customerAData = {
    email: 'customer.alice@subnex.io',
    password: 'SecurePassword123!', // 17 chars, upper, lower, special
    full_name: 'Alice Johnson',
    company_name: 'Alice Ventures',
    phone: '+1-555-0100',
  };

  const signupRes = await request(app)
    .post('/api/v1/auth/register')
    .send(customerAData);
  assert(signupRes.status === 201, 'Customer Alice successfully registered (HTTP 201)');
  assert(signupRes.body.data.user.role === 'customer', 'Registered user has role "customer"');
  assert(!!signupRes.body.data.token, 'JWT token returned on registration');
  const customerAToken = signupRes.body.data.token;
  const customerAId = signupRes.body.data.user.id;

  // 2b. Duplicate Email Registration
  const duplicateRes = await request(app)
    .post('/api/v1/auth/register')
    .send(customerAData);
  assert(duplicateRes.status === 409, 'Duplicate email registration rejected with HTTP 409 Conflict');

  // Register second customer for isolation testing
  const customerBRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: 'customer.bob@subnex.io',
      password: 'BobSecurePassword@2026',
      full_name: 'Bob Smith',
    });
  assert(customerBRes.status === 201, 'Customer Bob successfully registered');
  const customerBToken = customerBRes.body.data.token;
  const customerBId = customerBRes.body.data.user.id;

  // -----------------------------------------------------------------
  // TEST 3: Login & JWT Verification
  // -----------------------------------------------------------------
  console.log('\n[Group 3: Login & JWT Authentication]');

  // 3a. Invalid credentials
  const badLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: customerAData.email,
      password: 'WrongPassword@123',
    });
  assert(badLoginRes.status === 401, 'Reject login with incorrect password (HTTP 401)');

  // 3b. Correct credentials
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: customerAData.email,
      password: customerAData.password,
    });
  assert(loginRes.status === 200, 'Customer login succeeds (HTTP 200)');
  assert(!!loginRes.body.data.token, 'JWT token returned on successful login');

  // 3c. Protected Profile Endpoint (/auth/me)
  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(meRes.status === 200, 'Authenticated /auth/me returns profile data');
  assert(meRes.body.data.id === customerAId, 'User ID in profile matches token identity');

  // -----------------------------------------------------------------
  // TEST 4: Forgot Password & Reset Password Flow
  // -----------------------------------------------------------------
  console.log('\n[Group 4: Forgot & Reset Password Flow]');

  // 4a. Request forgot password
  const forgotRes = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: customerAData.email });
  assert(forgotRes.status === 200, 'Forgot password request processed');
  const resetToken = forgotRes.body.data.devToken;
  assert(!!resetToken, 'Reset token generated');

  // 4b. Reset password with complex new password
  const newPassword = 'NewAlicePassword@2026';
  const resetRes = await request(app)
    .post('/api/v1/auth/reset-password')
    .send({
      token: resetToken,
      newPassword: newPassword,
    });
  assert(resetRes.status === 200, 'Password reset succeeded (HTTP 200)');

  // 4c. Old password no longer works
  const oldLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: customerAData.email,
      password: customerAData.password,
    });
  assert(oldLoginRes.status === 401, 'Old password fails after reset (HTTP 401)');

  // 4d. New password works
  const newLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: customerAData.email,
      password: newPassword,
    });
  assert(newLoginRes.status === 200, 'New password successfully authenticates');

  // 4e. Reusing token fails
  const reuseRes = await request(app)
    .post('/api/v1/auth/reset-password')
    .send({
      token: resetToken,
      newPassword: 'AnotherPassword@999',
    });
  assert(reuseRes.status === 400, 'Re-using already used reset token is rejected');

  // -----------------------------------------------------------------
  // TEST 5: Roles & Staff Account Creation (Admin Only)
  // -----------------------------------------------------------------
  console.log('\n[Group 5: Roles & Admin Staff Creation]');

  // 5a. Admin Login
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@subnex.io',
      password: 'Admin@Subnex2026!',
    });
  assert(adminLoginRes.status === 200, 'System Admin successfully logs in');
  assert(adminLoginRes.body.data.user.role === 'admin', 'Admin role verified');
  const adminToken = adminLoginRes.body.data.token;

  // 5b. Customer attempts to create Staff account -> MUST FAIL (403)
  const customerCreateStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${customerBToken}`)
    .send({
      email: 'unauthorized.staff@subnex.io',
      password: 'StaffPassword@2026',
      full_name: 'Unauthorized Staff',
    });
  assert(
    customerCreateStaffRes.status === 403,
    'Customer cannot create staff accounts (HTTP 403 Forbidden)'
  );

  // 5c. Admin creates Staff account -> MUST SUCCEED (201)
  const staffEmail = 'support.staff@subnex.io';
  const staffPassword = 'StaffPassword@2026';
  const adminCreateStaffRes = await request(app)
    .post('/api/v1/users/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: staffEmail,
      password: staffPassword,
      full_name: 'Sarah Connor',
      role: 'staff',
    });
  assert(adminCreateStaffRes.status === 201, 'Admin successfully created Staff account (HTTP 201)');
  assert(adminCreateStaffRes.body.data.role === 'staff', 'Created account has role "staff"');

  // 5d. Staff logs in
  const staffLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: staffEmail,
      password: staffPassword,
    });
  assert(staffLoginRes.status === 200, 'Staff user successfully logs in');
  const staffToken = staffLoginRes.body.data.token;

  // -----------------------------------------------------------------
  // TEST 6: Customer Data Isolation (Customers access only own data)
  // -----------------------------------------------------------------
  console.log('\n[Group 6: Customer Data Isolation]');

  // 6a. Alice tries to access Bob's user profile -> MUST FAIL (403)
  const aliceAccessBobRes = await request(app)
    .get(`/api/v1/users/${customerBId}`)
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(
    aliceAccessBobRes.status === 403,
    'Customer Alice cannot access Customer Bob profile (HTTP 403 Forbidden)'
  );

  // 6b. Alice accesses her own profile -> MUST SUCCEED (200)
  const aliceAccessSelfRes = await request(app)
    .get(`/api/v1/users/${customerAId}`)
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(aliceAccessSelfRes.status === 200, 'Customer Alice can access her own data (HTTP 200)');
  assert(aliceAccessSelfRes.body.data.email === customerAData.email, 'Alice profile data matches');

  // 6c. Staff accesses Customer Alice profile -> MUST SUCCEED (200)
  const staffAccessAliceRes = await request(app)
    .get(`/api/v1/users/${customerAId}`)
    .set('Authorization', `Bearer ${staffToken}`);
  assert(staffAccessAliceRes.status === 200, 'Staff can access Customer profile (HTTP 200)');

  // 6d. Customer attempts to list all users -> MUST FAIL (403)
  const customerListUsersRes = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${customerAToken}`);
  assert(
    customerListUsersRes.status === 403,
    'Customer cannot list system users (HTTP 403 Forbidden)'
  );

  // 6e. Admin lists all users -> MUST SUCCEED (200)
  const adminListUsersRes = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert(adminListUsersRes.status === 200, 'Admin can list system users (HTTP 200)');
  assert(Array.isArray(adminListUsersRes.body.data), 'User list returns array of users');

  console.log('\n=======================================================');
  console.log('  🎉 ALL PHASE 1 AUTHENTICATION TESTS PASSED!');
  console.log('=======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
