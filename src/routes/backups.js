const { sqliteDb } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

const BACKUP_DIR = '/var/backups/nexpanel';

async function backupsRoutes(fastify, options) {
    // Ensure backup directory exists
    const ensureBackupDir = async () => {
        try {
            await fs.mkdir(BACKUP_DIR, { recursive: true });
        } catch (e) {
            // Directory already exists
        }
    };
    await ensureBackupDir();

    // Get all backups
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const backups = sqliteDb.prepare(`
                SELECT b.*, w.name as website_name, w.domain
                FROM backups b
                LEFT JOIN websites w ON b.website_id = w.id
                ORDER BY b.created_at DESC
            `).all();
            return reply.send(backups);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch backups' });
        }
    });

    // Get backups for specific website
    fastify.get('/website/:id', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const backups = sqliteDb.prepare(`
                SELECT * FROM backups WHERE website_id = ? ORDER BY created_at DESC
            `).all(request.params.id);
            return reply.send(backups);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch backups' });
        }
    });

    // Create backup
    fastify.post('/create/:website_id', {
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '10 minutes'
            }
        }
    }, async (request, reply) => {
        try {
            const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(request.params.website_id);
            if (!website) {
                return reply.code(404).send({ error: 'Website not found' });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `${website.name}_${timestamp}`;
            const backupPath = `${BACKUP_DIR}/${backupName}.tar.gz`;

            // Create backup using tar
            await execAsync(`tar -czf ${backupPath} -C /var/www ${website.name}`);

            // Get file size
            const stats = await fs.stat(backupPath);
            const sizeBytes = stats.size;

            // Save to database
            const result = sqliteDb.prepare(`
                INSERT INTO backups (website_id, backup_path, size_bytes)
                VALUES (?, ?, ?)
            `).run(website.id, backupPath, sizeBytes);

            // Audit log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'create_backup', ?)
            `).run(request.session.user.id, JSON.stringify({ website: website.name, backup_path: backupPath }));

            return reply.code(201).send({
                id: result.lastInsertRowid,
                message: 'Backup created successfully',
                backup_path: backupPath,
                size_bytes: sizeBytes
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create backup' });
        }
    });

    // Restore backup
    fastify.post('/restore/:id', {
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 3,
                timeWindow: '30 minutes'
            }
        }
    }, async (request, reply) => {
        try {
            const backup = sqliteDb.prepare(`
                SELECT b.*, w.name as website_name
                FROM backups b
                LEFT JOIN websites w ON b.website_id = w.id
                WHERE b.id = ?
            `).get(request.params.id);

            if (!backup) {
                return reply.code(404).send({ error: 'Backup not found' });
            }

            // Verify backup file exists
            try {
                await fs.access(backup.backup_path);
            } catch {
                return reply.code(404).send({ error: 'Backup file not found' });
            }

            // Stop website if running
            const website = sqliteDb.prepare('SELECT * FROM websites WHERE id = ?').get(backup.website_id);
            if (website && website.status === 'running') {
                // Website would need to be stopped - this is handled by caller
            }

            // Extract backup
            await execAsync(`tar -xzf ${backup.backup_path} -C /`);

            // Audit log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'restore_backup', ?)
            `).run(request.session.user.id, JSON.stringify({ backup_id: backup.id, website: backup.website_name }));

            return reply.send({
                message: 'Backup restored successfully',
                website: backup.website_name
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to restore backup' });
        }
    });

    // Delete backup
    fastify.delete('/:id', {
        preHandler: authMiddleware,
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '5 minutes'
            }
        }
    }, async (request, reply) => {
        try {
            const backup = sqliteDb.prepare('SELECT * FROM backups WHERE id = ?').get(request.params.id);
            if (!backup) {
                return reply.code(404).send({ error: 'Backup not found' });
            }

            // Delete file
            try {
                await fs.unlink(backup.backup_path);
            } catch (e) {
                // File might not exist
            }

            // Delete from database
            sqliteDb.prepare('DELETE FROM backups WHERE id = ?').run(request.params.id);

            // Audit log
            sqliteDb.prepare(`
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, 'delete_backup', ?)
            `).run(request.session.user.id, JSON.stringify({ backup_id: backup.id }));

            return reply.send({ message: 'Backup deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete backup' });
        }
    });

    // Download backup
    fastify.get('/download/:id', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const backup = sqliteDb.prepare('SELECT * FROM backups WHERE id = ?').get(request.params.id);
            if (!backup) {
                return reply.code(404).send({ error: 'Backup not found' });
            }

            try {
                await fs.access(backup.backup_path);
            } catch {
                return reply.code(404).send({ error: 'Backup file not found' });
            }

            const filename = path.basename(backup.backup_path);
            return reply.sendFile(backup.backup_path, { filename });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to download backup' });
        }
    });
}

module.exports = backupsRoutes;
