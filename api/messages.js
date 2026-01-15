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
        console.log('📥 Messages API called:', req.method, req.url);
        const db = await getDbConnection();
        console.log('✅ Database connected');
        
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
            
            console.log('🔍 Query:', query);
            console.log('📊 Params:', params);
            
            const result = await db.execute(query, params);
            const rows = Array.isArray(result.rows) ? result.rows : (result.rows ? [result.rows] : []);
            
            console.log(`✅ Found ${rows.length} messages`);
            
            // Format messages to ensure correct structure
            const formattedMessages = rows.map(msg => ({
                id: msg.id,
                text: msg.text || '',
                author: msg.author || 'Anonymous',
                category: msg.category || 'Other',
                timestamp: msg.timestamp || Date.now()
            }));
            
            return res.status(200).json(formattedMessages);
        }
        
        if (req.method === 'POST') {
            // Create message
            console.log('📝 Creating message:', req.body);
            const { text, author, category } = req.body;
            
            if (!text || !category) {
                console.error('❌ Missing required fields');
                return res.status(400).json({ error: 'Text and category are required' });
            }
            
            const timestamp = Date.now();
            const authorName = author || 'Anonymous';
            
            console.log('💾 Inserting message into database...');
            console.log('SQL: INSERT INTO messages (text, author, category, timestamp) VALUES (?, ?, ?, ?)');
            console.log('Params:', [text.substring(0, 50) + '...', authorName, category, timestamp]);
            
            const result = await db.execute(
                'INSERT INTO messages (text, author, category, timestamp) VALUES (?, ?, ?, ?)',
                [text, authorName, category, timestamp]
            );
            
            console.log('✅ Insert result:', result);
            console.log('✅ Message created with ID:', result.lastInsertRowid);
            
            // Verify the message was saved by fetching it back
            if (result.lastInsertRowid) {
                const verifyResult = await db.execute(
                    'SELECT * FROM messages WHERE id = ?',
                    [result.lastInsertRowid]
                );
                console.log('✅ Verified message in database:', verifyResult.rows[0]);
            }
            
            const newMessage = {
                id: result.lastInsertRowid,
                text: text,
                author: authorName,
                category: category,
                timestamp: timestamp
            };
            
            return res.status(200).json(newMessage);
        }
        
        if (req.method === 'DELETE') {
            // Delete all messages
            console.log('🗑️ Deleting all messages');
            await db.execute('DELETE FROM messages');
            return res.status(200).json({ message: 'All messages deleted' });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('❌ Error in messages API:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
