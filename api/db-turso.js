// Database connection for Turso (SQLite cloud)
// Install: npm install @libsql/client

const { createClient } = require('@libsql/client');

let db = null;

async function getDbConnection() {
    if (db) {
        return db;
    }
    
    // Get credentials from environment variables
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
        throw new Error('Turso credentials not found. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
    }
    
    db = createClient({
        url: url,
        authToken: authToken
    });
    
    // Create tables if they don't exist
    await initializeDatabase(db);
    
    return db;
}

async function initializeDatabase(db) {
    try {
        // Enable foreign keys
        await db.execute('PRAGMA foreign_keys = ON;');
        
        // Create messages table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'Anonymous',
                category TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create likes table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_identifier TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(message_id, user_identifier),
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        `);
        
        // Create comments table
        await db.execute(`
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
        `);
        
        // Create indexes (ignore errors if they already exist)
        try {
            await db.execute('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_likes_message_id ON likes(message_id)');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_comments_message_id ON comments(message_id)');
            await db.execute('CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)');
        } catch (e) {
            // Indexes might already exist, that's okay
            console.log('Index creation note:', e.message);
        }
        
        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        // Don't throw - tables might already exist
    }
}

// Wrapper to make Turso client compatible with our API
function wrapTursoClient(client) {
    return {
        execute: async (query, params = []) => {
            try {
                console.log('🔍 Executing query:', query.substring(0, 50) + '...');
                const result = await client.execute(query, params);
                
                // Check if it's a SELECT query
                const isSelect = query.trim().toUpperCase().startsWith('SELECT');
                
                if (isSelect) {
                    // For SELECT queries, return rows
                    const rows = result.rows || [];
                    console.log(`✅ Query returned ${rows.length} rows`);
                    return {
                        rows: rows,
                        changes: 0
                    };
                } else {
                    // For INSERT/UPDATE/DELETE, return changes info
                    const changes = result.rowsAffected || 0;
                    const lastId = result.lastInsertRowid || 0;
                    console.log(`✅ Query affected ${changes} rows, last ID: ${lastId}`);
                    return {
                        rows: [],
                        changes: changes,
                        lastInsertRowid: lastId
                    };
                }
            } catch (error) {
                console.error('❌ Query error:', error);
                throw error;
            }
        }
    };
}

module.exports = { 
    getDbConnection: async () => {
        const client = await getDbConnection();
        return wrapTursoClient(client);
    }
};
