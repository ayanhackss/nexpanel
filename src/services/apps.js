const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const dbService = require('./database'); // MariaDB service
const { sqliteDb } = require('../config/database');

const installWordPress = async (websiteId) => {
    // Get website details
    const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(websiteId);
    if (!website) throw new Error('Website not found');

    const domain = website.domain;
    const docRoot = `/var/www/${website.name}`;
    const dbName = `wp_${website.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.floor(Math.random() * 1000)}`;
    const dbUser = `usr_${Math.floor(Math.random() * 10000)}`;
    const dbPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

    try {
        // 1. Download and extract WordPress
        // Check if empty or safe to overwrite? 
        // We refuse if wp-config.php exists
        try {
            await fs.access(`${docRoot}/wp-config.php`);
            throw new Error('WordPress seems to be already installed (wp-config.php exists)');
        } catch (e) {
            if (e.message.includes('already installed')) throw e;
        }

        // Run as www-data to own files
        // Download to clean dir
        await execAsync(`sudo -u www-data wget https://wordpress.org/latest.tar.gz -O ${docRoot}/latest.tar.gz`);
        await execAsync(`sudo -u www-data tar -xzf ${docRoot}/latest.tar.gz -C ${docRoot}`);
        // Move files from wordpress/ to docRoot
        // cp -r ${docRoot}/wordpress/* ${docRoot}/ && rm -rf ${docRoot}/wordpress
        await execAsync(`sudo -u www-data cp -r ${docRoot}/wordpress/* ${docRoot}/`);
        await execAsync(`sudo -u www-data rm -rf ${docRoot}/wordpress ${docRoot}/latest.tar.gz`);

        // 2. Create Database
        await dbService.createDatabase(dbName, dbUser, dbPass);

        // 3. Create wp-config.php
        const wpConfigSample = await fs.readFile(`${docRoot}/wp-config-sample.php`, 'utf8');
        let wpConfig = wpConfigSample
            .replace('database_name_here', dbName)
            .replace('username_here', dbUser)
            .replace('password_here', dbPass);

        // Add proper salts (simulated)
        // In prod we fetch from API, but here we just leave default or generate rand?
        // Let's rely on user finishing install via browser or use basic salts.
        
        await fs.writeFile(`${docRoot}/wp-config.php`, wpConfig);
        await execAsync(`chown www-data:www-data ${docRoot}/wp-config.php`);

        return {
            success: true,
            dbName,
            dbUser,
            dbPass,
            url: `http://${domain}`
        };

    } catch (error) {
        throw new Error(`WordPress installation failed: ${error.message}`);
    }
};

module.exports = {
    installWordPress
};
