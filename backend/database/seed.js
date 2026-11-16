import { seed } from '../src/models/seed.js';
import { pool } from '../src/config/database.js';
try { await seed(); }
catch (error) { console.error('Falha na carga inicial:', error.message); process.exitCode = 1; }
finally { await pool.end(); }
