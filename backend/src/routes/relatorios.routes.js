import {Router} from 'express';
import {criarAutenticacao} from '../middlewares/autenticar.js';
import {entryFilters,dateISO,positiveId} from '../config/finance-validation.js';
import {todayISO} from '../config/finance-dates.js';
import {criarRelatorioModel} from '../models/relatorios.js';
import {criarFaturaModel} from '../models/faturas.js';
import {criarSaudeModel} from '../models/saude-financeira.js';

export function criarRotasRelatorios({db,jwtSecret}){
  const router=Router();router.use(criarAutenticacao(jwtSecret));
  const reports=criarRelatorioModel(db),invoices=criarFaturaModel(db);
  const period=(query)=>entryFilters({inicio:query.inicio,fim:query.fim});
  router.get('/relatorios/categorias',async(req,res)=>res.json(await reports.categorias(req.usuarioId,period(req.query))));
  router.get('/relatorios/fontes-destinos',async(req,res)=>res.json(await reports.fontes(req.usuarioId,period(req.query))));
  router.get('/faturas',async(req,res)=>res.json(await invoices.listar(req.usuarioId,{
    referenceDate:dateISO(req.query.data_referencia??todayISO(),'data_referencia'),
    ...(req.query.cartao_id!==undefined?{cardId:positiveId(req.query.cartao_id,'cartao_id')}:{})
  })));
  const health=criarSaudeModel(db);
  router.get('/saude-financeira',async(req,res)=>{
    const month=req.query.mes??todayISO().slice(0,7);
    dateISO(typeof month==='string'?month+'-01':month,'mes');
    res.json(await health.analisar(req.usuarioId,month));
  });
  return router;
}
