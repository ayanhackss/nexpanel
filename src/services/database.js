const { mariaPool } = require('../config/database');

const createDatabase = async (name, username, password) => {
    const connection = await mariaPool.getConnection();
    try {
        await connection.beginTransaction();

        // Create database
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``);

        // Create user
        await connection.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [username, password]);

        // Grant privileges
        await connection.query(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO ?@'%'`, [username]);
        await connection.query('FLUSH PRIVILEGES');

        await connection.commit();
        return { name, username };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const deleteDatabase = async (name, username) => {
    const connection = await mariaPool.getConnection();
    try {
        await connection.beginTransaction();

        // Drop database
        await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);

        // Drop user
        if (username) {
            await connection.query(`DROP USER IF EXISTS ?@'%'`, [username]);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getDatabases = async () => {
    const [rows] = await mariaPool.query('SHOW DATABASES');
    // Filter out system databases
    const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    return rows.map(row => row.Database).filter(db => !systemDbs.includes(db));
};

module.exports = {
    createDatabase,
    deleteDatabase,
    getDatabases
};
