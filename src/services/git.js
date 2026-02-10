const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Sanitize git parameters to prevent command injection
const sanitizeGitParam = (param) => {
    if (!param) return '';
    // Remove any shell metacharacters
    return String(param).replace(/[;&|`$(){}[\]<>\\!#*?"'\n\r]/g, '').trim();
};

const clone = async (repoUrl, destination, branch = 'main', deployKey = null) => {
    try {
        // Validate and sanitize inputs
        const sanitizedRepoUrl = sanitizeGitParam(repoUrl);
        const sanitizedDestination = sanitizeGitParam(destination);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        // Validate repo URL format
        const urlRegex = /^https?:\/\/[^\s]+$|^git@[^\s]+:[^\s]+$/;
        if (!urlRegex.test(sanitizedRepoUrl)) {
            throw new Error('Invalid repository URL format');
        }

        // Validate destination path
        if (!sanitizedDestination.startsWith('/var/www/')) {
            throw new Error('Invalid destination path');
        }

        let keyPath = null;
        let env = null;

        if (deployKey) {
            // Use SSH key for private repos - write to temp file securely
            keyPath = `/tmp/deploy_key_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            await execAsync('sh', ['-c', `printf '%s' '${deployKey}' > ${keyPath} && chmod 600 ${keyPath}`]);
            env = { GIT_SSH_COMMAND: `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o BatchMode=yes` };
        }

        // Use git directly with args array (safe from injection)
        await execAsync('git', ['clone', '-b', sanitizedBranch, sanitizedRepoUrl, sanitizedDestination], { env });

        // Clean up SSH key file
        if (keyPath) {
            await execAsync('rm', ['-f', keyPath]).catch(() => {});
        }

        return true;
    } catch (error) {
        throw new Error(`Git clone failed: ${error.message}`);
    }
};

const pull = async (repoPath, branch = 'main') => {
    try {
        // Validate path
        const sanitizedPath = sanitizeGitParam(repoPath);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        // Use git with args array
        await execAsync('git', ['-C', sanitizedPath, 'pull', 'origin', sanitizedBranch]);
        return true;
    } catch (error) {
        throw new Error(`Git pull failed: ${error.message}`);
    }
};

const push = async (repoPath, branch = 'main') => {
    try {
        // Validate path
        const sanitizedPath = sanitizeGitParam(repoPath);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        // Use git with args array
        await execAsync('git', ['-C', sanitizedPath, 'add', '.']);
        await execAsync('git', ['-C', sanitizedPath, 'commit', '-m', 'Auto commit via NexPanel']);
        await execAsync('git', ['-C', sanitizedPath, 'push', 'origin', sanitizedBranch]);
        return true;
    } catch (error) {
        throw new Error(`Git push failed: ${error.message}`);
    }
};

const checkout = async (repoPath, branch) => {
    try {
        // Validate path
        const sanitizedPath = sanitizeGitParam(repoPath);
        const sanitizedBranch = sanitizeGitParam(branch);

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        if (!sanitizedBranch) {
            throw new Error('Branch name required');
        }

        // Use git with args array
        await execAsync('git', ['-C', sanitizedPath, 'checkout', sanitizedBranch]);
        return true;
    } catch (error) {
        throw new Error(`Git checkout failed: ${error.message}`);
    }
};

const getCommitHistory = async (repoPath, limit = 10) => {
    try {
        const sanitizedPath = sanitizeGitParam(repoPath);
        const validatedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        const { stdout } = await execAsync('git', ['-C', sanitizedPath, 'log', `--pretty=format:%h|%an|%ar|%s`, `-n`, String(validatedLimit)]);
        return stdout.split('\n').filter(l => l).map(line => {
            const [hash, author, date, message] = line.split('|');
            return { hash, author, date, message };
        });
    } catch (error) {
        return [];
    }
};

const getBranches = async (repoPath) => {
    try {
        const sanitizedPath = sanitizeGitParam(repoPath);

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        const { stdout } = await execAsync('git', ['-C', sanitizedPath, 'branch', '-a']);
        return stdout.split('\n').filter(b => b.trim()).map(b => b.replace('*', '').trim());
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
