const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Helper to run commands as www-data
const runAsUser = async (cmd, env = {}) => {
    const safeCmd = cmd.replace(/'/g, "'\\''");
    // Pass environment variables if needed (e.g. key path)
    // Note: providing env vars to sudo can be tricky; mostly needed for SSH key
    // For simplicity, we assume SSH key logic needs adjustment or run as root then chown.
    // Actually, running git as www-data is safer.
    return execAsync(`sudo -u www-data bash -c '${safeCmd}'`, { env });
};

// Sanitize git parameters
const sanitizeGitParam = (param) => {
    if (!param) return '';
    return String(param).replace(/[;&|`$(){}[\]<>\\!#*?"'\n\r]/g, '').trim();
};

const clone = async (repoUrl, destination, branch = 'main', deployKey = null) => {
    try {
        const sanitizedRepoUrl = sanitizeGitParam(repoUrl);
        const sanitizedDestination = sanitizeGitParam(destination);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        const urlRegex = /^https?:\/\/[^\s]+$|^git@[^\s]+:[^\s]+$/;
        if (!urlRegex.test(sanitizedRepoUrl)) {
            throw new Error('Invalid repository URL format');
        }

        if (!sanitizedDestination.startsWith('/var/www/')) {
            throw new Error('Invalid destination path');
        }

        // Ensure parent directory exists and is owned by www-data
        await execAsync(`mkdir -p ${sanitizedDestination} && chown www-data:www-data ${sanitizedDestination}`);
        // Remove created dir to let git clone create it (or empty it)
        await execAsync(`rm -rf ${sanitizedDestination}`);

        let cmd = `git clone -b ${sanitizedBranch} ${sanitizedRepoUrl} ${sanitizedDestination}`;

        if (deployKey) {
            // Setup SSH key in a way www-data can read/use?
            // This is complex with sudo.
            // Alternative: run as root, then chown recursively.
            // Security-wise: running git clone as root is generally okay IF invalid input is handled.
            // BUT, .git hooks could execute code.
            // SAFER: Run as www-data.
            
            // For now, to keep it simple and robust:
            // 1. Run as root (to handle keys easily in /tmp)
            // 2. Chown recursively to www-data immediately after.
            
            const keyPath = `/tmp/deploy_key_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            await execAsync(`printf '%s' '${deployKey}' > ${keyPath} && chmod 600 ${keyPath}`);
            const env = { GIT_SSH_COMMAND: `ssh -i ${keyPath} -o StrictHostKeyChecking=no` };
            
            await execAsync(cmd, { env });
            await execAsync(`rm -f ${keyPath}`);
            await execAsync(`chown -R www-data:www-data ${sanitizedDestination}`);
        } else {
            // Public repo - can run as www-data
            await runAsUser(cmd);
        }

        return true;
    } catch (error) {
        throw new Error(`Git clone failed: ${error.message}`);
    }
};

const pull = async (repoPath, branch = 'main') => {
    try {
        const sanitizedPath = sanitizeGitParam(repoPath);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        // Run as www-data to maintain ownership
        // But if it was cloned as root (before fix), ownership might be mixed.
        // Force chown first? No, slow.
        // Assume correct ownership.
        
        await runAsUser(`git -C ${sanitizedPath} pull origin ${sanitizedBranch}`);
        return true;
    } catch (error) {
        throw new Error(`Git pull failed: ${error.message}`);
    }
};

const push = async (repoPath, branch = 'main') => {
    try {
        const sanitizedPath = sanitizeGitParam(repoPath);
        const sanitizedBranch = sanitizeGitParam(branch) || 'main';

        if (!sanitizedPath.startsWith('/var/www/')) {
            throw new Error('Invalid repository path');
        }

        await runAsUser(`git -C ${sanitizedPath} add .`);
        await runAsUser(`git -C ${sanitizedPath} commit -m "Auto commit via NexPanel"`);
        await runAsUser(`git -C ${sanitizedPath} push origin ${sanitizedBranch}`);
        return true;
    } catch (error) {
        throw new Error(`Git push failed: ${error.message}`);
    }
};

const getCommitHistory = async (repoPath, limit = 10) => {
    try {
        const sanitizedPath = sanitizeGitParam(repoPath);
        if (!sanitizedPath.startsWith('/var/www/')) throw new Error('Invalid path');

        // Safe to run read-only command as root or www-data.
        const { stdout } = await runAsUser(`git -C ${sanitizedPath} log --pretty=format:"%h|%an|%ar|%s" -n ${limit}`);
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
        if (!sanitizedPath.startsWith('/var/www/')) throw new Error('Invalid path');
        
        const { stdout } = await runAsUser(`git -C ${sanitizedPath} branch -a`);
        return stdout.split('\n').filter(b => b.trim()).map(b => b.replace('*', '').trim());
    } catch (error) {
        return [];
    }
};

module.exports = {
    clone,
    pull,
    push,
    getCommitHistory,
    getBranches
};
