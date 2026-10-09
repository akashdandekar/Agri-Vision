const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify MySQL connection
    const connection = await pool.getConnection();
    console.log('[KisanSetu Backend] Connected to MySQL database successfully.');
    connection.release();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`[KisanSetu Backend] Server running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('[KisanSetu Backend] Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
