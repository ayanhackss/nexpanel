const authMiddleware = require('../middleware/auth');
const appsService = require('../services/apps');
const { sqliteDb } = require('../config/database');

async function appsRoutes(fastify, options) {

    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        // Get generic list of apps (hardcoded for now)
        const apps = [
            { id: 'wordpress', name: 'WordPress', version: 'Latest', icon: 'wordpress' }
        ];
        
        // Get compatible websites (PHP runtime)
        const websites = sqliteDb.prepare("SELECT * FROM websites WHERE runtime = 'php'").all();
        
        return reply.view('apps.ejs', { user: request.session.user, apps, websites });
    });

    fastify.post('/api/install', { preHandler: authMiddleware }, async (request, reply) => {
        const { app, website_id } = request.body;
        
        if (app !== 'wordpress') return reply.code(400).send({ error: 'Only WordPress is currently supported' });
        
        try {
            const result = await appsService.installWordPress(website_id);
            
            // Audit Log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'install_app', ?)
            `).run(request.session.user.id, JSON.stringify({ app, website_id, db: result.dbName }));

            return reply.send({ 
                message: 'WordPress installed successfully!',
                details: result
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
}

module.exports = appsRoutes;
