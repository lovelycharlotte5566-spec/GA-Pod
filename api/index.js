// Vercel Serverless Function - Main API handler
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// For Turso (SQLite cloud) - install: npm install @libsql/client
// For PostgreSQL - install: npm install pg
// For MySQL - install: npm install mysql2

// Import database connection
const { getDbConnection } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to generate user identifier
function getUserIdentifier(req) {
    return req.headers['x-forwarded-for'] || req.ip || 'unknown';
}

// ==================== MESSAGES API ====================

app.get('/api/messages', async (req, res) => {
    try {
        const db = await getDbConnection();
        const category = req.query.category;
        const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
        
        let query = 'SELECT * FROM messages WHERE timestamp > ?';
        let params = [fiveDaysAgo];
        
        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY timestamp DESC';
        
        console.log('Fetching messages with query:', query, 'params:', params);
        const result = await db.execute(query, params);
        const rows = Array.isArray(result.rows) ? result.rows : (result.rows ? [result.rows] : []);
        console.log('Found messages:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const db = await getDbConnection();
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
        
        res.json({ 
            id: result.lastInsertRowid, 
            text, 
            author: authorName, 
            category, 
            timestamp 
        });
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
});

app.delete('/api/messages', async (req, res) => {
    try {
        const db = await getDbConnection();
        await db.execute('DELETE FROM messages');
        res.json({ message: 'All messages deleted' });
    } catch (error) {
        console.error('Error deleting messages:', error);
        res.status(500).json({ error: 'Failed to delete messages' });
    }
});

// ==================== LIKES API ====================

app.get('/api/messages/:messageId/likes', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
        
        const result = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
            [messageId]
        );
        
        const count = result.rows[0]?.count || result.rows[0]?.count || 0;
        res.json({ count: typeof count === 'object' ? count.count : count });
    } catch (error) {
        console.error('Error fetching likes:', error);
        res.status(500).json({ error: 'Failed to fetch likes' });
    }
});

app.get('/api/messages/:messageId/likes/check', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
        const userIdentifier = getUserIdentifier(req);
        
        const result = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE message_id = ? AND user_identifier = ?',
            [messageId, userIdentifier]
        );
        
        const row = result.rows[0];
        const count = row ? (row.count !== undefined ? row.count : (typeof row === 'object' ? Object.values(row)[0] : 0)) : 0;
        res.json({ liked: (Number(count) || 0) > 0 });
    } catch (error) {
        console.error('Error checking like:', error);
        res.status(500).json({ error: 'Failed to check like' });
    }
});

app.post('/api/messages/:messageId/likes/toggle', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
        const userIdentifier = getUserIdentifier(req);
        
        // Check if already liked
        const checkResult = await db.execute(
            'SELECT id FROM likes WHERE message_id = ? AND user_identifier = ?',
            [messageId, userIdentifier]
        );
        
        const checkRows = Array.isArray(checkResult.rows) ? checkResult.rows : (checkResult.rows ? [checkResult.rows] : []);
        if (checkRows.length > 0) {
            // Unlike
            await db.execute(
                'DELETE FROM likes WHERE message_id = ? AND user_identifier = ?',
                [messageId, userIdentifier]
            );
        } else {
            // Like
            await db.execute(
                'INSERT INTO likes (message_id, user_identifier) VALUES (?, ?)',
                [messageId, userIdentifier]
            );
        }
        
        // Get updated count
        const countResult = await db.execute(
            'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
            [messageId]
        );
        
        const countRow = countResult.rows[0];
        const count = countRow ? (countRow.count !== undefined ? countRow.count : (typeof countRow === 'object' ? Object.values(countRow)[0] : 0)) : 0;
        
        res.json({ 
            liked: checkRows.length === 0, 
            count: Number(count) || 0
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

// ==================== COMMENTS API ====================

app.get('/api/messages/:messageId/comments', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
        
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
        
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.get('/api/messages/:messageId/comments/count', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
        
        const result = await db.execute(
            'SELECT COUNT(*) as count FROM comments WHERE message_id = ?',
            [messageId]
        );
        
        const row = result.rows[0];
        const count = row ? (row.count !== undefined ? row.count : (typeof row === 'object' ? Object.values(row)[0] : 0)) : 0;
        res.json({ count: Number(count) || 0 });
    } catch (error) {
        console.error('Error fetching comment count:', error);
        res.status(500).json({ error: 'Failed to fetch comment count' });
    }
});

app.post('/api/messages/:messageId/comments', async (req, res) => {
    try {
        const db = await getDbConnection();
        const messageId = req.params.messageId;
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
        
        res.json({ 
            id: result.lastInsertRowid, 
            message_id: parseInt(messageId),
            text, 
            author: authorName, 
            parent_id: parentId || null,
            timestamp 
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// ==================== CLEANUP ====================

app.post('/api/cleanup', async (req, res) => {
    try {
        const db = await getDbConnection();
        const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
        
        const result = await db.execute(
            'DELETE FROM messages WHERE timestamp < ?',
            [fiveDaysAgo]
        );
        
        res.json({ deleted: result.changes || 0 });
    } catch (error) {
        console.error('Error cleaning up messages:', error);
        res.status(500).json({ error: 'Failed to cleanup messages' });
    }
});

// Export for Vercel
module.exports = app;
