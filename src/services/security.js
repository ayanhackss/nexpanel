const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const getStatus = async () => {
    try {
        const { stdout } = await execAsync('ufw status numbered');
        return parseUfwStatus(stdout);
    } catch (error) {
        throw new Error(`Failed to get firewall status: ${error.message}`);
    }
};

const allowPort = async (port, protocol = 'tcp') => {
    if (!/^\d+$/.test(port)) throw new Error('Invalid port');
    try {
        await execAsync(`ufw allow ${port}/${protocol}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to allow port: ${error.message}`);
    }
};

const denyPort = async (port, protocol = 'tcp') => {
    if (!/^\d+$/.test(port)) throw new Error('Invalid port');
    try {
        await execAsync(`ufw deny ${port}/${protocol}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to deny port: ${error.message}`);
    }
};

const deleteRule = async (ruleNumber) => {
    try {
        // "yes | ufw delete X" to confirm
        await execAsync(`yes | ufw delete ${ruleNumber}`);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete rule: ${error.message}`);
    }
};

const enable = async () => {
    await execAsync('yes | ufw enable');
};

const disable = async () => {
    await execAsync('yes | ufw disable');
};

const parseUfwStatus = (stdout) => {
    const lines = stdout.split('\n');
    const rules = [];
    let isActive = false;

    lines.forEach(line => {
        if (line.includes('Status: active')) isActive = true;
        if (line.startsWith('[')) {
            // [ 1] 22/tcp                   ALLOW IN    Anywhere
            const parts = line.match(/\[\s*(\d+)\]\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+(.*)/);
            if (parts) {
                rules.push({
                    id: parts[1],
                    to: parts[2],
                    action: parts[3] + ' ' + parts[4],
                    from: parts[5].trim()
                });
            }
        }
    });

    return { active: isActive, rules };
};

module.exports = {
    getStatus,
    allowPort,
    denyPort,
    deleteRule,
    enable,
    disable
};
