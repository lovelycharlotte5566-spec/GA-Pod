// Database connection for Turso (SQLite cloud)
const { createClient } = require('@libsql/client');

let db = null;

// Wrapper to make Turso client compatible with our API
function wrapTursoClient(client) {
    return {
        execute: async (query, params = []) => {
            try {
                console.log('🔍 Executing query:', query.substring(0, 50) + '...');
                const result = await client.execute(query, params);
                
                const isSelect = query.trim().toUpperCase().startsWith('SELECT');
                
                if (isSelect) {
                    const rows = result.rows || [];
                    console.log(`✅ Query returned ${rows.length} rows`);
                    return {
                        rows: rows,
                        changes: 0
                    };
                } else {
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

async function initializeDatabase(client) {
    try {
        console.log('🔧 Initializing database tables...');
        
        await client.execute('PRAGMA foreign_keys = ON;');
        console.log('✅ Foreign keys enabled');
        
        await client.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'Anonymous',
                category TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Messages table created/verified');
        
        await client.execute(`
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_identifier TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(message_id, user_identifier),
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Likes table created/verified');
        
        await client.execute(`
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
        console.log('✅ Comments table created/verified');
        
        try {
            await client.execute('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)');
            await client.execute('CREATE INDEX IF NOT EXISTS idx_likes_message_id ON likes(message_id)');
            await client.execute('CREATE INDEX IF NOT EXISTS idx_comments_message_id ON comments(message_id)');
            await client.execute('CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)');
            console.log('✅ Indexes created/verified');
        } catch (e) {
            console.log('ℹ️ Index creation note:', e.message);
        }
        
        console.log('✅ Database tables initialized successfully');
        
        const checkResult = await client.execute('SELECT COUNT(*) as count FROM messages');
        const count = checkResult.rows[0]?.count || (typeof checkResult.rows[0] === 'object' ? Object.values(checkResult.rows[0])[0] : 0);
        console.log('📊 Current message count:', Number(count) || 0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        console.error('Error stack:', error.stack);
    }
}

async function getDbConnection() {
    if (db) {
        console.log('♻️ Reusing existing database connection');
        return wrapTursoClient(db);
    }
    
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    console.log('🔌 Connecting to database...');
    console.log('📍 URL:', url ? url.substring(0, 30) + '...' : 'NOT SET');
    console.log('🔑 Token:', authToken ? 'SET (' + authToken.substring(0, 10) + '...)' : 'NOT SET');
    
    if (!url || !authToken) {
        const error = 'Turso credentials not found. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables in Vercel.';
        console.error('❌', error);
        throw new Error(error);
    }
    
    try {
        db = createClient({
            url: url,
            authToken: authToken
        });
        
        console.log('✅ Database client created');
        await initializeDatabase(db);
        console.log('✅ Database connection established and initialized');
        return wrapTursoClient(db);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

module.exports = { 
    getDbConnection: getDbConnection
};
