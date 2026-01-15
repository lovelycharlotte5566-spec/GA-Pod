// Vercel Serverless Function for /api/messages/:messageId/likes/toggle
const { getDbConnection } = require('../../../db');

function getUserIdentifier(req) {
    return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'unknown';
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDbConnection();
        // Extract messageId from URL - go up 2 levels from /toggle
        const urlParts = req.url.split('/');
        const messageId = urlParts[urlParts.length - 3] || req.query.messageId;
        
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID is required' });
        }
        
        const userIdentifier = getUserIdentifier(req);
        
        const checkResult = await db.execute(
            'SELECT id FROM likes WHERE message_id = ? AND user_identifier = ?',
            [messageId, userIdentifier]
        );
        
        const checkRows = Array.isArray(checkResult.rows) ? checkResult.rows : (checkResult.rows ? [checkResult.rows] : []);
        
        if (checkRows.length > 0) {
            await db.execute(
                'DELETE FROM likes WHERE message_id = ? AND user_identifier = ?',
                [messageId, userIdentifier]
            );
        } else {
            await db.execute(
                'INSERT INTO likes (message_id, user_identifier) VALUES (?, ?)',
                [messageId, userIdentifier]
            );
        }
        
        const countResult = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
            [messageId]
        );
        
        const countRow = countResult.rows[0];
        const count = countRow ? (countRow.count !== undefined ? countRow.count : (typeof countRow === 'object' ? Object.values(countRow)[0] : 0)) : 0;
        
        return res.status(200).json({ 
            liked: checkRows.length === 0, 
            count: Number(count) || 0 
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
