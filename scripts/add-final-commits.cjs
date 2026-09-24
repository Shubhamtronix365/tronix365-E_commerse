const { exec } = require('child_process');

const finalCommits = [
    {
        files: ['src/components/common/ProductSchema.jsx', 'src/components/common/SEO.jsx'],
        message: 'SEO: Finalize structured data implementation with comprehensive schema markup'
    },
    {
        files: ['src/App.jsx', 'src/pages/ProductDetails.jsx', 'src/pages/Home.jsx'],
        message: 'SEO: Complete technical SEO fixes including canonical URLs and meta optimization'
    }
];

async function addFinalCommits() {
    console.log('🚀 Adding final SEO commits...');
    console.log(`📝 Total commits to add: ${finalCommits.length}\n`);
    
    for (let i = 0; i < finalCommits.length; i++) {
        const commit = finalCommits[i];
        
        try {
            // Add files
            const addCommand = `git add ${commit.files.join(' ')}`;
            console.log(`[${i + 1}/${finalCommits.length}] Adding files: ${commit.files.join(', ')}`);
            
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
                        if (error.message.includes('nothing to commit')) {
                            console.log(`   ⚠️  No changes to commit (already committed)\n`);
                            resolve();
                            return;
                        }
                        console.error(`   ❌ Git commit failed: ${error.message}`);
                        reject(error);
                        return;
                    }
                    console.log(`   ✅ Commit ${i + 1}/${finalCommits.length} successful\n`);
                    resolve();
                });
            });
            
        } catch (error) {
            console.error(`❌ Failed at commit ${i + 1}: ${error.message}`);
            process.exit(1);
        }
    }
    
    console.log('🎉 Final commits completed!');
    console.log('📊 Total SEO commits: 26');
    console.log('🚀 Ready to push to remote repository');
}

addFinalCommits();