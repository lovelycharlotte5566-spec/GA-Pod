// Vercel Serverless Function for /api/cleanup
const { getDbConnection } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const db = await getDbConnection();
        const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
        
        const result = await db.execute(
            'DELETE FROM messages WHERE timestamp < ?',
            [fiveDaysAgo]
        );
        
        return res.status(200).json({ deleted: result.changes || 0 });
    } catch (error) {
        console.error('Error cleaning up messages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
