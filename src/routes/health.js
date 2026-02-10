async function healthRoutes(fastify, options) {
    fastify.get('/', async (request, reply) => {
        return {
            status: 'ok',
            sku: 'NexPanel',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    });
}

module.exports = healthRoutes;
