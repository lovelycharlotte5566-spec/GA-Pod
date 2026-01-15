// Test endpoint to verify API is working
const { getDbConnection } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const db = await getDbConnection();
        
        // Test query
        const result = await db.execute('SELECT COUNT(*) as count FROM messages');
        const count = result.rows[0]?.count || 0;
        
        return res.status(200).json({
            status: 'OK',
            message: 'API is working!',
            database: 'Connected',
            messageCount: count,
            env: {
                hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
                hasTursoToken: !!process.env.TURSO_AUTH_TOKEN
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: 'ERROR',
            message: error.message,
            stack: error.stack
        });
    }
};
