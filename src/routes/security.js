const authMiddleware = require('../middleware/auth');
const securityService = require('../services/security');
const { sqliteDb } = require('../config/database');

async function securityRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('security.ejs', { user: request.session.user });
    });

    // Firewall API
    fastify.get('/api/firewall', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const status = await securityService.getStatus();
            return reply.send(status);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/firewall/add', { preHandler: authMiddleware }, async (request, reply) => {
        const { port, protocol, action } = request.body;
        if (!port) return reply.code(400).send({ error: 'Port required' });
        
        try {
            if (action === 'allow') {
                await securityService.allowPort(port, protocol || 'tcp');
            } else {
                await securityService.denyPort(port, protocol || 'tcp');
            }
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'firewall_add_rule', ?)
            `).run(request.session.user.id, JSON.stringify({ port, action }));

            return reply.send({ message: 'Rule added' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/firewall/delete', { preHandler: authMiddleware }, async (request, reply) => {
        const { ruleId } = request.body;
        try {
            await securityService.deleteRule(ruleId);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'firewall_delete_rule', ?)
            `).run(request.session.user.id, JSON.stringify({ ruleId }));

            return reply.send({ message: 'Rule deleted' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/firewall/toggle', { preHandler: authMiddleware }, async (request, reply) => {
        const { enable } = request.body;
        try {
            if (enable) await securityService.enable();
            else await securityService.disable();
            
            return reply.send({ message: `Firewall ${enable ? 'enabled' : 'disabled'}` });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = securityRoutes;
