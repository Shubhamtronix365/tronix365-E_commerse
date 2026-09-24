const fs = require('fs');

// Load enhanced product data
const enhancedData = JSON.parse(fs.readFileSync('enhanced_products_data.json', 'utf8'));
console.log(`📊 Loaded ${enhancedData.length} products to fix`);

// Function to properly escape PostgreSQL strings
function escapePostgresString(str) {
    if (!str) return '';
    return str
        .replace(/'/g, "''")  // Escape single quotes
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/\n/g, ' ')   // Replace newlines with spaces
        .replace(/\r/g, ' ')   // Replace carriage returns
        .replace(/\t/g, ' ')   // Replace tabs
        .trim();
}

// Function to escape JSON for PostgreSQL
function escapeJsonString(jsonObj) {
    const jsonString = JSON.stringify(jsonObj);
    return escapePostgresString(jsonString);
}

// Generate safer SQL script with proper escaping
let sqlScript = `-- PostgreSQL Update Script for NeonDB (Fixed Version)
-- Generated: ${new Date().toISOString()}
-- Total products to update: ${enhancedData.length}
-- This script uses proper PostgreSQL string escaping

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

let errorCount = 0;
let successCount = 0;

enhancedData.forEach((product, index) => {
    try {
        const escapedDescription = escapePostgresString(product.description);
        const escapedKeywords = escapeJsonString(product.keywords);
        
        // Validate that the escaped strings are safe
        if (escapedDescription.includes('Electric') && !escapedDescription.includes("''")) {
            console.log(`⚠️  Warning: Product ${index + 1} may have escaping issues: ${product.title.substring(0, 30)}...`);
            errorCount++;
        }
        
        sqlScript += `-- Update product ${index + 1}: ${product.title.substring(0, 40)}...
UPDATE products 
SET description = $${1}$${escapedDescription}$${1}$,
    keywords = $${2}$${escapedKeywords}$${2}$::jsonb
WHERE id = ${product.id};

`;
        
        successCount++;
        
    } catch (error) {
        console.error(`❌ Error processing product ${index + 1}: ${error.message}`);
        errorCount++;
    }
});

sqlScript += `COMMIT;

-- Verification query
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN LENGTH(description) > 100 THEN 1 END) as enhanced_descriptions,
    COUNT(CASE WHEN keywords IS NOT NULL THEN 1 END) as with_keywords
FROM products;
`;

fs.writeFileSync('update_products_postgresql_fixed.sql', sqlScript);
console.log(`✅ Generated fixed SQL script: update_products_postgresql_fixed.sql`);
console.log(`📊 Success: ${successCount}, Errors: ${errorCount}`);
console.log('📋 Run this script in NeonDB console or with psql');