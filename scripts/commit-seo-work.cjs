const { exec } = require('child_process');

const commits = [
    {
        files: ['index.html'],
        message: 'SEO: Add comprehensive meta tags to root HTML for India electronics market'
    },
    {
        files: ['src/components/common/SEO.jsx'],
        message: 'SEO: Enhance SEO component with organization schema and improved canonical URL handling'
    },
    {
        files: ['src/components/common/ProductSchema.jsx'],
        message: 'SEO: Enhance product schema with manufacturer details, seller info, and advanced properties'
    },
    {
        files: ['src/App.jsx'],
        message: 'SEO: Add proper 404 handling with SEO meta tags and improved navigation'
    },
    {
        files: ['src/pages/Home.jsx'],
        message: 'SEO: Optimize home page with India-focused keywords and enhanced descriptions'
    },
    {
        files: ['src/pages/ProductDetails.jsx'],
        message: 'SEO: Enhance product pages with dynamic keywords and location-specific meta tags'
    },
    {
        files: ['src/pages/InfoPages.jsx'],
        message: 'SEO: Optimize information pages (About, Contact, Terms, Privacy, Returns) with targeted keywords'
    },
    {
        files: ['public/robots.txt'],
        message: 'SEO: Clean up and optimize robots.txt for better crawl budget management'
    },
    {
        files: ['scripts/generate-sitemap.cjs', 'scripts/generate-sitemap.js'],
        message: 'SEO: Enhance sitemap generation with proper URL formatting and lastmod dates'
    },
    {
        files: ['vite.config.js'],
        message: 'SEO: Add performance optimizations including code splitting and security headers'
    },
    {
        files: ['package.json', 'package-lock.json'],
        message: 'SEO: Add required dependencies (pg, axios) for database enhancement scripts'
    },
    {
        files: ['scripts/apply-neondb-updates.cjs'],
        message: 'SEO: Create NeonDB PostgreSQL update script with parameterized queries'
    },
    {
        files: ['scripts/enhance-products.cjs'],
        message: 'SEO: Create product enhancement script to generate 150+ word descriptions and SEO keywords'
    },
    {
        files: ['scripts/safe-neondb-update.cjs', 'scripts/fix-neondb-escape.cjs'],
        message: 'SEO: Add safe database update scripts with proper error handling and escaping'
    },
    {
        files: ['SEO_IMPROVEMENTS.md'],
        message: 'SEO: Add comprehensive SEO improvements documentation with technical details'
    },
    {
        files: ['NEONDB_INSTRUCTIONS.md'],
        message: 'SEO: Add NeonDB database update instructions with multiple connection methods'
    },
    {
        files: ['enhanced_products_data.json'],
        message: 'SEO: Generate enhanced product data with 150+ word descriptions and 30 keywords per product'
    },
    {
        files: ['update_products_postgresql.sql', 'update_products_postgresql_fixed.sql'],
        message: 'SEO: Create PostgreSQL update scripts for NeonDB with proper syntax'
    },
    {
        files: ['public/sitemap.xml', 'public/sitemap_index.xml'],
        message: 'SEO: Update sitemap with 267+ URLs including 249 products, 17 categories, and static pages'
    },
    {
        files: ['individual_product_updates.json'],
        message: 'SEO: Create individual product update files for API-based database updates'
    },
    {
        files: ['update_products.sql', 'update_products_neondb.sql'],
        message: 'SEO: Add SQL update scripts for both MySQL and PostgreSQL database systems'
    },
    {
        files: ['all_products.json', 'all_products_api.json', 'all_products_full.json', 'products_sample.json'],
        message: 'SEO: Add product data backup files for reference and verification'
    },
    {
        files: ['failed_updates.json'],
        message: 'SEO: Add error tracking file for failed database updates (empty in this case)'
    },
    {
        files: ['package.json'],
        message: 'SEO: Add npm scripts for sitemap generation and product enhancement automation'
    },
    {
        files: ['scripts/commit-seo-work.cjs'],
        message: 'SEO: Add automated commit script for SEO work with 26 meaningful commit messages'
    }
];

async function executeCommits() {
    console.log('🚀 Starting SEO commit sequence...');
    console.log(`📝 Total commits to create: ${commits.length}\n`);
    
    // Start from commit 23 since we already have 23 commits
    const startIndex = 23; 
    
    for (let i = startIndex; i < commits.length; i++) {
        const commit = commits[i];
        
        try {
            // Add files
            const addCommand = `git add ${commit.files.join(' ')}`;
            console.log(`[${i + 1}/${commits.length}] Adding files: ${commit.files.join(', ')}`);
            
            await new Promise((resolve, reject) => {
                exec(addCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`   ❌ Git add failed: ${error.message}`);
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
            
            // Commit with message
            const commitCommand = `git commit -m "${commit.message}"`;
            console.log(`   📝 Committing: ${commit.message}`);
            
            await new Promise((resolve, reject) => {
                exec(commitCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
                    if (error) {
                        // If commit fails because nothing to commit, that's okay
                        if (error.message.includes('nothing to commit')) {
                            console.log(`   ⚠️  No changes to commit (already committed)\n`);
                            resolve();
                            return;
                        }
                        console.error(`   ❌ Git commit failed: ${error.message}`);
                        reject(error);
                        return;
                    }
                    console.log(`   ✅ Commit ${i + 1}/${commits.length} successful\n`);
                    resolve();
                });
            });
            
        } catch (error) {
            console.error(`❌ Failed at commit ${i + 1}: ${error.message}`);
            console.log('🛑 Stopping commit sequence due to error');
            process.exit(1);
        }
    }
    
    console.log('🎉 All commits completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Total commits: ${commits.length}`);
    console.log(`   - Files modified: Multiple SEO enhancements`);
    console.log(`   - Database updates: 249 products enhanced`);
    console.log(`   - Sitemap: 267+ URLs generated`);
    console.log('\n🚀 Ready to push to remote repository');
}

executeCommits();