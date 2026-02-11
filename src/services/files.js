const fs = require('fs').promises;
const path = require('path');
const { constants } = require('fs');

const BASE_DIR = '/var/www';

/**
 * Sanitize and validate path to prevent traversal
 * @param {string} unsafePath 
 * @returns {string} Absolute safe path
 */
const resolvePath = (unsafePath) => {
    // Default to root if undefined/null
    const relativePath = unsafePath ? String(unsafePath).replace(/^(\.\.(\/|\\|$))+/, '') : '';
    const resolvedPath = path.resolve(BASE_DIR, relativePath.replace(/^\/+/, ''));
    
    // Ensure path is within BASE_DIR
    if (!resolvedPath.startsWith(BASE_DIR)) {
        throw new Error('Access denied: Path outside allowed directory');
    }
    
    return resolvedPath;
};

const listFiles = async (dirPath) => {
    const safePath = resolvePath(dirPath);
    
    try {
        const stats = await fs.stat(safePath);
        if (!stats.isDirectory()) {
            throw new Error('Path is not a directory');
        }

        const entries = await fs.readdir(safePath, { withFileTypes: true });
        
        const files = await Promise.all(entries.map(async (entry) => {
            const entryPath = path.join(safePath, entry.name);
            let size = 0;
            let mtime = new Date();
            
            try {
                // Get detailed stats (size, modification time)
                const entryStats = await fs.stat(entryPath);
                size = entryStats.size;
                mtime = entryStats.mtime;
            } catch (e) {
                // Ignore symlink errors or permission issues for individual files
            }

            return {
                name: entry.name,
                path: path.relative(BASE_DIR, entryPath).replace(/\\/g, '/'),
                type: entry.isDirectory() ? 'directory' : 'file',
                size: size,
                last_modified: mtime
            };
        }));

        // Sort: Directories first, then files (alphabetical)
        return files.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    } catch (error) {
        throw new Error(`Failed to list directory: ${error.message}`);
    }
};

const readFile = async (filePath) => {
    const safePath = resolvePath(filePath);
    try {
        // Enforce max size for editing (e.g. 1MB)
        const stats = await fs.stat(safePath);
        if (stats.size > 1024 * 1024) { // 1MB limit for text editor
            throw new Error('File too large to edit in browser (max 1MB)');
        }
        
        // Read as UTF-8
        return await fs.readFile(safePath, 'utf8');
    } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
};

const writeFile = async (filePath, content) => {
    const safePath = resolvePath(filePath);
    try {
        await fs.writeFile(safePath, content, 'utf8');
        return true;
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
};

const createDirectory = async (dirPath) => {
    const safePath = resolvePath(dirPath);
    try {
        await fs.mkdir(safePath, { recursive: true });
        return true;
    } catch (error) {
        throw new Error(`Failed to create directory: ${error.message}`);
    }
};

const createFile = async (filePath) => {
    const safePath = resolvePath(filePath);
    try {
        // Fail if exists
        try {
            await fs.access(safePath);
            throw new Error('File already exists');
        } catch (e) {
            if (e.message === 'File already exists') throw e;
        }

        await fs.writeFile(safePath, '', 'utf8');
        return true;
    } catch (error) {
        throw new Error(`Failed to create file: ${error.message}`);
    }
};

const deleteItem = async (itemPath) => {
    const safePath = resolvePath(itemPath);
    if (safePath === BASE_DIR) {
        throw new Error('Cannot delete root directory');
    }

    try {
        const stats = await fs.stat(safePath);
        if (stats.isDirectory()) {
            await fs.rm(safePath, { recursive: true, force: true });
        } else {
            await fs.unlink(safePath);
        }
        return true;
    } catch (error) {
        throw new Error(`Failed to delete item: ${error.message}`);
    }
};

const renameItem = async (oldPath, newPath) => {
    const safeOld = resolvePath(oldPath);
    const safeNew = resolvePath(newPath); // This ensures new path is also within /var/www check!

    try {
        await fs.rename(safeOld, safeNew);
        return true;
    } catch (error) {
        throw new Error(`Failed to rename item: ${error.message}`);
    }
};

module.exports = {
    listFiles,
    readFile,
    writeFile,
    createDirectory,
    createFile,
    deleteItem,
    renameItem
};
