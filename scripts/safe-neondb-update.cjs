const fs = require('fs');
const { Pool } = require('pg');

// Your NeonDB connection string
const DATABASE_URL = "postgresql://neondb_owner:npg_UJQ35NbKrBsp@ep-weathered-fog-azkkq7jz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function safeUpdateNeonDB() {
    console.log('🔧 Starting safe NeonDB product updates...');
    
    // Load enhanced product data
    const enhancedData = JSON.parse(fs.readFileSync('enhanced_products_data.json', 'utf8'));
    console.log(`📊 Loaded ${enhancedData.length} products to update`);
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        console.log('✅ Connected to NeonDB successfully');
        
        // Check if keywords column exists
        console.log('🔍 Checking database schema...');
        const columnCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'keywords'
        `);
        
        if (columnCheck.rows.length === 0) {
            console.log('⚠️  Keywords column not found - adding it...');
            await client.query(`ALTER TABLE products ADD COLUMN keywords JSONB`);
            console.log('✅ Added keywords column as JSONB');
        } else {
            console.log(`✅ Keywords column exists (${columnCheck.rows[0].data_type})`);
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process products in smaller batches
        const batchSize = 50;
        for (let i = 0; i < enhancedData.length; i += batchSize) {
            const batch = enhancedData.slice(i, i + batchSize);
            console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(enhancedData.length/batchSize)}...`);
            
            for (const product of batch) {
                try {
                    await client.query(
                        'UPDATE products SET description = $1, keywords = $2 WHERE id = $3',
                        [product.description, JSON.stringify(product.keywords), product.id]
                    );
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error updating product ${product.id}: ${error.message}`);
                }
            }
        }
        
        console.log('\n=== Update Summary ===');
        console.log(`✅ Successfully updated: ${successCount} products`);
        console.log(`❌ Failed updates: ${errorCount} products`);
        
        // Verify updates
        console.log('\n🔍 Verifying updates...');
        const verifyResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) as with_description,
                COUNT(CASE WHEN keywords IS NOT NULL THEN 1 END) as with_keywords
            FROM products
        `);
        
        console.log('📊 Database Statistics:');
        console.log(`  Total products: ${verifyResult.rows[0].total}`);
        console.log(`  With enhanced descriptions: ${verifyResult.rows[0].with_description}`);
        console.log(`  With keywords: ${verifyResult.rows[0].with_keywords}`);
        
        await client.release();
        console.log('✅ Database connection closed');
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

safeUpdateNeonDB();