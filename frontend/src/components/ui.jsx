import {useEffect,useId,useRef,useState} from 'react';
import {api} from '../services/api';
import {brl} from './format';

export function useRemote(url){
  const [state,setState]=useState({data:null,loading:true,error:null}),[version,setVersion]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setState({data:null,loading:true,error:null});
    api(url,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data,loading:false,error:null});})
      .catch(error=>{if(!controller.signal.aborted)setState({data:null,loading:false,error});});
    return()=>controller.abort();
  },[url,version]);
  return {...state,reload:()=>setVersion(v=>v+1)};
}
export function Icon({name,size=20}){
  const paths={dashboard:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="11" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="18" width="7" height="3" rx="1"/></>,entries:<><path d="M5 5h14M5 12h14M5 19h9"/><circle cx="19" cy="19" r="2"/></>,categories:<><path d="M3 4h8l10 10-7 7L3 10Z"/><circle cx="7.5" cy="7.5" r="1"/></>,accounts:<><rect x="3" y="6" width="18" height="14" rx="3"/><path d="m4 6 12-4v4M15 13h6"/></>,reports:<><path d="M4 20V10M11 20V4M18 20v-7M2 21h20"/></>,cards:<><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20M6 15h4"/></>,logout:<><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,plus:<path d="M12 5v14M5 12h14"/>,edit:<><path d="m4 16 12-12 4 4L8 20H4Z"/><path d="m13 7 4 4"/></>,trash:<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,check:<path d="m5 12 4 4L19 6"/>};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.dashboard}</svg>;
}
export function Brand(){return <div className="brand"><span className="brand-symbol"><Icon name="reports" size={23}/></span><span>Minhas<span className="brand-light">Contas</span><small>ORGANIZE SEU DINHEIRO</small></span></div>;}
export function Field({label,name,error,hint,children,...props}){
  const id=useId();const described=(error||hint)?id+'-help':undefined;
  return <div className={'field '+(error?'field-error':'')}><label htmlFor={id}>{label}</label>{children?<select id={id} name={name} aria-invalid={!!error} aria-describedby={described} {...props}>{children}</select>:<input id={id} name={name} aria-invalid={!!error} aria-describedby={described} {...props}/>}{error?<span id={described} className="field-message" role="alert">{error}</span>:hint?<small id={described}>{hint}</small>:null}</div>;
}
export function Alert({children,type='error'}){return children?<div role={type==='error'?'alert':'status'} className={'alert '+type}>{children}</div>:null;}
export function Busy(){return <div className="loading" role="status"><span className="spinner"/>Carregando informações…</div>;}
export function Empty({title='Nenhum registro por aqui',children,action}){return <div className="empty"><span className="empty-icon"><Icon name="entries" size={28}/></span><h3>{title}</h3>{children&&<p>{children}</p>}{action}</div>;}
export function Remote({resources,children}){
  const error=resources.find(r=>r.error);
  if(error)return <div className="panel"><Alert>{error.error.message}</Alert><button className="button secondary" onClick={()=>resources.forEach(r=>r.reload())}>Tentar novamente</button></div>;
  if(resources.some(r=>r.loading))return <Busy/>;
  return children;
}
export function PageHeading({eyebrow='VISÃO GERAL',title,description,action}){return <header className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;}
export function Stats({totals}){return <div className="stats">{[['Entradas',totals?.entradas,'income','Disponível no período'],['Saídas',totals?.saidas,'expense','Gastos registrados'],['Saldo do período',totals?.saldo,'balance','Entradas menos saídas']].map(([title,value,style,hint])=><section key={title} className={'stat '+style}><span>{title}</span><strong>{brl(value)}</strong><small>{hint}</small></section>)}</div>;}
export function Modal({title,children,onClose,busy=false}){
  const ref=useRef(null),titleId=useId();
  useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar formulário" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
export function DeleteModal({item,kind,onClose,onConfirm,busy,error}){
  const [scope,setScope]=useState('parcela');
  return <Modal title="Confirmar exclusão" onClose={onClose} busy={busy}><p>Deseja excluir <strong>{item.nome??item.descricao}</strong>?</p>{kind==='entry'&&item.total_parcelas>1&&<fieldset className="scope"><legend>Esta compra é parcelada.</legend><label><input type="radio" name="scope" checked={scope==='parcela'} onChange={()=>setScope('parcela')}/>Somente esta parcela ({item.parcela_atual}/{item.total_parcelas})</label><label><input type="radio" name="scope" checked={scope==='compra'} onChange={()=>setScope('compra')}/>Todas as parcelas da compra</label></fieldset>}<Alert>{error}</Alert><div className="form-actions"><button autoFocus className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button danger" disabled={busy} onClick={()=>onConfirm(scope)}>{busy?'Excluindo…':'Confirmar exclusão'}</button></div></Modal>;
}
export function RowActions({label,onEdit,onDelete}){return <div className="row-actions"><button className="icon-button" aria-label={`Editar ${label}`} title="Editar" onClick={onEdit}><Icon name="edit" size={18}/></button><button className="icon-button destructive" aria-label={`Excluir ${label}`} title="Excluir" onClick={onDelete}><Icon name="trash" size={18}/></button></div>;}
export function MonthField({value,onChange}){return <Field label="Mês de referência" type="month" value={value} required onChange={e=>{if(e.target.value)onChange(e.target.value);}}/>;}
