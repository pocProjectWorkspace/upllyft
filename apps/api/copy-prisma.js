const fs = require('fs');
const path = require('path');

function replaceSymlinkWithFolder(targetPath) {
    if (!fs.existsSync(targetPath)) return;

    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
        try {
            const realPath = fs.realpathSync(targetPath);
            // If the real path is different from the target path, it's a symlink/junction
            if (realPath !== path.resolve(targetPath)) {
                console.log(`Resolving symlink for ${targetPath}...`);
                fs.rmSync(targetPath, { recursive: true, force: true });
                fs.cpSync(realPath, targetPath, { recursive: true });
                console.log(`Successfully replaced ${targetPath} with physical folder.`);
            } else {
                console.log(`${targetPath} is already a physical folder.`);
            }
        } catch (e) {
            console.error(`Error processing ${targetPath}:`, e);
        }
    }
}

replaceSymlinkWithFolder('node_modules/@prisma/client');
replaceSymlinkWithFolder('node_modules/.prisma');
