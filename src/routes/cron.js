const authMiddleware = require('../middleware/auth');
const cronService = require('../services/cron');
const { sqliteDb } = require('../config/database');

async function cronRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('cron.ejs', { user: request.session.user });
    });

    fastify.get('/api/list', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const jobs = await cronService.list();
            return reply.send(jobs);
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/add', { preHandler: authMiddleware }, async (request, reply) => {
        const { schedule, command, comment } = request.body;
        if (!schedule || !command) return reply.code(400).send({ error: 'Schedule and command required' });
        
        try {
            await cronService.add(schedule, command, comment);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'add_cron', ?)
            `).run(request.session.user.id, JSON.stringify({ schedule, command }));

            return reply.send({ message: 'Cron job added' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });

    fastify.post('/api/delete', { preHandler: authMiddleware }, async (request, reply) => {
        const { index } = request.body;
        try {
            await cronService.remove(index);
            
             // Audit Log
             sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'delete_cron', ?)
            `).run(request.session.user.id, JSON.stringify({ index }));

            return reply.send({ message: 'Cron job deleted' });
        } catch (error) {
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = cronRoutes;
