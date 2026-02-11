const authMiddleware = require('../middleware/auth');
const phpExtService = require('../services/php_extensions');
const { sqliteDb } = require('../config/database');

async function phpExtRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('php_extensions.ejs', { user: request.session.user });
    });

    fastify.get('/api/list', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const data = await phpExtService.listExtensions();
            return reply.send(data);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/install', { preHandler: authMiddleware }, async (request, reply) => {
        const { extension } = request.body;
        try {
            await phpExtService.installExtension(extension);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'install_php_ext', ?)
            `).run(request.session.user.id, JSON.stringify({ extension }));

            return reply.send({ message: 'Extension installed' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/remove', { preHandler: authMiddleware }, async (request, reply) => {
        const { extension } = request.body;
        try {
            await phpExtService.uninstallExtension(extension);
            
             // Audit Log
             sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'remove_php_ext', ?)
            `).run(request.session.user.id, JSON.stringify({ extension }));

            return reply.send({ message: 'Extension removed' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = phpExtRoutes;
