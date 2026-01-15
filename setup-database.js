const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'ga-pod.db');

// Delete existing database if it exists (for fresh setup)
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Existing database deleted.');
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

// Create tables
db.serialize(() => {
    // Messages table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'Anonymous',
            category TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating messages table:', err.message);
        } else {
            console.log('Messages table created.');
        }
    });

    // Likes table
    db.run(`
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            user_identifier TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(message_id, user_identifier),
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating likes table:', err.message);
        } else {
            console.log('Likes table created.');
        }
    });

    // Comments table
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'Anonymous',
            parent_id INTEGER,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating comments table:', err.message);
        } else {
            console.log('Comments table created.');
        }
    });

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_likes_message_id ON likes(message_id)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_comments_message_id ON comments(message_id)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)`, (err) => {
        if (err) console.error('Error creating index:', err.message);
    });

    console.log('\n✅ Database setup complete!');
    console.log('Database file: ga-pod.db');
    console.log('\nYou can now open this database in TablePlus:');
    console.log('1. Open TablePlus');
    console.log('2. Click "Create a new connection"');
    console.log('3. Select "SQLite"');
    console.log('4. Browse to: ' + dbPath);
    console.log('5. Click "Connect"\n');
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database connection closed.');
    }
});
