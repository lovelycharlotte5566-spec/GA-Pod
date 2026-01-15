// Vercel Serverless Function for /api/messages/:messageId/comments/count
const { getDbConnection } = require('../../../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDbConnection();
        // Extract messageId from URL - go up 1 level from /count
        const urlParts = req.url.split('/');
        const messageId = urlParts[urlParts.length - 2] || req.query.messageId;
        
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID is required' });
        }
        
        const result = await db.execute(
            'SELECT COUNT(*) as count FROM comments WHERE message_id = ?',
            [messageId]
        );
        
        const row = result.rows[0];
        const count = row ? (row.count !== undefined ? row.count : (typeof row === 'object' ? Object.values(row)[0] : 0)) : 0;
        
        return res.status(200).json({ count: Number(count) || 0 });
    } catch (error) {
        console.error('Error fetching comment count:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
