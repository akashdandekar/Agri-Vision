/**
 * KisanSetu Database Initializer & Seeder
 * Connects to MySQL, executes schema.sql and seed.sql with proper bcrypt hashes
 */

const fs = require('fs');
const path = require('path');
const moduleAlias = path.join(__dirname, '../backend/node_modules');
const mysql = require(path.join(moduleAlias, 'mysql2/promise'));
const bcrypt = require(path.join(moduleAlias, 'bcryptjs'));
require(path.join(moduleAlias, 'dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function initDatabase() {
  console.log('🌱 [KisanSetu] Connecting to MySQL server at', DB_CONFIG.host + ':' + DB_CONFIG.port);
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL server successfully!');

    // 1. Create database
    console.log('⚙️  Creating database `kisansetu` if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS `kisansetu` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await connection.changeUser({ database: 'kisansetu' });

    // 2. Read and run schema.sql
    console.log('📜 Executing schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✅ Schema tables created successfully!');

    // 3. Compute real bcrypt hashes
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', salt);
    const farmerHash = await bcrypt.hash('farmer123', salt);

    // 4. Read seed.sql and substitute hashes
    console.log('🌾 Executing seed.sql with fresh bcrypt hashes...');
    let seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    
    // Replace the default hashes with freshly generated ones to guarantee match
    seedSql = seedSql.replace(/\$2a\$10\$vI8aWBnW3fID\.ZQ4\/vWzkuoQ7qK3g9F3uK9nFkJ8YyI8j5c4wPteS/g, adminHash);
    seedSql = seedSql.replace(/\$2a\$10\$zY4f6jH81B9p\/9Nl8mEaDe4J3QOq3k\.5Y7aP6C\.6OqI8Lq7DkHwQ2/g, farmerHash);

    await connection.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    // 5. Verify records
    const [userRows] = await connection.query('SELECT id, phone, email, role, full_name FROM users');
    const [centreRows] = await connection.query('SELECT id, centre_code, name FROM procurement_centres');
    const [bookingRows] = await connection.query('SELECT id, booking_reference, status FROM bookings');

    console.log('\n======================================================');
    console.log('🎉 KisanSetu Database Initialized Successfully!');
    console.log('======================================================');
    console.log(`Users Created: ${userRows.length}`);
    userRows.forEach(u => console.log(`   - [${u.role}] ${u.full_name} | Phone: ${u.phone} | Password: ${u.role === 'ADMIN' ? 'admin123' : 'farmer123'}`));
    console.log(`Procurement Centres: ${centreRows.length}`);
    centreRows.forEach(c => console.log(`   - [${c.centre_code}] ${c.name}`));
    console.log(`Active Seed Bookings: ${bookingRows.length}`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
