const { spawnAsync } = require('../utils/process');
const fs = require('fs').promises;

const clone = async (repoUrl, destination, branch = 'main', deployKey = null) => {
    let keyPath;
    try {
        const env = { ...process.env };

        if (deployKey) {
            keyPath = `/tmp/deploy_key_${Date.now()}`;
            await fs.writeFile(keyPath, deployKey, { mode: 0o600 });
            env.GIT_SSH_COMMAND = `ssh -i ${keyPath} -o StrictHostKeyChecking=no`;
        }

        await spawnAsync('git', ['clone', '-b', branch, repoUrl, destination], { env });

        return true;
    } catch (error) {
        throw new Error(`Git clone failed: ${error.message}`);
    } finally {
        if (keyPath) {
            await fs.unlink(keyPath).catch(() => {});
        }
    }
};

const pull = async (repoPath, branch = 'main') => {
    try {
        await spawnAsync('git', ['pull', 'origin', branch], { cwd: repoPath });
        return true;
    } catch (error) {
        throw new Error(`Git pull failed: ${error.message}`);
    }
};

const push = async (repoPath, branch = 'main') => {
    try {
        await spawnAsync('git', ['add', '.'], { cwd: repoPath });
        try {
            await spawnAsync('git', ['commit', '-m', 'Auto commit'], { cwd: repoPath });
        } catch (e) {
            // Check stdout for 'nothing to commit'
            if (e.stdout && e.stdout.includes('nothing to commit')) {
                // Ignore
            } else {
                throw e;
            }
        }
        await spawnAsync('git', ['push', 'origin', branch], { cwd: repoPath });
        return true;
    } catch (error) {
        throw new Error(`Git push failed: ${error.message}`);
    }
};

const getBranches = async (repoPath) => {
    try {
        const { stdout } = await spawnAsync('git', ['branch', '-a'], { cwd: repoPath });
        return stdout.toString().split('\n')
            .filter(b => b.trim())
            .map(b => b.replace('*', '').trim());
    } catch (error) {
        return [];
    }
};

const checkout = async (repoPath, branch) => {
    try {
        await spawnAsync('git', ['checkout', branch], { cwd: repoPath });
        return true;
    } catch (error) {
        throw new Error(`Git checkout failed: ${error.message}`);
    }
};

const getCommitHistory = async (repoPath, limit = 10) => {
    try {
        const { stdout } = await spawnAsync('git', ['log', `--pretty=format:%h|%an|%ar|%s`, `-n`, `${limit}`], { cwd: repoPath });
        return stdout.toString().split('\n').filter(line => line).map(line => {
            const [hash, author, date, message] = line.split('|');
            return { hash, author, date, message };
        });
    } catch (error) {
        return [];
    }
};

module.exports = {
    clone,
    pull,
    push,
    getBranches,
    checkout,
    getCommitHistory
};
