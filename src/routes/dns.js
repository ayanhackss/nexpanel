const authMiddleware = require('../middleware/auth');
const cfService = require('../services/cloudflare');

async function dnsRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        const token = cfService.getToken();
        // If no token, pass flag to view to show config modal
        return reply.view('dns.ejs', { user: request.session.user, hasToken: !!token });
    });

    fastify.post('/api/config', { preHandler: authMiddleware }, async (request, reply) => {
        const { token } = request.body;
        if (!token) return reply.code(400).send({ error: 'Token required' });
        
        try {
            cfService.saveToken(token);
            // Validate by trying to list zones
            await cfService.listZones();
            return reply.send({ message: 'Cloudflare connected' });
        } catch (error) {
            return reply.code(400).send({ error: 'Invalid token: ' + error.message });
        }
    });

    fastify.get('/api/zones', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const zones = await cfService.listZones();
            return reply.send(zones);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.get('/api/zones/:id/records', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const records = await cfService.getDnsRecords(request.params.id);
            return reply.send(records);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/records', { preHandler: authMiddleware }, async (request, reply) => {
        const { zoneId, type, name, content, proxied } = request.body;
        try {
            const record = await cfService.createRecord(zoneId, type, name, content, proxied);
            return reply.send(record);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.delete('/api/records/:id', { preHandler: authMiddleware }, async (request, reply) => {
        const { zoneId } = request.body;
        try {
            await cfService.deleteRecord(zoneId, request.params.id);
            return reply.send({ message: 'Record deleted' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = dnsRoutes;
