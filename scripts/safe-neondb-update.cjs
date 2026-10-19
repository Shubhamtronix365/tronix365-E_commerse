const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Native zero-dependency environment loader
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv(path.resolve(__dirname, '../backend/.env'));
loadEnv(path.resolve(__dirname, '../.env'));

const DATABASE_URL = process.env.DATABASE_URL;

async function safeUpdateNeonDB() {
    console.log('🔧 Starting safe NeonDB product updates...');

    if (!DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL is not set in environment or .env file.');
        process.exit(1);
    }
    
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