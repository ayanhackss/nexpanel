const authMiddleware = require('../middleware/auth');
const databaseService = require('../services/database');
const { sqliteDb } = require('../config/database');

async function databasesRoutes(fastify, options) {
    
    // Get all databases
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            // We store metadata in SQLite but verify with MariaDB
            const databases = sqliteDb.prepare('SELECT * FROM databases ORDER BY created_at DESC').all();
            return reply.send(databases);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch databases' });
        }
    });

    // Create database
    fastify.post('/', {
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { name, username, password, website_id } = request.body;

        try {
            // Validation
            if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
                return reply.code(400).send({ error: 'Invalid database name' });
            }

            // Create in MariaDB
            await databaseService.createDatabase(name, username, password);

            // Save metadata to SQLite
            const result = sqliteDb.prepare(`
                INSERT INTO databases (website_id, name, username, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `).run(website_id || null, name, username);

            return reply.code(201).send({
                id: result.lastInsertRowid,
                name,
                username,
                message: 'Database created successfully'
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Failed to create database' });
        }
    });

    // Delete database
    fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const db = sqliteDb.prepare('SELECT * FROM databases WHERE id = ?').get(request.params.id);
            if (!db) {
                return reply.code(404).send({ error: 'Database not found' });
            }

            // Delete from MariaDB
            await databaseService.deleteDatabase(db.name, db.username);

            // Delete Metadata
            sqliteDb.prepare('DELETE FROM databases WHERE id = ?').run(request.params.id);

            return reply.send({ message: 'Database deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete database' });
        }
    });
}

module.exports = databasesRoutes;
