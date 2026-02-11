const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Allowed log files map
const LOG_FILES = {
    'nginx_access': '/var/log/nginx/access.log',
    'nginx_error': '/var/log/nginx/error.log',
    'syslog': '/var/log/syslog',
    'auth': '/var/log/auth.log',
    'panel': '/opt/nexpanel/output.log' // Assuming PM2 logs here or similar
};

const getLogContent = async (logKey, lines = 100) => {
    if (!LOG_FILES[logKey]) throw new Error('Invalid log file');
    
    const filePath = LOG_FILES[logKey];
    
    try {
        // Use tail to get last N lines
        const { stdout } = await execAsync(`tail -n ${lines} ${filePath}`);
        return stdout;
    } catch (error) {
        // File might not exist or empty
        return '';
    }
};

const getWebsiteLogs = async (websiteName, type = 'access', lines = 50) => {
    // Validate website name to prevent traversal
    if (!/^[a-zA-Z0-9.-]+$/.test(websiteName)) throw new Error('Invalid website name');
    
    const logDir = `/var/www/${websiteName}/logs`; // Assuming standard structure?
    // Actually Nginx logs usually go to /var/log/nginx/domain.access.log via config
    // Let's check where we configured them.
    // In services/nginx.js -> access_log /var/log/nginx/current_domain.access.log;
    
    // We need the domain to find the log file
    // Or we stick to the Nginx naming convention we used.
    // Logic: listing logs for a site
    
    return ''; // Placeholder until we confirm path
};

module.exports = {
    getLogContent,
    getWebsiteLogs
};
