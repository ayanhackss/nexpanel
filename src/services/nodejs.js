const { spawnAsync } = require('../utils/process');
const { isValidWebsiteName } = require('../utils/validation');
const fs = require('fs').promises;

const start = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');

    const appPath = `/var/www/${website.name}`;
    const appName = website.name;

    try {
        // Check if package.json exists
        try {
            await fs.access(`${appPath}/package.json`);
        } catch {
            throw new Error('package.json not found');
        }

        // Install dependencies if needed
        await spawnAsync('npm', ['install', '--production'], { cwd: appPath });

        // Start with PM2
        await spawnAsync('pm2', ['start', `${appPath}/index.js`, '--name', appName, '-i', '1', '--max-memory-restart', '256M']);
        await spawnAsync('pm2', ['save']);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Node.js app: ${error.message}`);
    }
};

const stop = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');
    try {
        await spawnAsync('pm2', ['delete', website.name]);
        await spawnAsync('pm2', ['save']);
        return true;
    } catch (error) {
        throw new Error(`Failed to stop Node.js app: ${error.message}`);
    }
};

const restart = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');
    try {
        await spawnAsync('pm2', ['restart', website.name]);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Node.js app: ${error.message}`);
    }
};

const getLogs = async (website, lines = 100) => {
    if (!isValidWebsiteName(website.name)) return '';
    try {
        const { stdout } = await spawnAsync('pm2', ['logs', website.name, '--lines', lines, '--nostream']);
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
