const authMiddleware = require('../middleware/auth');
const fileService = require('../services/files');

async function filesRoutes(fastify, options) {

    // View: File Manager Dashboard
    fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
        return reply.view('files.ejs', { 
            user: request.session.user,
            initialPath: request.query.path || '' 
        });
    });

    // API: List files
    fastify.get('/api/list', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const files = await fileService.listFiles(request.query.path);
            return reply.send(files);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Read file content
    fastify.get('/api/content', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const content = await fileService.readFile(request.query.path);
            // Return raw text (or JSON wrapper if preferred, usually JSON wrapper for editor)
            return reply.send({ content });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Save file content
    fastify.post('/api/save', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { path, content } = request.body;
            await fileService.writeFile(path, content);
            return reply.send({ message: 'File saved successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Create Directory
    fastify.post('/api/create-folder', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { path } = request.body; // Full relative path including new folder name
            await fileService.createDirectory(path);
            return reply.send({ message: 'Folder created successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Create File
    fastify.post('/api/create-file', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { path } = request.body; // Full relative path including new file name
            await fileService.createFile(path);
            return reply.send({ message: 'File created successfully' }); 
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Delete Item
    fastify.post('/api/delete', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { path } = request.body;
            await fileService.deleteItem(path);
            return reply.send({ message: 'Item deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });

    // API: Rename Item
    fastify.post('/api/rename', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { oldPath, newPath } = request.body;
            await fileService.renameItem(oldPath, newPath);
            return reply.send({ message: 'Item renamed successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(400).send({ error: error.message });
        }
    });
}

module.exports = filesRoutes;
