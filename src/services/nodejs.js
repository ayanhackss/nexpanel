const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const start = async (website) => {
    const appPath = `/var/www/${website.name}`;
    const appName = website.name;

    try {
        // Check if package.json exists
        const { stdout: pkgJsonExists } = await execAsync(`test -f ${appPath}/package.json && echo "exists"`);

        if (!pkgJsonExists.includes('exists')) {
            throw new Error('package.json not found');
        }

        // Read package.json to check for start script
        const { stdout: pkgJsonContent } = await execAsync(`cat ${appPath}/package.json`);
        const pkgJson = JSON.parse(pkgJsonContent);

        // Install dependencies if needed
        await execAsync(`cd ${appPath} && npm install --production`);

        let startCommand;
        
        // Priority 1: npm start (standard for Next.js, NestJS, etc.)
        if (pkgJson.scripts && pkgJson.scripts.start) {
            startCommand = `npm start`;
        } 
        // Priority 2: main file from package.json
        else if (pkgJson.main) {
            startCommand = pkgJson.main;
        }
        // Priority 3: Common entry points
        else {
            const entryPoints = ['index.js', 'app.js', 'server.js', 'main.js'];
            for (const file of entryPoints) {
                try {
                    await execAsync(`test -f ${appPath}/${file}`);
                    startCommand = file;
                    break;
                } catch (e) {
                     // continue checking
                }
            }
        }

        if (!startCommand) {
            throw new Error('No start script or entry file found (checked scripts.start, main, index.js, app.js, server.js)');
        }

        // Start with PM2
        // If it's an npm script, we run "npm run start"
        // If it's a file, we run that file directly
        const pm2Command = startCommand === 'npm start' 
            ? `pm2 start npm --name ${appName} -- start`
            : `pm2 start ${appPath}/${startCommand} --name ${appName} -i 1 --max-memory-restart 256M`;

        await execAsync(pm2Command);
        await execAsync(`pm2 save`);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Node.js app: ${error.message}`);
    }
};

const stop = async (website) => {
    try {
        await execAsync(`pm2 delete ${website.name}`);
        await execAsync(`pm2 save`);
        return true;
    } catch (error) {
        throw new Error(`Failed to stop Node.js app: ${error.message}`);
    }
};

const restart = async (website) => {
    try {
        await execAsync(`pm2 restart ${website.name}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Node.js app: ${error.message}`);
    }
};

const getLogs = async (website, lines = 100) => {
    try {
        const { stdout } = await execAsync(`pm2 logs ${website.name} --lines ${lines} --nostream`);
        return stdout;
    } catch (error) {
        return '';
    }
};

module.exports = {
    start,
    stop,
    restart,
    getLogs
};
