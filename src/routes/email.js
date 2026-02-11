const authMiddleware = require('../middleware/auth');
const emailService = require('../services/email');
const emailConfigService = require('../services/email_config');
const { sqliteDb } = require('../config/database');

async function emailRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        // Check if we need to get domain list for dropdown
        const domains = sqliteDb.prepare('SELECT domain FROM domains UNION SELECT domain FROM websites').all();
        return reply.view('email.ejs', { user: request.session.user, domains });
    });

    fastify.get('/api/accounts', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const accounts = await emailService.listAccounts();
            return reply.send(accounts);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/create', { preHandler: authMiddleware }, async (request, reply) => {
        const { email, password, quota } = request.body;
        if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });

        try {
            await emailService.createAccount(email, password, quota);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'create_email_account', ?)
            `).run(request.session.user.id, JSON.stringify({ email }));

            return reply.send({ message: 'Account created' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/delete', { preHandler: authMiddleware }, async (request, reply) => {
        const { id } = request.body;
        try {
            await emailService.deleteAccount(id);
            
             // Audit Log
             sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'delete_email_account', ?)
            `).run(request.session.user.id, JSON.stringify({ id }));

            return reply.send({ message: 'Account deleted' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Setup Route - Trigger configuration manually if needed
    fastify.post('/api/setup', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            await emailConfigService.setup();
            return reply.send({ message: 'Mail server configured successfully' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = emailRoutes;
