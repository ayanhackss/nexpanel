const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const getInfo = async () => {
    try {
        const { stdout } = await execAsync('redis-cli info');
        return parseRedisInfo(stdout);
    } catch (error) {
        // Redis might not be running
        return null;
    }
};

const flushAll = async () => {
    try {
        await execAsync('redis-cli flushall');
        return true;
    } catch (error) {
        throw new Error(`Failed to flush Redis: ${error.message}`);
    }
};

const restart = async () => {
    await execAsync('systemctl restart redis-server');
    return true;
};

const parseRedisInfo = (info) => {
    const lines = info.split('\n');
    const data = {};
    lines.forEach(line => {
        if (line && !line.startsWith('#')) {
            const parts = line.split(':');
            if (parts.length === 2) {
                data[parts[0]] = parts[1].trim();
            }
        }
    });
    return {
        version: data.redis_version,
        used_memory_human: data.used_memory_human,
        connected_clients: data.connected_clients,
        uptime_days: data.uptime_in_days,
        total_connections_received: data.total_connections_received,
        total_commands_processed: data.total_commands_processed
    };
};

module.exports = {
    getInfo,
    flushAll,
    restart
};
