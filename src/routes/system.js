const authMiddleware = require('../middleware/auth');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { mariaPool, sqliteDb } = require('../config/database');

async function systemRoutes(fastify, options) {
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            // OS Info
            const osInfo = {
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalmem: os.totalmem(),
                freemem: os.freemem(),
                loadavg: os.loadavg()
            };

            // Database Check
            let dbStatus = {
                mariadb: 'unknown',
                sqlite: 'unknown'
            };

            try {
                await mariaPool.query('SELECT 1');
                dbStatus.mariadb = 'connected';
            } catch (e) {
                dbStatus.mariadb = 'disconnected';
            }

            try {
                sqliteDb.prepare('SELECT 1').get();
                dbStatus.sqlite = 'connected';
            } catch (e) {
                dbStatus.sqlite = 'disconnected';
            }

            // Service Status (Basic check)
            let services = {
                nginx: 'unknown',
                pm2: 'unknown'
            };

            try {
                await execAsync('systemctl is-active nginx');
                services.nginx = 'running';
            } catch (e) {
                services.nginx = 'stopped';
            }

            try {
                await execAsync('pm2 ping');
                services.pm2 = 'running';
            } catch (e) {
                services.pm2 = 'stopped';
            }

            return {
                os: osInfo,
                node_version: process.version,
                panel_version: require('../../package.json').version,
                database: dbStatus,
                services: services,
                uptime: process.uptime()
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch system info' });
        }
    });
}

module.exports = systemRoutes;
