const { sqliteDb } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const nginxService = require('../services/nginx');
const phpFpmService = require('../services/php-fpm');
const nodejsService = require('../services/nodejs');
const pythonService = require('../services/python');

// Input validation helper
const validateWebsiteInput = (data) => {
    const errors = [];

    // Validate name: alphanumeric, dashes, underscores only
    if (!data.name || !/^[a-zA-Z0-9_-]+$/.test(data.name)) {
        errors.push('Website name must contain only alphanumeric characters, dashes, and underscores');
    }
    if (data.name && (data.name.length < 2 || data.name.length > 50)) {
        errors.push('Website name must be between 2 and 50 characters');
    }

    // Validate domain: basic domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/;
    if (!data.domain || !domainRegex.test(data.domain)) {
        errors.push('Invalid domain format');
    }
    if (data.domain && data.domain.length > 255) {
        errors.push('Domain too long (max 255 characters)');
    }

    // Validate runtime
    if (!['php', 'nodejs', 'python'].includes(data.runtime)) {
        errors.push('Invalid runtime. Must be php, nodejs, or python');
    }

    // Validate PHP version if provided
    if (data.php_version && !['7.4', '8.0', '8.1', '8.2'].includes(data.php_version)) {
        errors.push('Invalid PHP version. Must be 7.4, 8.0, 8.1, or 8.2');
    }

    return errors;
};

async function websitesRoutes(fastify, options) {

    // Get all websites
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        const websites = sqliteDb.prepare('SELECT * FROM websites ORDER BY created_at DESC').all();
        return reply.send(websites);
    });

    // Get single website
    fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.id);
        if (!website) {
            return reply.code(404).send({ error: 'Website not found' });
        }
        return reply.send(website);
    });

    // Create website
    fastify.post('/', { 
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { name, domain, runtime, php_version } = request.body;

        // Validate input
        const validationErrors = validateWebsiteInput({ name, domain, runtime, php_version });
        if (validationErrors.length > 0) {
            return reply.code(400).send({ error: validationErrors.join('; ') });
        }

        try {
            // Check for duplicate name
            const existing = sqliteDb.prepare('SELECT id FROM websites WHERE name = ?').get(name);
            if (existing) {
                return reply.code(409).send({ error: 'Website with this name already exists' });
            }

            // Allocate port for Node.js/Python
            let port = null;
            if (runtime === 'nodejs' || runtime === 'python') {
                port = await allocatePort();
                if (!port || port > 65535) {
                    return reply.code(500).send({ error: 'Failed to allocate port' });
                }
            }

            // Insert website
            const result = sqliteDb.prepare(`
                INSERT INTO websites (name, domain, runtime, php_version, port, status)
                VALUES (?, ?, ?, ?, ?, 'stopped')
            `).run(name, domain, runtime, php_version || null, port);

            const websiteId = result.lastInsertRowid;

            // Create directory
            const websiteDir = `/var/www/${name}`;
            await execCommand(`mkdir -p ${websiteDir}`);
            await execCommand(`chown www-data:www-data ${websiteDir}`);

            // Generate Nginx config
            await nginxService.createVhost(websiteId, name, domain, runtime, php_version, port);

            // Create PHP-FPM pool if PHP
            if (runtime === 'php') {
                await phpFpmService.createPool(name, php_version || '8.2');
            }

            // Audit log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'create_website', ?)
            `).run(request.session.user.id, JSON.stringify({ name, domain, runtime }));

            return reply.code(201).send({ id: websiteId, message: 'Website created successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create website' });
        }
    });

    // Start website
    fastify.post('/:id/start', { 
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.id);

        if (!website) {
            return reply.code(404).send({ error: 'Website not found' });
        }

        try {
            if (website.runtime === 'nodejs') {
                await nodejsService.start(website);
            } else if (website.runtime === 'python') {
                await pythonService.start(website);
            } else if (website.runtime === 'php') {
                // PHP sites are handled by Nginx + PHP-FPM
                await phpFpmService.createPool(website.name, website.php_version || '8.2');
            }

            sqliteDb.prepare('UPDATE websites SET status = ? WHERE id = ?').run('running', website.id);

            return reply.send({ message: 'Website started' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to start website' });
        }
    });

    // Stop website
    fastify.post('/:id/stop', { 
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.id);

        if (!website) {
            return reply.code(404).send({ error: 'Website not found' });
        }

        try {
            if (website.runtime === 'nodejs') {
                await nodejsService.stop(website);
            } else if (website.runtime === 'python') {
                await pythonService.stop(website);
            }

            sqliteDb.prepare('UPDATE websites SET status = ? WHERE id = ?').run('stopped', website.id);

            return reply.send({ message: 'Website stopped' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to stop website' });
        }
    });

    // Restart website
    fastify.post('/:id/restart', { 
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.id);

        if (!website) {
            return reply.code(404).send({ error: 'Website not found' });
        }

        try {
            // Stop first
            if (website.runtime === 'nodejs') {
                await nodejsService.stop(website);
            } else if (website.runtime === 'python') {
                await pythonService.stop(website);
            }

            // Start again
            if (website.runtime === 'nodejs') {
                await nodejsService.start(website);
            } else if (website.runtime === 'python') {
                await pythonService.start(website);
            } else if (website.runtime === 'php') {
                // Reload PHP-FPM pool
                await phpFpmService.reloadPool(website.name);
            }

            return reply.send({ message: 'Website restarted' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to restart website' });
        }
    });

    // Delete website
    fastify.delete('/:id', { 
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '5 minutes'
            }
        }
    }, async (request, reply) => {
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.id);

        if (!website) {
            return reply.code(404).send({ error: 'Website not found' });
        }

        try {
            // Stop if running
            if (website.status === 'running') {
                if (website.runtime === 'nodejs') await nodejsService.stop(website);
                if (website.runtime === 'python') await pythonService.stop(website);
            }

            // Remove Nginx config
            await nginxService.removeVhost(website.name);

            // Remove PHP-FPM pool
            if (website.runtime === 'php') {
                await phpFpmService.removePool(website.name);
            }

            // Delete from database
            sqliteDb.prepare('DELETE FROM websites WHERE id = ?').run(website.id);

            // Audit log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'delete_website', ?)
            `).run(request.session.user.id, JSON.stringify({ name: website.name, domain: website.domain }));

            return reply.send({ message: 'Website deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete website' });
        }
    });
}

// Helper functions
const execCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        require('child_process').exec(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout);
        });
    });
};

const allocatePort = async () => {
    const usedPorts = sqliteDb.prepare('SELECT port FROM websites WHERE port IS NOT NULL').all().map(w => w.port);
    let port = 3000;
    while (usedPorts.includes(port)) {
        port++;
        if (port > 65535) return null;
    }
    return port;
};

module.exports = websitesRoutes;
