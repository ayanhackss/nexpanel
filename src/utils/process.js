const { spawn } = require('child_process');

const spawnAsync = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);
        let stdout = '';
        let stderr = '';

        if (child.stdout) {
            child.stdout.on('data', (data) => stdout += data);
        }
        if (child.stderr) {
            child.stderr.on('data', (data) => stderr += data);
        }

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const error = new Error(`Command failed: ${stderr || 'Unknown error'} (exit code: ${code})`);
                error.code = code;
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
};

module.exports = { spawnAsync };
