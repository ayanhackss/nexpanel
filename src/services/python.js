const { spawnAsync } = require('../utils/process');
const { isValidWebsiteName } = require('../utils/validation');
const fs = require('fs').promises;

const start = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');

    const appPath = `/var/www/${website.name}`;
    const venvPath = `${appPath}/venv`;
    const appName = website.name;

    try {
        // Create virtualenv if not exists
        try {
            await fs.access(venvPath);
        } catch {
            await spawnAsync('python3', ['-m', 'venv', venvPath]);
        }

        // Install requirements
        const reqFile = `${appPath}/requirements.txt`;
        try {
            await fs.access(reqFile);
            await spawnAsync(`${venvPath}/bin/pip`, ['install', '-r', reqFile]);
        } catch (e) {
            // No requirements.txt or install failed (but we continue)
        }

        // Detect framework and start
        const framework = await detectFramework(appPath);

        let startCommand;
        if (framework === 'django') {
            startCommand = `${venvPath}/bin/gunicorn --bind 127.0.0.1:${website.port} --workers 2 --timeout 300 wsgi:application`;
        } else if (framework === 'flask') {
            startCommand = `${venvPath}/bin/gunicorn --bind 127.0.0.1:${website.port} --workers 2 --timeout 300 app:app`;
        } else {
            // FastAPI or generic ASGI
            startCommand = `${venvPath}/bin/uvicorn main:app --host 127.0.0.1 --port ${website.port} --workers 2`;
        }

        // Create start script to avoid shell parsing issues with pm2 + arguments
        const startScriptPath = `${appPath}/start.sh`;
        await fs.writeFile(startScriptPath, `#!/bin/bash\n${startCommand}`, { mode: 0o755 });

        // Start with PM2
        await spawnAsync('pm2', ['start', startScriptPath, '--name', appName]);
        await spawnAsync('pm2', ['save']);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Python app: ${error.message}`);
    }
};

const stop = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');
    try {
        await spawnAsync('pm2', ['delete', website.name]);
        await spawnAsync('pm2', ['save']);
        return true;
    } catch (error) {
        throw new Error(`Failed to stop Python app: ${error.message}`);
    }
};

const restart = async (website) => {
    if (!isValidWebsiteName(website.name)) throw new Error('Invalid website name');
    try {
        await spawnAsync('pm2', ['restart', website.name]);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Python app: ${error.message}`);
    }
};

const detectFramework = async (appPath) => {
    try {
        try {
            const { stdout } = await spawnAsync('grep', ['-r', '-l', '-e', 'django\\|Django', appPath]);
            if (stdout) return 'django';
        } catch {}

        try {
            const { stdout } = await spawnAsync('grep', ['-r', '-l', '-e', 'flask\\|Flask', appPath]);
            if (stdout) return 'flask';
        } catch {}

        return 'fastapi';
    } catch {
        return 'fastapi';
    }
};

module.exports = {
    start,
    stop,
    restart
};
