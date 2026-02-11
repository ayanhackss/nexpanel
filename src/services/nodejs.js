const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Helper to run commands as www-data
const runAsUser = async (cmd) => {
    // Escape single quotes for the shell command
    const safeCmd = cmd.replace(/'/g, "'\\''");
    // Run as www-data
    return execAsync(`sudo -u www-data bash -c '${safeCmd}'`);
};

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

        // Install dependencies if needed (as www-data)
        await runAsUser(`cd ${appPath} && npm install --production`);

        let startCommand;
        
        // Priority 1: npm start
        if (pkgJson.scripts && pkgJson.scripts.start) {
            startCommand = `npm start`;
        } 
        // Priority 2: main file
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
            throw new Error('No start script or entry file found');
        }

        // Start with PM2 as www-data
        // We need to use full path to pm2 if not in www-data's path, or ensure environment is set
        // Usually, if installed globally, `pm2` works.
        // We set PM2_HOME to typical www-data location or default .pm2
        
        const pm2Cmd = startCommand === 'npm start' 
            ? `pm2 start npm --name ${appName} -- start`
            : `pm2 start ${appPath}/${startCommand} --name ${appName} -i 1 --max-memory-restart 256M`;

        await runAsUser(`cd ${appPath} && ${pm2Cmd}`);
        await runAsUser(`pm2 save`);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Node.js app: ${error.message}`);
    }
};

const stop = async (website) => {
    try {
        await runAsUser(`pm2 delete ${website.name}`);
        await runAsUser(`pm2 save`);
        return true;
    } catch (error) {
        // Ignore if not found
        if (error.message.includes('not found')) return true;
        throw new Error(`Failed to stop Node.js app: ${error.message}`);
    }
};

const restart = async (website) => {
    try {
        await runAsUser(`pm2 restart ${website.name}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Node.js app: ${error.message}`);
    }
};

const getLogs = async (website, lines = 100) => {
    try {
        const { stdout } = await runAsUser(`pm2 logs ${website.name} --lines ${lines} --nostream`);
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
