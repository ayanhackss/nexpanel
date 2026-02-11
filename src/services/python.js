const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Helper to run commands as www-data
const runAsUser = async (cmd) => {
    const safeCmd = cmd.replace(/'/g, "'\\''");
    return execAsync(`sudo -u www-data bash -c '${safeCmd}'`);
};

const start = async (website) => {
    const appPath = `/var/www/${website.name}`;
    const venvPath = `${appPath}/venv`;
    const appName = website.name;

    try {
        // Create virtualenv if not exists (as www-data)
        // Check existence first to avoid error if already exists owned by root (should verify ownership)
        // Ensure ownership first
        await execAsync(`chown -R www-data:www-data ${appPath}`);
        
        await runAsUser(`test -d ${venvPath} || python3 -m venv ${venvPath}`);

        // Install requirements
        const reqFile = `${appPath}/requirements.txt`;
        await runAsUser(`test -f ${reqFile} && ${venvPath}/bin/pip install -r ${reqFile}`);

        // Detect framework
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

        // Start with PM2 as www-data
        await runAsUser(`cd ${appPath} && pm2 start "${startCommand}" --name ${appName}`);
        await runAsUser(`pm2 save`);

        return true;
    } catch (error) {
        throw new Error(`Failed to start Python app: ${error.message}`);
    }
};

const stop = async (website) => {
    try {
        await runAsUser(`pm2 delete ${website.name}`);
        await runAsUser(`pm2 save`);
        return true;
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('doesn\'t exist')) return true;
        throw new Error(`Failed to stop Python app: ${error.message}`);
    }
};

const restart = async (website) => {
    try {
        await runAsUser(`pm2 restart ${website.name}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to restart Python app: ${error.message}`);
    }
};

const detectFramework = async (appPath) => {
    try {
        const { stdout } = await execAsync(`grep -l "django\\|Django" ${appPath}/*.py 2>/dev/null || echo ""`);
        if (stdout) return 'django';

        const { stdout: flask } = await execAsync(`grep -l "flask\\|Flask" ${appPath}/*.py 2>/dev/null || echo ""`);
        if (flask) return 'flask';

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
