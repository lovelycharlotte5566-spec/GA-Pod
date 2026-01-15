// Test endpoint to verify API is working
// Access at: /api/test
const { getDbConnection } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    try {
        console.log('🧪 Test endpoint called');
        
        // Check environment variables
        const hasUrl = !!process.env.TURSO_DATABASE_URL;
        const hasToken = !!process.env.TURSO_AUTH_TOKEN;
        
        if (!hasUrl || !hasToken) {
            return res.status(500).json({
                status: 'ERROR',
                message: 'Database credentials not configured',
                env: {
                    hasTursoUrl: hasUrl,
                    hasTursoToken: hasToken
                }
            });
        }
        
        console.log('✅ Environment variables check passed');
        
        // Test database connection
        const db = await getDbConnection();
        console.log('✅ Database connection established');
        
        // Test query
        const result = await db.execute('SELECT COUNT(*) as count FROM messages');
        const count = result.rows[0]?.count || (typeof result.rows[0] === 'object' ? Object.values(result.rows[0])[0] : 0);
        
        console.log('✅ Test query executed, message count:', count);
        
        return res.status(200).json({
            status: 'OK',
            message: 'API is working!',
            database: 'Connected',
            messageCount: Number(count) || 0,
            env: {
                hasTursoUrl: hasUrl,
                hasTursoToken: hasToken,
                urlPreview: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.substring(0, 30) + '...' : 'NOT SET'
            }
        });
    } catch (error) {
        console.error('❌ Test endpoint error:', error);
        return res.status(500).json({
            status: 'ERROR',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
