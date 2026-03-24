require('dotenv').config();
const db = require('./models');

async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Sync all models (create tables)
    await db.sequelize.sync({ force: false, alter: true });
    
    console.log('✓ Database schema initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to initialize database:', error);
    process.exit(1);
  }
}

initDatabase();
