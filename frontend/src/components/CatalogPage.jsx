import {useState} from 'react';
import {useOutletContext} from 'react-router-dom';
import {api} from '../services/api';
import {brl,decimalInput,inputMoney,moneyValid,sourceType} from './format';
import {Alert,DeleteModal,Empty,Field,Icon,Modal,PageHeading,Remote,RowActions,useRemote} from './ui';

function CatalogForm({kind,item,onClose,onSaved}){
  const sources=kind==='sources';
  const [form,setForm]=useState(item?{...item,limite:inputMoney(item.limite??'')}:{nome:'',tipo:sources?'conta':'saida',dia_fechamento:'',dia_vencimento:'',limite:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fields,setFields]=useState({});
  const change=e=>{const {name,value}=e.target;setForm(f=>({...f,[name]:value}));setFields(f=>({...f,[name]:undefined}));};
  async function submit(e){
    e.preventDefault();const errors={};setError('');
    if(!form.nome.trim()||form.nome.trim().length>60)errors.nome='Informe um nome de até 60 caracteres.';
    const card=sources&&form.tipo==='cartao_credito';
    if(card){for(const key of ['dia_fechamento','dia_vencimento'])if(!/^\d{1,2}$/.test(String(form[key]))||Number(form[key])<1||Number(form[key])>31)errors[key]='Escolha um dia de 1 a 31.';if(!moneyValid(form.limite))errors.limite='Informe um limite positivo.';}
    setFields(errors);if(Object.keys(errors).length)return;
    const body={nome:form.nome,tipo:form.tipo,...(card?{dia_fechamento:Number(form.dia_fechamento),dia_vencimento:Number(form.dia_vencimento),limite:decimalInput(form.limite)}:{})};
    setBusy(true);
    try{await api((sources?'/fontes-destinos':'/categorias')+(item?'/'+item.id:''),{method:item?'PUT':'POST',body});onSaved(item?'Registro atualizado.':'Registro criado.');}
    catch(error){setError(error.message);setFields(error.fields??{});}finally{setBusy(false);}
  }
  return <Modal title={`${item?'Editar':'Adicionar'} ${sources?'fonte ou destino':'categoria'}`} onClose={onClose} busy={busy}><form onSubmit={submit} noValidate><Alert>{error}</Alert><Field label="Nome" name="nome" autoFocus maxLength={60} value={form.nome} onChange={change} error={fields.nome}/><Field label="Tipo" name="tipo" value={form.tipo} onChange={change} error={fields.tipo}>{sources?<><option value="conta">Conta</option><option value="renda">Fonte de renda</option><option value="cartao_credito">Cartão de crédito</option></>:<><option value="saida">Saída</option><option value="entrada">Entrada</option></>}</Field>{sources&&form.tipo==='cartao_credito'&&<><div className="form-grid"><Field label="Dia de fechamento" name="dia_fechamento" type="number" min="1" max="31" value={form.dia_fechamento??''} onChange={change} error={fields.dia_fechamento}/><Field label="Dia de vencimento" name="dia_vencimento" type="number" min="1" max="31" value={form.dia_vencimento??''} onChange={change} error={fields.dia_vencimento}/></div><Field label="Limite do cartão (R$)" name="limite" inputMode="decimal" placeholder="1.000,00" value={form.limite} onChange={change} error={fields.limite}/><p className="form-hint">Compras no dia do fechamento entram na próxima fatura.</p></>}<div className="form-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy?'Salvando…':'Salvar'}</button></div></form></Modal>;
}
export default function CatalogPage({kind}){
  const sources=kind==='sources',path=sources?'/fontes-destinos':'/categorias';
  const resource=useRemote(path),{notify}=useOutletContext();
  const [editing,setEditing]=useState(null),[removing,setRemoving]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const saved=message=>{setEditing(null);resource.reload();notify(message);};
  async function remove(){setBusy(true);setError('');try{await api(path+'/'+removing.id,{method:'DELETE'});setRemoving(null);resource.reload();notify('Registro excluído.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <><PageHeading eyebrow="ORGANIZAÇÃO" title={sources?'Fontes e destinos':'Categorias'} description={sources?'Organize de onde seu dinheiro vem e para onde ele vai.':'Classifique suas movimentações para entender seus hábitos.'} action={<button className="button primary" onClick={()=>setEditing({new:true})}><Icon name="plus"/>{sources?'Adicionar fonte ou destino':'Adicionar categoria'}</button>}/><Remote resources={[resource]}><section className="panel"><div className="section-heading"><h2>{sources?'Suas contas, rendas e cartões':'Suas categorias'}</h2><span className="count-label">{resource.data?.dados.length??0} registros</span></div>{!resource.data?.dados.length?<Empty title={sources?'Nenhuma fonte ou destino':'Nenhuma categoria cadastrada'}>Use o botão acima para adicionar seu primeiro registro.</Empty>:<div className="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th>{sources&&<><th>Fechamento / vencimento</th><th className="numeric">Limite</th></>}<th><span className="sr-only">Ações</span></th></tr></thead><tbody>{resource.data.dados.map(row=><tr key={row.id}><td><strong>{row.nome}</strong></td><td><span className={'tag '+(row.tipo==='entrada'?'income':row.tipo==='saida'?'expense':'neutral')}>{sources?sourceType(row.tipo):row.tipo==='entrada'?'Entrada':'Saída'}</span></td>{sources&&<><td>{row.tipo==='cartao_credito'?`Dia ${row.dia_fechamento} / dia ${row.dia_vencimento}`:'—'}</td><td className="numeric">{row.tipo==='cartao_credito'?brl(row.limite):'—'}</td></>}<td><RowActions label={row.nome} onEdit={()=>setEditing(row)} onDelete={()=>{setError('');setRemoving(row);}}/></td></tr>)}</tbody></table></div>}<p className="panel-note">Registros vinculados a lançamentos não podem ser excluídos.</p></section></Remote>{editing&&<CatalogForm kind={kind} item={editing.new?null:editing} onClose={()=>setEditing(null)} onSaved={saved}/>} {removing&&<DeleteModal item={removing} onClose={()=>setRemoving(null)} onConfirm={remove} busy={busy} error={error}/>}</>;
}
