const axios = require('axios');
const { sqliteDb } = require('../config/database');

const getClient = () => {
    const tokenRow = sqliteDb.prepare("SELECT value FROM settings WHERE key = 'cloudflare_token'").get();
    if (!tokenRow || !tokenRow.value) {
        throw new Error('Cloudflare API Token not configured');
    }
    
    return axios.create({
        baseURL: 'https://api.cloudflare.com/client/v4',
        headers: {
            'Authorization': `Bearer ${tokenRow.value}`,
            'Content-Type': 'application/json'
        }
    });
};

const listZones = async () => {
    const client = getClient();
    try {
        const res = await client.get('/zones?per_page=50');
        return res.data.result.map(z => ({
            id: z.id,
            name: z.name,
            status: z.status,
            ns: z.name_servers
        }));
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
    }
};

const getDnsRecords = async (zoneId) => {
    const client = getClient();
    try {
        const res = await client.get(`/zones/${zoneId}/dns_records?per_page=100`);
        return res.data.result;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
    }
};

const createRecord = async (zoneId, type, name, content, proxied = true) => {
    const client = getClient();
    try {
        const res = await client.post(`/zones/${zoneId}/dns_records`, {
            type, name, content, proxied
        });
        return res.data.result;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
    }
};

const deleteRecord = async (zoneId, recordId) => {
    const client = getClient();
    try {
        await client.delete(`/zones/${zoneId}/dns_records/${recordId}`);
        return true;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
    }
};

const saveToken = (token) => {
    sqliteDb.prepare("INSERT INTO settings (key, value) VALUES ('cloudflare_token', ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(token, token);
};

const getToken = () => {
    const row = sqliteDb.prepare("SELECT value FROM settings WHERE key = 'cloudflare_token'").get();
    return row ? row.value : null;
};

module.exports = {
    listZones,
    getDnsRecords,
    createRecord,
    deleteRecord,
    saveToken,
    getToken
};
