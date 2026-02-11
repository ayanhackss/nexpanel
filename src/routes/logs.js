const authMiddleware = require('../middleware/auth');
const logsService = require('../services/logs');

async function logsRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('logs.ejs', { user: request.session.user });
    });

    fastify.get('/api/view/:logKey', { preHandler: authMiddleware }, async (request, reply) => {
        const { logKey } = request.params;
        try {
            const content = await logsService.getLogContent(logKey);
            return reply.send({ content });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = logsRoutes;
