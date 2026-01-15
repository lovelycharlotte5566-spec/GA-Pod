// Vercel Serverless Function for /api/messages/:messageId/likes/check
const { getDbConnection } = require('../../../db');

function getUserIdentifier(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'unknown';
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDbConnection();
        // Extract messageId from URL - go up 2 levels from /check
        const urlParts = req.url.split('/');
        const messageId = urlParts[urlParts.length - 3] || req.query.messageId;
        
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID is required' });
        }
        
        const userIdentifier = getUserIdentifier(req);
        
        const result = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE message_id = ? AND user_identifier = ?',
            [messageId, userIdentifier]
        );
        
        const row = result.rows[0];
        const count = row ? (row.count !== undefined ? row.count : (typeof row === 'object' ? Object.values(row)[0] : 0)) : 0;
        
        return res.status(200).json({ liked: (Number(count) || 0) > 0 });
    } catch (error) {
        console.error('Error checking like:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
