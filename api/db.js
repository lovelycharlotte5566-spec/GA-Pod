// Database connection module
// This file will use the appropriate database based on environment

// For Turso (SQLite cloud) - Recommended for Vercel
if (process.env.TURSO_DATABASE_URL) {
    module.exports = require('./db-turso');
}
// For PostgreSQL (Supabase, Neon, etc.)
else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres')) {
    module.exports = require('./db-postgres');
}
// For MySQL (PlanetScale, etc.)
else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('mysql')) {
    module.exports = require('./db-mysql');
}
// Default: Try Turso
else {
    module.exports = require('./db-turso');
}
