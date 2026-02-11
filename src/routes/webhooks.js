const authMiddleware = require('../middleware/auth');
const { sqliteDb } = require('../config/database');
const gitService = require('../services/git');
const crypto = require('crypto');

async function webhookRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('webhooks.ejs', { user: request.session.user });
    });

    // List webhooks
    fastify.get('/api/list', { preHandler: authMiddleware }, async (request, reply) => {
        const webhooks = sqliteDb.prepare(`
            SELECT wh.*, w.name as website_name 
            FROM webhooks wh
            JOIN websites w ON wh.website_id = w.id
        `).all();
        return reply.send(webhooks);
    });

    // Create webhook
    fastify.post('/api/create', { preHandler: authMiddleware }, async (request, reply) => {
        const { website_id } = request.body;
        
        try {
            const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(website_id);
            if (!website) return reply.code(404).send({ error: 'Website not found' });

            const secret = crypto.randomBytes(32).toString('hex');
            const result = sqliteDb.prepare(`
                INSERT INTO webhooks (website_id, secret, created_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `).run(website_id, secret);

            const webhookUrl = `${request.protocol}://${request.hostname}/webhooks/trigger/${result.lastInsertRowid}`;

            return reply.send({ 
                message: 'Webhook created',
                url: webhookUrl,
                secret: secret
            });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    // Delete webhook
    fastify.post('/api/delete', { preHandler: authMiddleware }, async (request, reply) => {
        const { id } = request.body;
        sqliteDb.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
        return reply.send({ message: 'Webhook deleted' });
    });

    // Public Trigger Endpoint (No Auth Middleware here, uses Secret verification)
    fastify.post('/trigger/:id', async (request, reply) => {
        const { id } = request.params;
        const signature = request.headers['x-hub-signature-256'];
        
        const webhook = sqliteDb.prepare(`
            SELECT wh.*, w.name as website_name 
            FROM webhooks wh
            JOIN websites w ON wh.website_id = w.id
            WHERE wh.id = ?
        `).get(id);

        if (!webhook) return reply.code(404).send({ error: 'Webhook not found' });

        // Verify GitHub Signature
        if (signature) {
            const hmac = crypto.createHmac('sha256', webhook.secret);
            const digest = 'sha256=' + hmac.update(JSON.stringify(request.body)).digest('hex');
            if (digest !== signature) {
                return reply.code(401).send({ error: 'Invalid signature' });
            }
        }

        // Trigger Git Pull
        try {
            // Assume repository is already cloned at /var/www/site
            const path = `/var/www/${webhook.website_name}`;
            await gitService.pull(path);
            
            // Log success
            sqliteDb.prepare(`
                UPDATE webhooks SET last_triggered = CURRENT_TIMESTAMP, last_status = 'success' WHERE id = ?
            `).run(id);

            return reply.send({ message: 'Deployed successfully' });
        } catch (error) {
            // Log failure
             sqliteDb.prepare(`
                UPDATE webhooks SET last_triggered = CURRENT_TIMESTAMP, last_status = 'failed' WHERE id = ?
            `).run(id);
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = webhookRoutes;
