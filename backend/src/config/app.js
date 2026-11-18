import express from 'express';
import cors from 'cors';
import { validateSecret } from './auth.js';
import { criarRotasAuth } from '../routes/auth.routes.js';
import { criarRotasFinanceiras } from '../routes/finance.routes.js';
import { criarRotasRelatorios } from '../routes/relatorios.routes.js';
import { tratarErros } from '../middlewares/erros.js';

// Separado de listen para permitir testes HTTP com portas temporárias.
export function createApp({ db, jwtSecret, frontendOrigin = 'http://localhost:5173', loginLimit, registrationLimit }) {
  validateSecret(jwtSecret);
  if (!/^https?:\/\/[^/]+$/.test(frontendOrigin)) throw new Error('FRONTEND_ORIGIN deve conter somente protocolo, host e porta.');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && req.headers.origin !== frontendOrigin) {
      return res.status(403).json({ erro: 'Origem não autorizada.' });
    }
    next();
  });
  app.use(cors({ origin: frontendOrigin, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
  app.use(express.json({ limit: '16kb', strict: true }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', criarRotasAuth({ db, jwtSecret, loginLimit, registrationLimit }));
  app.use('/api', criarRotasFinanceiras({ db, jwtSecret }));
  app.use('/api', criarRotasRelatorios({ db, jwtSecret }));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use(tratarErros);
  return app;
}
