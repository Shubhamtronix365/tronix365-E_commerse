const fs = require('fs');
const { Pool } = require('pg');

// NeonDB PostgreSQL Configuration
// You'll need to set your actual NeonDB connection details
const neonConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://username:password@hostname/database_name',
    ssl: {
        rejectUnauthorized: false // Required for NeonDB
    }
};

// Alternative: Use individual parameters
// const neonConfig = {
//     host: 'your-host.neon.tech',
//     port: 5432,
//     database: 'your_database',
//     user: 'your_username',
//     password: 'your_password',
//     ssl: { rejectUnauthorized: false }
// };

async function applyUpdatesToNeonDB() {
    console.log('🔧 Starting NeonDB product updates...');
    
    // Load enhanced product data
    const enhancedData = JSON.parse(fs.readFileSync('enhanced_products_data.json', 'utf8'));
    console.log(`📊 Loaded ${enhancedData.length} products to update`);
    
    const pool = new Pool(neonConfig);
    
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Connected to NeonDB successfully');
        
        // Check table structure first
        console.log('🔍 Checking database schema...');
        const tableCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Current products table columns:');
        tableCheck.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        // Check if keywords column exists and its type
        const keywordsColumn = tableCheck.rows.find(row => row.column_name === 'keywords');
        if (!keywordsColumn) {
            console.log('⚠️  Keywords column not found - will add it');
            await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS keywords JSONB`);
            console.log('✅ Added keywords column as JSONB');
        } else {
            console.log(`✅ Keywords column exists (${keywordsColumn.data_type})`);
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each product update
        for (const product of enhancedData) {
            try {
                // PostgreSQL JSONB update syntax
                const updateQuery = `
                    UPDATE products 
                    SET 
                        description = $1,
                        keywords = $2
                    WHERE id = $3
                `;
                
                const values = [
                    product.description,
                    JSON.stringify(product.keywords), // Store as JSONB
                    product.id
                ];
                
                await client.query(updateQuery, values);
                successCount++;
                
                if (successCount % 50 === 0) {
                    console.log(`✅ Processed ${successCount}/${enhancedData.length} products...`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating product ${product.id} (${product.title.substring(0, 30)}...):`, error.message);
                
                // Save errors for review
                const errorLog = fs.existsSync('neondb_update_errors.json') 
                    ? JSON.parse(fs.readFileSync('neondb_update_errors.json', 'utf8'))
                    : [];
                errorLog.push({
                    id: product.id,
                    title: product.title,
                    error: error.message
                });
                fs.writeFileSync('neondb_update_errors.json', JSON.stringify(errorLog, null, 2));
            }
        }
        
        console.log('\n=== Update Summary ===');
        console.log(`✅ Successfully updated: ${successCount} products`);
        console.log(`❌ Failed updates: ${errorCount} products`);
        
        if (errorCount > 0) {
            console.log('⚠️  Check neondb_update_errors.json for details');
        }
        
        // Verify updates
        console.log('\n🔍 Verifying updates...');
        const verifyQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) as with_description,
                COUNT(CASE WHEN keywords IS NOT NULL THEN 1 END) as with_keywords
            FROM products
        `;
        
        const verifyResult = await client.query(verifyQuery);
        console.log('📊 Database Statistics:');
        console.log(`  Total products: ${verifyResult.rows[0].total}`);
        console.log(`  With enhanced descriptions: ${verifyResult.rows[0].with_description}`);
        console.log(`  With keywords: ${verifyResult.rows[0].with_keywords}`);
        
        await client.release();
        console.log('✅ Database connection closed');
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.error('Full error details:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Alternative function: Generate SQL script for manual execution
function generatePostgreSQLScript() {
    console.log('📝 Generating PostgreSQL script for manual execution...');
    
    const enhancedData = JSON.parse(fs.readFileSync('enhanced_products_data.json', 'utf8'));
    
    let sqlScript = `-- PostgreSQL Update Script for NeonDB
-- Generated: ${new Date().toISOString()}
-- Total products to update: ${enhancedData.length}

-- Set search path if needed
-- SET search_path TO your_schema_name;

BEGIN;

-- Add keywords column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'keywords'
    ) THEN
        ALTER TABLE products ADD COLUMN keywords JSONB;
    END IF;
END $$;

`;
    
    enhancedData.forEach((product, index) => {
        const escapedDescription = product.description
            .replace(/'/g, "''")
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ');
        
        const keywordsJson = JSON.stringify(product.keywords)
            .replace(/'/g, "''");
        
        sqlScript += `-- Update product ${index + 1}: ${product.title.substring(0, 40)}...
UPDATE products 
SET description = '${escapedDescription}',
    keywords = '${keywordsJson}'::jsonb
WHERE id = ${product.id};

`;
    });
    
    sqlScript += `COMMIT;

-- Verification query
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN LENGTH(description) > 100 THEN 1 END) as enhanced_descriptions,
    COUNT(CASE WHEN keywords IS NOT NULL THEN 1 END) as with_keywords
FROM products;
`;
    
    fs.writeFileSync('update_products_postgresql.sql', sqlScript);
    console.log('✅ Generated update_products_postgresql.sql');
    console.log('📋 You can now run this script in your NeonDB console');
}

// Main execution
async function main() {
    console.log('=== NeonDB Product Update Tool ===');
    console.log('Choose an option:');
    console.log('1. Apply updates directly (requires DATABASE_URL)');
    console.log('2. Generate SQL script for manual execution');

    const args = process.argv.slice(2);
    const option = args[0] || '2';

    if (option === '1') {
        if (!process.env.DATABASE_URL) {
            console.log('❌ DATABASE_URL environment variable not set');
            console.log('Please set it: export DATABASE_URL="postgresql://..."');
            console.log('Or use option 2 to generate a SQL script');
            process.exit(1);
        }
        await applyUpdatesToNeonDB();
    } else {
        generatePostgreSQLScript();
    }
}

main();