import { checkDatabase } from '../src/models/setup.js';
import { pool } from '../src/config/database.js';
try { await checkDatabase(); }
catch (error) { console.error('Falha ao verificar banco:', error.message); process.exitCode = 1; }
finally { await pool.end(); }
