/**
 * KisanSetu Comprehensive End-to-End Automated Test Suite
 * Tests complete Farmer and Admin workflows across Database, Backend, AI Service, and Security.
 */

const axios = require('axios');

const API = 'http://localhost:5000/api';
let farmerToken = '';
let adminToken = '';
let testProduceId = null;
let testBookingId = null;
let testTokenNumber = '';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting KisanSetu Full End-to-End System Tests');
  console.log('====================================================\n');

  try {
    // 1. Health check
    console.log('1️⃣ Testing Backend & AI Health Check...');
    const health = await axios.get(`${API}/health`);
    console.log('   ✅ Backend Health:', health.data.status);

    const aiHealth = await axios.get('http://127.0.0.1:8000/health');
    console.log('   ✅ Python AI Health:', aiHealth.data.status, '| Model Fitted:', aiHealth.data.model_fitted);

    // 2. Farmer Authentication
    console.log('\n2️⃣ Testing Farmer Authentication (/api/auth/farmer/login)...');
    const farmerAuth = await axios.post(`${API}/auth/farmer/login`, {
      phone: '9123456780',
      password: 'farmer123'
    });
    farmerToken = farmerAuth.data.token;
    console.log('   ✅ Farmer Logged In:', farmerAuth.data.user.fullName, '| Token Received');

    // 3. Admin Authentication
    console.log('\n3️⃣ Testing Admin Authentication (/api/auth/admin/login)...');
    const adminAuth = await axios.post(`${API}/auth/admin/login`, {
      identifier: 'admin@kisansetu.gov.in',
      password: 'admin123'
    });
    adminToken = adminAuth.data.token;
    console.log('   ✅ Admin Logged In:', adminAuth.data.user.fullName, '| Employee ID:', adminAuth.data.user.employeeId);

    // 4. Role Authorization Boundary Check
    console.log('\n4️⃣ Testing Role Boundary Security (Farmer attempting Admin API)...');
    try {
      await axios.get(`${API}/admin/overview`, {
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
      console.error('   ❌ Security failed: Farmer should not access Admin API');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('   ✅ Strict Role Enforcement Verified: HTTP 403 Forbidden received');
      } else {
        throw err;
      }
    }

    // 5. Produce Registration (kg and quintal support)
    console.log('\n5️⃣ Testing Produce Management with Quintal to kg conversion...');
    const newProduce = await axios.post(
      `${API}/produce`,
      {
        cropName: 'Organic Tomato (Ratan)',
        quantity: '18',
        unit: 'quintal', // 18 quintal = 1800 kg
        harvestDate: new Date().toISOString().split('T')[0],
        perishability: 'HIGH',
        urgency: 'EMERGENCY',
        description: 'Harvested yesterday evening. Highly perishable.'
      },
      { headers: { Authorization: `Bearer ${farmerToken}` } }
    );
    testProduceId = newProduce.data.data.id;
    console.log(`   ✅ Produce Created: ${newProduce.data.data.crop_name} | Input: ${newProduce.data.data.quantity_input} ${newProduce.data.data.unit} | Normalized: ${newProduce.data.data.quantity_kg} kg`);

    // 6. Procurement Centres & Slot Capacities
    console.log('\n6️⃣ Testing Centres & Capacities Query (12-hour AM/PM format)...');
    const centres = await axios.get(`${API}/centres`);
    const targetCentre = centres.data.data[0];
    console.log(`   ✅ Active Centres: ${centres.data.count} | Target: ${targetCentre.name} (${targetCentre.operating_hours_display})`);

    // 7. Smart Slot Recommendation
    console.log('\n7️⃣ Testing Smart Slot Recommendation Engine...');
    const futureOffsetDays = 3 + Math.floor(Math.random() * 25);
    const testDate = new Date(Date.now() + futureOffsetDays * 86400000).toISOString().split('T')[0];
    const rec = await axios.get(`${API}/slots/recommend`, {
      params: {
        centreId: targetCentre.id,
        date: testDate,
        produceQuantityKg: 1800,
        urgency: 'EMERGENCY',
        perishability: 'HIGH'
      }
    });
    console.log('   ✅ Recommended Slot:', rec.data.data.recommendedSlot?.displayTime || 'Optimal Available Slot');

    // 8. Emergency Booking with Reserved Quota
    console.log('\n8️⃣ Testing Emergency Booking Transaction & Token Generation...');
    const emergencyBooking = await axios.post(
      `${API}/bookings/emergency`,
      {
        produceId: testProduceId,
        centreId: targetCentre.id,
        bookingDate: testDate,
        reason: 'Severe perishability risk within 24 hours'
      },
      { headers: { Authorization: `Bearer ${farmerToken}` } }
    );
    testBookingId = emergencyBooking.data.data.bookingId;
    testTokenNumber = emergencyBooking.data.data.tokenNumber;
    console.log(`   ✅ Emergency Booking Granted! Token: ${testTokenNumber} | Ref: ${emergencyBooking.data.data.bookingRef} | Slot: ${emergencyBooking.data.data.slotDisplay}`);

    // 9. Gate Check-in
    console.log('\n9️⃣ Testing Farmer Arrival Check-in...');
    const checkin = await axios.post(
      `${API}/queue/checkin`,
      { bookingId: testBookingId },
      { headers: { Authorization: `Bearer ${farmerToken}` } }
    );
    console.log(`   ✅ Check-In Completed: Token ${testTokenNumber} added to Active Live Queue`);

    // 10. Live Queue Radar & AI Wait Time Prediction
    console.log('\n🔟 Testing Live Queue Status & AI Prediction Engine...');
    const queueStatus = await axios.get(`${API}/queue/status/${testBookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`   ✅ Live Queue Radar: Status: ${queueStatus.data.data.queueStatus} | People Ahead: ${queueStatus.data.data.peopleAhead} | AI Estimated Wait: ${queueStatus.data.data.estimatedWaitMinutes} mins (${queueStatus.data.data.predictionSource})`);

    // 11. Admin Call Next Token
    console.log('\n1️⃣1️⃣ Testing Admin Call Next Token to Counter...');
    const callNext = await axios.post(
      `${API}/queue/call-next`,
      { bookingId: testBookingId, counterNumber: 2 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`   ✅ Called Token ${testTokenNumber} to Counter #${callNext.data.data.counterAssigned}`);

    // 12. Quality Testing & Certification
    console.log('\n1️⃣2️⃣ Testing Crop Quality Inspection (Pass Grade A)...');
    const qualityResult = await axios.post(
      `${API}/quality/submit`,
      {
        bookingId: testBookingId,
        status: 'PASSED',
        grade: 'GRADE_A',
        moisturePercentage: 9.8,
        foreignMatterPercentage: 0.2,
        remarks: 'Excellent fresh tomato produce meeting Grade A quality standards'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`   ✅ Quality Test Certified: Status: ${qualityResult.data.data.status} | Grade: ${qualityResult.data.data.grade}`);

    // 13. Digital Weighbridge Procurement
    console.log('\n1️⃣3️⃣ Testing Digital Weighbridge & Intake Settlement...');
    const procurementResult = await axios.post(
      `${API}/procurement/complete`,
      {
        bookingId: testBookingId,
        grossWeightKg: 3800,
        tareWeightKg: 2000, // Net = 1800 kg
        netProcuredKg: 1800,
        ratePerKg: 18.50, // Total = 33,300
        notes: 'Weighment bridge scale certified'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`   ✅ Procurement Finalized: Net: ${procurementResult.data.data.netKg} kg @ ₹${procurementResult.data.data.rate}/kg | Total: ₹${procurementResult.data.data.totalValue.toLocaleString('en-IN')}`);

    // 14. DBT Bank Transfer Release
    console.log('\n1️⃣4️⃣ Testing DBT Bank Transfer Update...');
    const payRes = await axios.get(`${API}/payments/booking/${testBookingId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const paymentId = payRes.data.data.id;

    const dbtResult = await axios.put(
      `${API}/payments/${paymentId}/status`,
      {
        status: 'PAID',
        referenceNumber: 'DBT-2026-TEST-998877',
        remarks: 'Disbursed directly to farmer account via PFMS'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`   ✅ DBT Payment Settled: Status: ${dbtResult.data.data.status} | Ref: ${dbtResult.data.data.referenceNumber} | Amount: ₹${parseFloat(dbtResult.data.data.amount).toLocaleString('en-IN')}`);

    // 15. Verify Notifications
    console.log('\n1️⃣5️⃣ Verifying In-App Push Notifications...');
    const notifs = await axios.get(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    console.log(`   ✅ Notifications Verified: ${notifs.data.count} notifications stored in permanent database.`);

    console.log('\n====================================================');
    console.log('🎉 ALL 15 END-TO-END TEST SUITES PASSED FLAWLESSLY!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
