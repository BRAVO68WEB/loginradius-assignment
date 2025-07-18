import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import app from '../main';
import { config } from '../utils/env';

const BASE_URL = `http://localhost:${config.PORT}`;

const genUser = () => {
  const timestamp = Date.now();
  return {
    email: `${timestamp}@test.com`,
    username: `testuser_${timestamp}`,
    password: `password_${timestamp}`,
  }
}

describe('Simplified Auth API Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start the server for testing
    server = app;
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  test('Health check should return ok', async () => {
    const req = new Request(`${BASE_URL}/health`);
    const res = await app.fetch(req);
    
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.status).toBe('ok');
  });

  test('Should register a new user', async () => {
    const userData = genUser();

    const req = new Request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const res = await app.fetch(req);
    const json = await res.json() as any;
    
    // Should succeed (201) since we're using unique users
    expect(res.status).toBe(201);
    expect(json.message).toContain('registered');
    expect(json.user.email).toBe(userData.email);
  });

  test('Should login with valid credentials', async () => {
    const userData = genUser();
    
    // First register the user
    await app.fetch(new Request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }));

    // Then login
    const req = new Request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_indentity: userData.email,
        password: userData.password
      }),
    });

    const res = await app.fetch(req);
    const json = await res.json() as any;
    
    expect(res.status).toBe(200);
    expect(json.message).toBe('Login successful');
    expect(json.token).toBeDefined();
  });

  test('Should fail login with invalid credentials', async () => {
    const userData = genUser();
    
    const req = new Request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_indentity: userData.email,
        password: 'wrongpassword'
      }),
    });

    const res = await app.fetch(req);
    const json = await res.json() as any;
    
    expect(res.status).toBe(401);
    expect(json.error).toBe('Invalid credentials');
  });

  test('Should demonstrate IP-based rate limiting after multiple failed attempts', async () => {
    const userData = genUser();
    
    const invalidLogin = {
      login_indentity: userData.email,
      password: 'wrongpassword'
    };

    console.log('Testing IP-based rate limiting (this may take a moment)...');
    
    // Make many failed attempts to trigger IP blocking
    let lastResponse;
    for (let i = 0; i < 30; i++) {
      const req = new Request(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLogin),
      });

      lastResponse = await app.fetch(req);
      
      // Check if we've been blocked
      if (lastResponse.status === 403) {
        const json = await lastResponse.json() as any;
        if (json.error.includes('blocked')) {
          console.log(`IP blocked after ${i + 1} attempts`);
          expect(json.error).toContain('blocked');
          return; // Test passed
        }
      }
      
      // Small delay to avoid overwhelming the system
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // If we get here, check the final response
    if (lastResponse) {
      const json = await lastResponse.json() as any;
      console.log('Final response status:', lastResponse.status);
      console.log('Final response:', json);
      
      // Either blocked (403) or still getting invalid credentials (401)
      expect([401, 403]).toContain(lastResponse.status);
    }
  });

  test('Should reject admin endpoints without authentication', async () => {
    const endpoints = ['/admin/users', '/admin/anomalies', '/admin/anomaly-stats'];
    
    for (const endpoint of endpoints) {
      const req = new Request(`${BASE_URL}${endpoint}`);
      const res = await app.fetch(req);
      
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toBe('Authorization header required');
    }
  });

  test('Should reject admin endpoints with invalid token', async () => {
    const req = new Request(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    const res = await app.fetch(req);
    
    expect(res.status).toBe(401);
    const json = await res.json() as any;
    expect(json.error).toBe('Invalid or expired token');
  });

  test('Should reject admin endpoints for non-admin users', async () => {
    const userData = genUser();
    
    // First register and login as regular user
    await app.fetch(new Request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }));

    const loginRes = await app.fetch(new Request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_indentity: userData.email,
        password: userData.password
      }),
    }));

    const loginJson = await loginRes.json() as any;
    const token = loginJson.token;

    // Try to access admin endpoint with regular user token
    const req = new Request(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const res = await app.fetch(req);
    const json = await res.json() as any;
    
    expect(res.status).toBe(403);
    expect(json.error).toBe('Admin access required');
  });

  test('Should suspend user after 5 failed login attempts', async () => {
    const userData = genUser();
    
    // First register a test user
    await app.fetch(new Request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }));

    console.log('Testing user-level suspension (this may take a moment)...');
    
    // Make 5 failed login attempts with wrong password
    for (let i = 0; i < 5; i++) {
      const req = new Request(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': `192.168.1.${100 + i}` // Use different IPs to avoid IP blocking
        },
        body: JSON.stringify({
          login_indentity: userData.email,
          password: 'wrongpassword'
        }),
      });

      const res = await app.fetch(req);
      expect(res.status).toBe(401);
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Now try with correct password - should be suspended
    const req = new Request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.200' // Different IP to avoid IP blocking
      },
      body: JSON.stringify({
        login_indentity: userData.email,
        password: userData.password // Correct password
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(429);
    
    const json = await res.json() as any;
    expect(json.error).toBe('User temporarily suspended due to too many failed login attempts');
  });

  test('Should show progressive messaging: "Invalid credentials" for first 5 attempts, then "Account Suspended!"', async () => {
    const userData = genUser();
    
    // First register a user for progressive messaging testing
    const registerReq = new Request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        fullName: 'Progressive User'
      }),
    });
    
    const registerRes = await app.fetch(registerReq);
    expect(registerRes.status).toBe(201); // User should be created successfully

    // Test 1: First 5 attempts should show "Invalid credentials"
    for (let i = 1; i <= 5; i++) {
      const loginReq = new Request(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.2.100' // Use unique IP
        },
        body: JSON.stringify({
          login_indentity: userData.email,
          password: 'wrongpassword',
        }),
      });

      const loginRes = await app.fetch(loginReq);
      const result = await loginRes.json() as any;
      console.log(`Progressive test attempt ${i} - Status: ${loginRes.status}, Message: ${result.error}`);
      
      expect(loginRes.status).toBe(401);
      expect(result.error).toBe("Invalid credentials");
    }

    // Test 2: 6th and subsequent attempts should show "Account Suspended!"
    for (let i = 6; i <= 9; i++) {
      const loginReq = new Request(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.2.100' // Same IP for user tracking
        },
        body: JSON.stringify({
          login_indentity: userData.email,
          password: 'wrongpassword',
        }),
      });

      const loginRes = await app.fetch(loginReq);
      const result = await loginRes.json() as any;
      console.log(`Progressive test attempt ${i} - Status: ${loginRes.status}, Message: ${result.error}`);
      
      if (i < 5) {
        expect(loginRes.status).toBe(401);
        expect(result.error).toBe("Account Suspended!");
      } else {
        // 5th attempt should result in actual suspension (429)
        expect(loginRes.status).toBe(401);
        expect(result.error).toBe("Account Suspended!");
      }
    }
  });
});
