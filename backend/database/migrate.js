import { migrate } from '../src/models/setup.js';
import { pool } from '../src/config/database.js';
try { await migrate(); }
catch (error) { console.error('Falha ao criar estrutura:', error.message); process.exitCode = 1; }
finally { await pool.end(); }
