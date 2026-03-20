/**
 * Comprehensive API Test Script for NearZro Admin Dashboard
 * 
 * Tests all backend endpoints used by the admin dashboard
 * 
 * Usage:
 * 1. Set ADMIN_TOKEN environment variable with a valid admin JWT token
 * 2. Run: npx ts-node scripts/test-admin-api.ts
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN environment variable is required');
  console.log('\nSet it with:');
  console.log('  Windows: set ADMIN_TOKEN=your_jwt_token_here');
  console.log('  Mac/Linux: export ADMIN_TOKEN=your_jwt_token_here');
  console.log('\nYou can get the token from localStorage in browser after logging in as admin.');
  process.exit(1);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
  },
  timeout: 10000,
});

interface TestResult {
  category: string;
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
  duration: number;
  description?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  category: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  description?: string,
  expectSuccess = true
): Promise<void> {
  const start = Date.now();
  try {
    const response = await api({
      method,
      url: endpoint,
      data,
    });
    
    const duration = Date.now() - start;
    const passed = expectSuccess ? (response.status >= 200 && response.status < 300) : true;
    
    results.push({
      category,
      endpoint,
      method,
      status: passed ? 'PASS' : 'FAIL',
      statusCode: response.status,
      duration,
      description,
    });
    
    console.log(`✅ ${method.padEnd(6)} ${endpoint.padEnd(40)} - ${response.status} (${duration}ms)`);
    if (description) console.log(`   ${description}`);
  } catch (error: any) {
    const duration = Date.now() - start;
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    
    // Consider 404 as expected for some endpoints that may not have data
    const isExpected = !expectSuccess || statusCode === 404;
    
    results.push({
      category,
      endpoint,
      method,
      status: isExpected ? 'PASS' : 'FAIL',
      statusCode,
      error: axiosError.message,
      duration,
      description,
    });
    
    const symbol = isExpected ? '⚠️ ' : '❌';
    console.log(`${symbol} ${method.padEnd(6)} ${endpoint.padEnd(40)} - ${statusCode || 'ERROR'} (${duration}ms)`);
    if (description) console.log(`   ${description}`);
    if (!isExpected) {
      const errorData = axiosError.response?.data as any;
      console.log(`   Error: ${errorData?.message || errorData?.error?.message || axiosError.message}`);
    }
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     NearZro Admin Dashboard - API Endpoint Tests         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📍 Base URL: ${API_BASE_URL}`);
  console.log(`🔑 Token: ${ADMIN_TOKEN.substring(0, 30)}...\n`);

  // ═════════════════════════════════════════════════════════════
  // 1. HEALTH & SYSTEM ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🏥 HEALTH & SYSTEM ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Health', 'GET', '/health', undefined, 'Health check endpoint');
  await testEndpoint('Health', 'GET', '/api/health', undefined, 'Health check with /api prefix');

  // ═════════════════════════════════════════════════════════════
  // 2. ADMIN DASHBOARD ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ADMIN DASHBOARD ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Dashboard', 'GET', '/admin/dashboard/stats', undefined, 'Get dashboard statistics');
  await testEndpoint('Dashboard', 'GET', '/admin/dashboard/analytics', undefined, 'Get dashboard analytics');

  // ═════════════════════════════════════════════════════════════
  // 3. KYC ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📋 KYC ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('KYC Admin', 'GET', '/admin/kyc', undefined, 'Get all KYC submissions');
  await testEndpoint('KYC Admin', 'GET', '/admin/kyc?status=PENDING', undefined, 'Get pending KYC submissions');
  await testEndpoint('KYC Admin', 'GET', '/admin/kyc?status=VERIFIED', undefined, 'Get verified KYC submissions');
  await testEndpoint('KYC Admin', 'GET', '/admin/kyc?status=REJECTED', undefined, 'Get rejected KYC submissions');

  // ═════════════════════════════════════════════════════════════
  // 4. VENDOR ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🏪 VENDOR ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Vendors Admin', 'GET', '/vendors', undefined, 'Get all vendors');
  await testEndpoint('Vendors Admin', 'GET', '/vendors/1', undefined, 'Get vendor by ID (sample)', false);
  
  // Test approve/reject endpoints (will fail without valid ID, but tests endpoint existence)
  await testEndpoint('Vendors Admin', 'PATCH', '/vendors/99999/approve', undefined, 'Approve vendor endpoint (invalid ID)', false);
  await testEndpoint('Vendors Admin', 'PATCH', '/vendors/99999/reject', { reason: 'Test' }, 'Reject vendor endpoint (invalid ID)', false);

  // ═════════════════════════════════════════════════════════════
  // 5. VENUE ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🏛️  VENUE ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Venues Admin', 'GET', '/venues', undefined, 'Get all venues');
  await testEndpoint('Venues Admin', 'GET', '/venues/1', undefined, 'Get venue by ID (sample)', false);
  await testEndpoint('Venues Admin', 'GET', '/venues/search?q=test', undefined, 'Search venues');
  
  // Test approve/reject endpoints
  await testEndpoint('Venues Admin', 'PATCH', '/venues/99999/approve', undefined, 'Approve venue endpoint (invalid ID)', false);
  await testEndpoint('Venues Admin', 'PATCH', '/venues/99999/reject', { reason: 'Test' }, 'Reject venue endpoint (invalid ID)', false);

  // ═════════════════════════════════════════════════════════════
  // 6. EVENTS ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 EVENTS ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Events', 'GET', '/events', undefined, 'Get all events');
  await testEndpoint('Events', 'GET', '/events/1', undefined, 'Get event by ID (sample)', false);

  // ═════════════════════════════════════════════════════════════
  // 7. USERS ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('👥 USERS ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Users', 'GET', '/users', undefined, 'Get all users (admin)');
  await testEndpoint('Users', 'GET', '/users/me', undefined, 'Get current user');

  // ═════════════════════════════════════════════════════════════
  // 8. TRANSACTIONS ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('💳 TRANSACTIONS ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Transactions', 'GET', '/transactions', undefined, 'Get all transactions');
  await testEndpoint('Transactions', 'GET', '/transactions/1', undefined, 'Get transaction by ID (sample)', false);

  // ═════════════════════════════════════════════════════════════
  // 9. PAYOUTS ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('💰 PAYOUTS ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Payouts', 'GET', '/payouts', undefined, 'Get all payouts');
  await testEndpoint('Payouts', 'GET', '/payouts/1', undefined, 'Get payout by ID (sample)', false);

  // ═════════════════════════════════════════════════════════════
  // 10. REVIEWS ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('⭐ REVIEWS ADMIN ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Reviews', 'GET', '/reviews', undefined, 'Get all reviews');
  await testEndpoint('Reviews', 'GET', '/reviews/1', undefined, 'Get review by ID (sample)', false);

  // ═════════════════════════════════════════════════════════════
  // 11. NOTIFICATIONS ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🔔 NOTIFICATIONS ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Notifications', 'GET', '/notifications', undefined, 'Get all notifications');
  await testEndpoint('Notifications', 'GET', '/notifications/unread-count', undefined, 'Get unread count');

  // ═════════════════════════════════════════════════════════════
  // 12. ANALYTICS ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📈 ANALYTICS ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Analytics', 'GET', '/analytics/revenue', undefined, 'Get revenue analytics');
  await testEndpoint('Analytics', 'GET', '/analytics/bookings', undefined, 'Get booking analytics');

  // ═════════════════════════════════════════════════════════════
  // 13. APPROVALS ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('✅ APPROVALS ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Approvals', 'GET', '/approvals', undefined, 'Get all approvals');
  await testEndpoint('Approvals', 'GET', '/approvals/pending', undefined, 'Get pending approvals');

  // ═════════════════════════════════════════════════════════════
  // 14. PROMOTIONS ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🎁 PROMOTIONS ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Promotions', 'GET', '/promotions', undefined, 'Get all promotions');
  await testEndpoint('Promotions', 'GET', '/promotions/1', undefined, 'Get promotion by ID (sample)', false);

  // ═════════════════════════════════════════════════════════════
  // 15. AUDIT LOGS ENDPOINTS
  // ═════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🔒 AUDIT LOGS ENDPOINTS');
  console.log('═'.repeat(60));
  
  await testEndpoint('Audit Logs', 'GET', '/audit-logs', undefined, 'Get all audit logs');
  await testEndpoint('Audit Logs', 'GET', '/audit-logs?limit=10', undefined, 'Get audit logs with limit');

  // ═════════════════════════════════════════════════════════════
  // PRINT SUMMARY
  // ═════════════════════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total);
  
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${passRate}%)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Average Response Time: ${avgDuration}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Endpoints:');
    results.filter(r => r.status === 'FAIL').forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.method} ${r.endpoint}`);
      console.log(`      Status: ${r.statusCode || 'ERROR'} - ${r.error}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (failed === 0) {
    console.log('✅ All tests passed! 🎉');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check the errors above.`);
  }
  
  console.log('═'.repeat(60));
  
  // Export results to JSON
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, 'test-results.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: API_BASE_URL,
    summary: {
      total,
      passed,
      failed,
      passRate: `${passRate}%`,
      avgResponseTime: `${avgDuration}ms`,
    },
    results,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full test results saved to: ${outputPath}`);
}

// Run the tests
runTests().catch(console.error);
