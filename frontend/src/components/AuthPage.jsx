import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {Alert,Brand,Field,Icon} from './ui';
import {cpfMask,cpfValid} from './format';

export default function AuthPage({register=false}){
  const {login,cadastrar,erroSessao}=useAuth(),navigate=useNavigate();
  const [form,setForm]=useState({nome:'',email:'',cpf:'',senha:'',confirmacaoSenha:''}),[errors,setErrors]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState('');
  const change=e=>{const {name,value}=e.target;setForm(f=>({...f,[name]:name==='cpf'?cpfMask(value):value}));setErrors(f=>({...f,[name]:undefined}));};
  async function submit(event){
    event.preventDefault();const fields={};setError('');setSuccess('');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))fields.email='Informe um e-mail válido.';
    if(!form.senha)fields.senha='Informe sua senha.';
    if(register){
      if(form.nome.trim().length<3)fields.nome='Informe seu nome com pelo menos 3 caracteres.';
      if(!cpfValid(form.cpf))fields.cpf='Informe um CPF válido.';
      if(form.senha.length<8||!/[A-Za-z]/.test(form.senha)||!/[0-9]/.test(form.senha)||new TextEncoder().encode(form.senha).length>72)fields.senha='Use ao menos 8 caracteres com letras e números (até 72 bytes).';
      if(!form.confirmacaoSenha||form.confirmacaoSenha!==form.senha)fields.confirmacaoSenha='As senhas devem ser iguais.';
    }
    setErrors(fields);if(Object.keys(fields).length)return;
    setBusy(true);
    try{
      if(register){await cadastrar(form);setSuccess('Conta criada! Você já pode entrar com seu e-mail e senha.');setForm({nome:'',email:'',cpf:'',senha:'',confirmacaoSenha:''});}
      else{await login(form.email,form.senha);navigate('/',{replace:true});}
    }catch(e){setError(e.message);setErrors(e.fields??{});}finally{setBusy(false);}
  }
  async function demoLogin(){
    setBusy(true);setError('');setErrors({});
    try{await login('ana@example.com','Demo12345');navigate('/',{replace:true});}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="auth-layout"><aside className="auth-story"><Brand/><div className="auth-message"><span className="eyebrow">MENOS DÚVIDAS. MAIS CONTROLE.</span><h1>Seu dinheiro<br/>merece clareza.</h1><p>Entenda seus gastos, organize suas contas e acompanhe o que vem pela frente.</p><div className="auth-illustration" aria-hidden="true"><div className="illustration-label">Uma visão mais tranquila</div><div className="illustration-bars">{[38,62,45,82,57,95,72].map((n,i)=><span key={i} style={{height:n+'%'}}/>)}</div><div className="illustration-footer"><span>Organização</span><span>Planejamento</span><span>Clareza</span></div></div><ul className="auth-benefits"><li><Icon name="check"/>Entradas e despesas em um só lugar</li><li><Icon name="check"/>Próximas faturas sem surpresas</li><li><Icon name="check"/>Relatórios para entender seus hábitos</li></ul></div><small>Projeto acadêmico · Programação Web Fullstack</small></aside><main className="auth-main"><div className="auth-card"><span className="eyebrow">BEM-VINDO AO MINHASCONTAS</span><h2>{register?'Comece sua organização':'Bom ter você por aqui.'}</h2><p>{register?'Crie sua conta para organizar suas finanças.':'Entre para acompanhar suas finanças.'}</p><Alert>{error||(!register?erroSessao:'')}</Alert><Alert type="success">{success}</Alert>{success?<Link className="button primary full" to="/login">Ir para o login</Link>:<form onSubmit={submit} noValidate>{register&&<><Field label="Nome completo" name="nome" autoComplete="name" maxLength={120} value={form.nome} onChange={change} error={errors.nome}/><Field label="CPF" name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={change} error={errors.cpf}/></>}<Field label="E-mail" name="email" type="email" autoComplete="email" maxLength={160} placeholder="voce@exemplo.com" value={form.email} onChange={change} error={errors.email}/><Field label="Senha" name="senha" type="password" autoComplete={register?'new-password':'current-password'} value={form.senha} onChange={change} error={errors.senha} hint={register?'Pelo menos 8 caracteres, com letras e números.':undefined}/>{register&&<Field label="Confirme sua senha" name="confirmacaoSenha" type="password" autoComplete="new-password" value={form.confirmacaoSenha} onChange={change} error={errors.confirmacaoSenha}/>}<button className="button primary full" disabled={busy}>{busy?'Aguarde…':register?'Criar minha conta':'Entrar na minha conta'}</button></form>}<p className="auth-switch">{register?'Já tem uma conta?':'Ainda não tem conta?'} <Link to={register?'/login':'/cadastro'}>{register?'Entrar':'Criar conta'}</Link></p>{!register&&<div className="demo-note"><strong>Conhecendo o projeto?</strong><span>Conta de demonstração: ana@example.com</span><span>Senha: Demo12345</span><button type="button" className="button secondary" disabled={busy} onClick={demoLogin}>Usar conta de demonstração</button></div>}</div><p className="auth-footer">MinhasContas · Controle financeiro pessoal</p></main></div>;
}
