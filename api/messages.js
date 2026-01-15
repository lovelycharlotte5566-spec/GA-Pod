// Vercel Serverless Function for /api/messages
const { getDbConnection } = require('./db');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDbConnection();
        
        if (req.method === 'GET') {
            // Get messages
            const category = req.query.category;
            const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
            
            let query = 'SELECT * FROM messages WHERE timestamp > ?';
            let params = [fiveDaysAgo];
            
            if (category && category !== 'all') {
                query += ' AND category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY timestamp DESC';
            
            console.log('Fetching messages:', query, params);
            const result = await db.execute(query, params);
            const rows = Array.isArray(result.rows) ? result.rows : (result.rows ? [result.rows] : []);
            console.log('Found', rows.length, 'messages');
            
            return res.status(200).json(rows);
        }
        
        if (req.method === 'POST') {
            // Create message
            const { text, author, category } = req.body;
            
            if (!text || !category) {
                return res.status(400).json({ error: 'Text and category are required' });
            }
            
            const timestamp = Date.now();
            const authorName = author || 'Anonymous';
            
            const result = await db.execute(
                'INSERT INTO messages (text, author, category, timestamp) VALUES (?, ?, ?, ?)',
                [text, authorName, category, timestamp]
            );
            
            return res.status(200).json({ 
                id: result.lastInsertRowid, 
                text, 
                author: authorName, 
                category, 
                timestamp 
            });
        }
        
        if (req.method === 'DELETE') {
            // Delete all messages
            await db.execute('DELETE FROM messages');
            return res.status(200).json({ message: 'All messages deleted' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Error in messages API:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
