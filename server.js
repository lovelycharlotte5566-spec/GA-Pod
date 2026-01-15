const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const dbPath = path.join(__dirname, 'ga-pod.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        // Create database if it doesn't exist
        if (!fs.existsSync(dbPath)) {
            console.log('Database not found. Please run: npm run setup-db');
            process.exit(1);
        }
    } else {
        console.log('Connected to SQLite database.');
        db.run('PRAGMA foreign_keys = ON;');
    }
});

// Helper function to generate user identifier (simple approach)
function getUserIdentifier(req) {
    // In a real app, you'd use session/cookies, but for anonymous app, use IP + User-Agent
    return req.ip + '-' + (req.get('user-agent') || 'unknown').substring(0, 50);
}

// ==================== MESSAGES API ====================

// Get all messages (with optional category filter)
app.get('/api/messages', (req, res) => {
    const category = req.query.category;
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
    
    let query = `
        SELECT * FROM messages 
        WHERE timestamp > ?
    `;
    let params = [fiveDaysAgo];
    
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        res.json(rows);
    });
});

// Create a new message
app.post('/api/messages', (req, res) => {
    const { text, author, category } = req.body;
    
    if (!text || !category) {
        return res.status(400).json({ error: 'Text and category are required' });
    }
    
    const timestamp = Date.now();
    const authorName = author || 'Anonymous';
    
    db.run(
        'INSERT INTO messages (text, author, category, timestamp) VALUES (?, ?, ?, ?)',
        [text, authorName, category, timestamp],
        function(err) {
            if (err) {
                console.error('Error creating message:', err);
                return res.status(500).json({ error: 'Failed to create message' });
            }
            res.json({ 
                id: this.lastID, 
                text, 
                author: authorName, 
                category, 
                timestamp 
            });
        }
    );
});

// Delete all messages (clear function)
app.delete('/api/messages', (req, res) => {
    db.run('DELETE FROM messages', (err) => {
        if (err) {
            console.error('Error deleting messages:', err);
            return res.status(500).json({ error: 'Failed to delete messages' });
        }
        res.json({ message: 'All messages deleted' });
    });
});

// ==================== LIKES API ====================

// Get like count for a message
app.get('/api/messages/:messageId/likes', (req, res) => {
    const messageId = req.params.messageId;
    
    db.get(
        'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
        [messageId],
        (err, row) => {
            if (err) {
                console.error('Error fetching likes:', err);
                return res.status(500).json({ error: 'Failed to fetch likes' });
            }
            res.json({ count: row.count || 0 });
        }
    );
});

// Check if user has liked a message
app.get('/api/messages/:messageId/likes/check', (req, res) => {
    const messageId = req.params.messageId;
    const userIdentifier = getUserIdentifier(req);
    
    db.get(
        'SELECT COUNT(*) as count FROM likes WHERE message_id = ? AND user_identifier = ?',
        [messageId, userIdentifier],
        (err, row) => {
            if (err) {
                console.error('Error checking like:', err);
                return res.status(500).json({ error: 'Failed to check like' });
            }
            res.json({ liked: (row.count || 0) > 0 });
        }
    );
});

// Toggle like on a message
app.post('/api/messages/:messageId/likes/toggle', (req, res) => {
    const messageId = req.params.messageId;
    const userIdentifier = getUserIdentifier(req);
    
    // Check if already liked
    db.get(
        'SELECT id FROM likes WHERE message_id = ? AND user_identifier = ?',
        [messageId, userIdentifier],
        (err, row) => {
            if (err) {
                console.error('Error checking like:', err);
                return res.status(500).json({ error: 'Failed to toggle like' });
            }
            
            if (row) {
                // Unlike
                db.run(
                    'DELETE FROM likes WHERE message_id = ? AND user_identifier = ?',
                    [messageId, userIdentifier],
                    (err) => {
                        if (err) {
                            console.error('Error unliking:', err);
                            return res.status(500).json({ error: 'Failed to unlike' });
                        }
                        // Get updated count
                        db.get(
                            'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
                            [messageId],
                            (err, row) => {
                                if (err) return res.status(500).json({ error: 'Failed to get like count' });
                                res.json({ liked: false, count: row.count || 0 });
                            }
                        );
                    }
                );
            } else {
                // Like
                db.run(
                    'INSERT INTO likes (message_id, user_identifier) VALUES (?, ?)',
                    [messageId, userIdentifier],
                    (err) => {
                        if (err) {
                            console.error('Error liking:', err);
                            return res.status(500).json({ error: 'Failed to like' });
                        }
                        // Get updated count
                        db.get(
                            'SELECT COUNT(*) as count FROM likes WHERE message_id = ?',
                            [messageId],
                            (err, row) => {
                                if (err) return res.status(500).json({ error: 'Failed to get like count' });
                                res.json({ liked: true, count: row.count || 0 });
                            }
                        );
                    }
                );
            }
        }
    );
});

// ==================== COMMENTS API ====================

// Get all comments for a message
app.get('/api/messages/:messageId/comments', (req, res) => {
    const messageId = req.params.messageId;
    
    // Get all comments (including replies)
    db.all(
        `SELECT * FROM comments 
         WHERE message_id = ? 
         ORDER BY timestamp ASC`,
        [messageId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching comments:', err);
                return res.status(500).json({ error: 'Failed to fetch comments' });
            }
            
            // Organize comments into tree structure
            const comments = rows.filter(c => !c.parent_id);
            const replies = rows.filter(c => c.parent_id);
            
            // Attach replies to their parent comments
            comments.forEach(comment => {
                comment.replies = replies.filter(r => r.parent_id === comment.id);
            });
            
            res.json(comments);
        }
    );
});

// Get comment count for a message (including replies)
app.get('/api/messages/:messageId/comments/count', (req, res) => {
    const messageId = req.params.messageId;
    
    db.get(
        'SELECT COUNT(*) as count FROM comments WHERE message_id = ?',
        [messageId],
        (err, row) => {
            if (err) {
                console.error('Error fetching comment count:', err);
                return res.status(500).json({ error: 'Failed to fetch comment count' });
            }
            res.json({ count: row.count || 0 });
        }
    );
});

// Create a new comment
app.post('/api/messages/:messageId/comments', (req, res) => {
    const messageId = req.params.messageId;
    const { text, author, parentId } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const timestamp = Date.now();
    const authorName = author || 'Anonymous';
    
    db.run(
        'INSERT INTO comments (message_id, text, author, parent_id, timestamp) VALUES (?, ?, ?, ?, ?)',
        [messageId, text, authorName, parentId || null, timestamp],
        function(err) {
            if (err) {
                console.error('Error creating comment:', err);
                return res.status(500).json({ error: 'Failed to create comment' });
            }
            res.json({ 
                id: this.lastID, 
                message_id: parseInt(messageId),
                text, 
                author: authorName, 
                parent_id: parentId || null,
                timestamp 
            });
        }
    );
});

// ==================== CLEANUP ====================

// Clean up expired messages (older than 5 days)
app.post('/api/cleanup', (req, res) => {
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
    
    db.run(
        'DELETE FROM messages WHERE timestamp < ?',
        [fiveDaysAgo],
        function(err) {
            if (err) {
                console.error('Error cleaning up messages:', err);
                return res.status(500).json({ error: 'Failed to cleanup messages' });
            }
            res.json({ deleted: this.changes });
        }
    );
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`\n🚀 GA POD Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`\nOpen http://localhost:${PORT} in your browser\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
