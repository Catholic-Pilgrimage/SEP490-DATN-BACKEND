require('dotenv').config();
const { Sequelize } = require('sequelize');

// Source: Supabase
const sourceDB = new Sequelize({
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.abbbueqqsqwyuunuwtxf',
  password: '$9C@/SebWNF5@pS',
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Target: VPS Local DB
const targetDB = new Sequelize({
  host: 'db',
  port: 5432,
  database: process.env.DB_NAME || 'pilgrim_db',
  username: process.env.DB_USER || 'pilgrim_user',
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: console.log
});

async function migrateTables() {
  try {
    console.log('Connecting to source database (Supabase)...');
    await sourceDB.authenticate();
    console.log('✓ Connected to Supabase');

    console.log('Connecting to target database (VPS)...');
    await targetDB.authenticate();
    console.log('✓ Connected to VPS DB');

    // Get all tables from source
    const [tables] = await sourceDB.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`\nFound ${tables.length} tables to migrate:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Export schema
    console.log('\n=== Exporting Schema ===');
    const [schemaDump] = await sourceDB.query(`
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || data_type ||
          CASE WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
          END,
          ', '
        ) || ');'
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name;
    `);

    console.log('Schema exported');

    // Copy data for each table
    console.log('\n=== Copying Data ===');
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\nMigrating table: ${tableName}`);
      
      try {
        // Get row count
        const [countResult] = await sourceDB.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = parseInt(countResult[0].count);
        console.log(`  Rows: ${rowCount}`);

        if (rowCount === 0) {
          console.log(`  ⊘ Skipped (empty table)`);
          continue;
        }

        // Get all data
        const [rows] = await sourceDB.query(`SELECT * FROM "${tableName}"`);
        
        if (rows.length > 0) {
          // Get column names
          const columns = Object.keys(rows[0]);
          const columnList = columns.map(c => `"${c}"`).join(', ');
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          // Insert data in batches
          const batchSize = 100;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            
            for (const row of batch) {
              const values = columns.map(col => row[col]);
              await targetDB.query(
                `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                { bind: values }
              );
            }
            
            console.log(`  ✓ Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length} rows`);
          }
        }
        
        console.log(`  ✓ Completed: ${tableName}`);
      } catch (error) {
        console.error(`  ✗ Error migrating ${tableName}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sourceDB.close();
    await targetDB.close();
  }
}

migrateTables();
