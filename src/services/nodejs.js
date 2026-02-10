const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Sanitize website name to prevent command injection
const sanitizeName = (name) => {
    if (!name) return '';
    return String(name).replace(/[^a-zA-Z0-9_-]/g, '');
};

const start = async (website) => {
    const sanitizedName = sanitizeName(website.name);
    const appPath = `/var/www/${sanitizedName}`;
    const appName = sanitizedName;

    try {
        // Check if package.json exists
        const { stdout } = await execAsync(`test -f ${appPath}/package.json && echo "exists"`);

        if (!stdout.includes('exists')) {
            throw new Error('package.json not found');
        }

        // Install dependencies if needed
        await execAsync(`cd ${appPath} && npm install --production --prefer-offline --no-audit`);

        // Start with PM2 (use ecosystem config for safety)
        const pm2Config = JSON.stringify({
            name: appName,
            script: 'index.js',
            cwd: appPath,
            instances: 1,
            exec_mode: 'fork',
            max_memory_restart: '256M',
            env: {
                NODE_ENV: 'production'
            }
        });

        await execAsync(`echo '${pm2Config}' | pm2 start - ecosystem.config.js || pm2 start ${appPath}/index.js --name ${appName} -i 1 --max-memory-restart 256M`);
        await execAsync(`pm2 save`);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Node.js app: ${error.message}`);
    }
};

const stop = async (website) => {
    const sanitizedName = sanitizeName(website.name);
    
    try {
        await execAsync(`pm2 delete ${sanitizedName}`);
        await execAsync(`pm2 save`);
        return true;
    } catch (error) {
        // Ignore error if process doesn't exist
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            return true;
        }
        throw new Error(`Failed to stop Node.js app: ${error.message}`);
    }
};

const restart = async (website) => {
    const sanitizedName = sanitizeName(website.name);
    
    try {
        await execAsync(`pm2 restart ${sanitizedName}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Node.js app: ${error.message}`);
    }
};

const getLogs = async (website, lines = 100) => {
    const sanitizedName = sanitizeName(website.name);
    const validatedLines = Math.min(Math.max(parseInt(lines) || 100, 1), 1000);
    
    try {
        const { stdout } = await execAsync(`pm2 logs ${sanitizedName} --lines ${validatedLines} --nostream`);
        return stdout;
    } catch (error) {
        return '';
    }
};

const getStatus = async (website) => {
    const sanitizedName = sanitizeName(website.name);
    
    try {
        const { stdout } = await execAsync(`pm2 jlist`);
        const processes = JSON.parse(stdout);
        const found = processes.find(p => p.name === sanitizedName);
        
        if (found) {
            return {
                name: found.name,
                status: found.pm2_env?.status || 'stopped',
                pid: found.pid,
                memory: found.monit?.memory || 0,
                cpu: found.monit?.cpu || 0,
                uptime: found.pm2_env?.pm_uptime || 0
            };
        }
        return { name: sanitizedName, status: 'stopped' };
    } catch (error) {
        return { name: sanitizedName, status: 'stopped' };
    }
};

module.exports = {
    start,
    stop,
    restart,
    getLogs,
    getStatus
};
