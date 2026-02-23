const fs = require('fs');
const { execSync } = require('child_process');

function safeUnlinkJunction(target) {
    try {
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink() || stat.isDirectory()) {
            console.log(`Unlinking junction: ${target}`);
            // Use rmdirSync to delete the Windows junction cleanly
            fs.rmdirSync(target);
        }
    } catch (e) {
        // Ignore missing or regular files
    }
}

console.log('Preparing Prisma client for Serverless deployment on Windows...');

// Force local physical generation by safely dropping the workspace junctions
safeUnlinkJunction('node_modules/.prisma');
safeUnlinkJunction('node_modules/@prisma/client');

console.log('Generating Prisma client physically in local node_modules...');
try {
    execSync('npx prisma generate', { stdio: 'inherit', shell: true });
    console.log('Prisma packaging prep successful.');
} catch (error) {
    console.error('Failed to run prisma generate:', error);
    process.exit(1);
}
