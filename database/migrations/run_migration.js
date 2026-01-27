const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully!');

        console.log('\n📝 Running migration: Add is_active to nearby_places...');
        
        // Add is_active column
        await client.query(`
            ALTER TABLE nearby_places 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('✅ Column is_active added successfully!');

        // Update existing records
        const updateResult = await client.query(`
            UPDATE nearby_places 
            SET is_active = TRUE 
            WHERE is_active IS NULL;
        `);
        console.log(`✅ Updated ${updateResult.rowCount} existing records to is_active = TRUE`);

        // Add comment
        await client.query(`
            COMMENT ON COLUMN nearby_places.is_active IS 'Soft delete flag - FALSE means deactivated/deleted';
        `);
        console.log('✅ Added column comment');

        // Verify the change
        const verifyResult = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'nearby_places' AND column_name = 'is_active';
        `);
        
        if (verifyResult.rows.length > 0) {
            console.log('\n✅ Migration completed successfully!');
            console.log('Column details:', verifyResult.rows[0]);
        } else {
            console.log('\n❌ Migration verification failed!');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

runMigration();
