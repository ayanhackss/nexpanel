const fs = require('fs').promises;
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
    const venvPath = `${appPath}/venv`;
    const appName = sanitizedName;
    const port = website.port || 8000;

    try {
        // Create virtualenv if not exists
        await execAsync(`test -d ${venvPath} || python3 -m venv ${venvPath}`);

        // Install requirements if requirements.txt exists
        const reqFile = `${appPath}/requirements.txt`;
        const reqExists = await fs.access(reqFile).then(() => true).catch(() => false);
        if (reqExists) {
            await execAsync(`${venvPath}/bin/pip install -r ${reqFile}`);
        }

        // Detect framework and start
        const framework = await detectFramework(appPath);

        let startCommand;
        if (framework === 'django') {
            startCommand = `${venvPath}/bin/gunicorn --bind 127.0.0.1:${port} --workers 2 --timeout 300 wsgi:application`;
        } else if (framework === 'flask') {
            startCommand = `${venvPath}/bin/gunicorn --bind 127.0.0.1:${port} --workers 2 --timeout 300 app:app`;
        } else {
            // FastAPI or generic ASGI
            startCommand = `${venvPath}/bin/uvicorn main:app --host 127.0.0.1 --port ${port} --workers 2`;
        }

        // Start with PM2 using ecosystem config
        const pm2Config = JSON.stringify({
            name: appName,
            script: startCommand.split(' ')[0],
            args: startCommand.split(' ').slice(1).join(' '),
            cwd: appPath,
            instances: 1,
            exec_mode: 'fork',
            max_memory_restart: '256M',
            env: {
                NODE_ENV: 'production'
            }
        });

        await execAsync(`echo '${pm2Config}' | pm2 start - ecosystem.config.js || pm2 start "${startCommand}" --name ${appName}`);
        await execAsync(`pm2 save`);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Python app: ${error.message}`);
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
        throw new Error(`Failed to stop Python app: ${error.message}`);
    }
};

const restart = async (website) => {
    const sanitizedName = sanitizeName(website.name);
    
    try {
        await execAsync(`pm2 restart ${sanitizedName}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Python app: ${error.message}`);
    }
};

const detectFramework = async (appPath) => {
    try {
        // Check for Django
        const files = await fs.readdir(appPath);
        const pyFiles = files.filter(f => f.endsWith('.py'));
        
        for (const file of pyFiles) {
            const content = await fs.readFile(`${appPath}/${file}`, 'utf8');
            if (content.toLowerCase().includes('django')) {
                return 'django';
            }
        }
        
        // Check for Flask
        for (const file of pyFiles) {
            const content = await fs.readFile(`${appPath}/${file}`, 'utf8');
            if (content.toLowerCase().includes('flask')) {
                return 'flask';
            }
        }
        
        // Default to FastAPI
        return 'fastapi';
    } catch (error) {
        return 'fastapi';
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
    detectFramework,
    getStatus
};
