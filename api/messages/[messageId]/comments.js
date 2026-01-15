// Vercel Serverless Function for /api/messages/:messageId/comments
const { getDbConnection } = require('../../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDbConnection();
        // Extract messageId from URL path
        const urlParts = req.url.split('/');
        const messageId = urlParts[urlParts.length - 1] || req.query.messageId;
        
        if (!messageId) {
            return res.status(400).json({ error: 'Message ID is required' });
        }
        
        if (req.method === 'GET') {
            const result = await db.execute(
                'SELECT * FROM comments WHERE message_id = ? ORDER BY timestamp ASC',
                [messageId]
            );
            
            const allComments = Array.isArray(result.rows) ? result.rows : (result.rows ? [result.rows] : []);
            const comments = allComments.filter(c => !c.parent_id);
            const replies = allComments.filter(c => c.parent_id);
            
            comments.forEach(comment => {
                comment.replies = replies.filter(r => r.parent_id === comment.id);
            });
            
            return res.status(200).json(comments);
        }
        
        if (req.method === 'POST') {
            const { text, author, parentId } = req.body;
            
            if (!text) {
                return res.status(400).json({ error: 'Comment text is required' });
            }
            
            const timestamp = Date.now();
            const authorName = author || 'Anonymous';
            
            const result = await db.execute(
                'INSERT INTO comments (message_id, text, author, parent_id, timestamp) VALUES (?, ?, ?, ?, ?)',
                [messageId, text, authorName, parentId || null, timestamp]
            );
            
            return res.status(200).json({ 
                id: result.lastInsertRowid, 
                message_id: parseInt(messageId),
                text, 
                author: authorName, 
                parent_id: parentId || null,
                timestamp 
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in comments API:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
