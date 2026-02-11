const authMiddleware = require('../middleware/auth');
const sslService = require('../services/ssl');
const { sqliteDb } = require('../config/database');

async function sslRoutes(fastify, options) {

    // View
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('ssl.ejs', { user: request.session.user });
    });

    // API: List Certificates
    fastify.get('/api/list', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const certs = await sslService.listCerts();
            return reply.send(certs);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to list certificates' });
        }
    });

    // API: Generate Certificate
    fastify.post('/api/generate', { preHandler: authMiddleware }, async (request, reply) => {
        const { domain, email } = request.body;

        if (!domain || !email) {
            return reply.code(400).send({ error: 'Domain and Email are required' });
        }

        // Verify domain exists in our panel
        const website = sqliteDb.prepare('SELECT * FROM websites WHERE domain = ?').get(domain);
        if (!website) {
            return reply.code(404).send({ error: 'Domain not found in NexPanel. Add the website first.' });
        }

        try {
            await sslService.generateCert(domain, email);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'generate_ssl', ?)
            `).run(request.session.user.id, JSON.stringify({ domain, email }));

            return reply.send({ message: 'SSL Certificate generated successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // API: Renew All
    fastify.post('/api/renew', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            await sslService.renewCerts();
            return reply.send({ message: 'Renewal process triggered' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // API: Revoke/Delete
    fastify.post('/api/revoke', { preHandler: authMiddleware }, async (request, reply) => {
        const { certName } = request.body;
        try {
            await sslService.revokeCert(certName);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'revoke_ssl', ?)
            `).run(request.session.user.id, JSON.stringify({ certName }));

            return reply.send({ message: 'Certificate revoked/deleted' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = sslRoutes;
