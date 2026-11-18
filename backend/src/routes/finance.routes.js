import { Router } from 'express';
import { criarAutenticacao } from '../middlewares/autenticar.js';
import { criarCadastroModel } from '../models/cadastros.js';
import { criarLancamentoModel } from '../models/lancamentos.js';
import { categoryBody,sourceBody,entryBody,entryFilters,positiveId,invalid } from '../config/finance-validation.js';

export function criarRotasFinanceiras({db,jwtSecret}) {
  const router=Router();
  router.use(criarAutenticacao(jwtSecret));
  for(const [path,kind,validate] of [['categorias','categorias',categoryBody],['fontes-destinos','fontes',sourceBody]]) {
    const model=criarCadastroModel(kind,db);
    router.get(`/${path}`,async(req,res)=>res.json({dados:await model.listar(req.usuarioId)}));
    router.get(`/${path}/:id`,async(req,res)=>res.json({dado:await model.obter(req.usuarioId,positiveId(req.params.id))}));
    router.post(`/${path}`,async(req,res)=>res.status(201).json({dado:await model.criar(req.usuarioId,validate(req.body))}));
    router.put(`/${path}/:id`,async(req,res)=>res.json({dado:await model.editar(req.usuarioId,positiveId(req.params.id),validate(req.body))}));
    router.delete(`/${path}/:id`,async(req,res)=>{await model.excluir(req.usuarioId,positiveId(req.params.id));res.status(204).end();});
  }
  const entries=criarLancamentoModel(db);
  router.get('/lancamentos',async(req,res)=>res.json(await entries.listar(req.usuarioId,entryFilters(req.query))));
  router.get('/lancamentos/:id',async(req,res)=>res.json({dado:await entries.obter(req.usuarioId,positiveId(req.params.id))}));
  router.post('/lancamentos',async(req,res)=>res.status(201).json({dados:await entries.criar(req.usuarioId,entryBody(req.body))}));
  router.put('/lancamentos/:id',async(req,res)=>res.json({dado:await entries.editar(req.usuarioId,positiveId(req.params.id),entryBody(req.body,{updating:true}))}));
  router.delete('/lancamentos/:id',async(req,res)=>{
    const scope=req.query.escopo ?? 'parcela';
    if(!['parcela','compra'].includes(scope)) invalid('escopo','Escolha parcela ou compra.');
    await entries.excluir(req.usuarioId,positiveId(req.params.id),scope);res.status(204).end();
  });
  return router;
}
