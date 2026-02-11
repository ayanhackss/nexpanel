const authMiddleware = require('../middleware/auth');
const redisService = require('../services/redis');
const { sqliteDb } = require('../config/database');

async function redisRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('redis.ejs', { user: request.session.user });
    });

    fastify.get('/api/info', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const info = await redisService.getInfo();
            if (!info) return reply.send({ status: 'offline' });
            return reply.send({ status: 'online', ...info });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/flush', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            await redisService.flushAll();
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'flush_redis', 'all')
            `).run(request.session.user.id);

            return reply.send({ message: 'Redis flushed' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/restart', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            await redisService.restart();
            return reply.send({ message: 'Redis restarting...' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = redisRoutes;
