import {useState} from 'react';
import {Navigate,NavLink,Outlet,Route,Routes} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {Alert,Brand,Busy,Icon} from './ui';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import CatalogPage from './CatalogPage';
import Entries from './Entries';
import Reports from './Reports';
import Invoices from './Invoices';
import FinancialHealth from './FinancialHealth';

const navigation=[['/','dashboard','Visão geral'],['/lancamentos','entries','Lançamentos'],['/categorias','categories','Categorias'],['/fontes-destinos','accounts','Fontes e destinos'],['/relatorios','reports','Relatórios'],['/faturas','cards','Faturas'],['/saude-financeira','reports','Saúde financeira']];
function Protected(){const {usuario,iniciando}=useAuth();if(iniciando)return <Busy/>;return usuario?<Shell/>:<Navigate to="/login" replace/>;}
function Public({register}){const {usuario,iniciando}=useAuth();if(iniciando)return <Busy/>;return usuario?<Navigate to="/" replace/>:<AuthPage key={register?'register':'login'} register={register}/>;}
function Shell(){
  const {usuario,logout}=useAuth(),[notice,setNotice]=useState('');
  return <div className="app-layout"><a href="#conteudo" className="skip-link">Ir para o conteúdo</a><aside className="sidebar"><Brand/><span className="nav-label">SEU ESPAÇO FINANCEIRO</span><nav aria-label="Menu principal">{navigation.map(([to,icon,label])=><NavLink key={to} to={to} end={to==='/'}><Icon name={icon}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><div className="profile"><span className="avatar">{usuario.nome[0].toUpperCase()}</span><span><strong>{usuario.nome.split(' ')[0]}</strong><small>Sua conta pessoal</small></span></div><button className="logout" onClick={logout}><Icon name="logout"/>Sair da conta</button></div></aside><div className="workspace"><header className="topbar"><span>Organizar hoje. <strong>Respirar melhor amanhã.</strong></span><span className="account-label">Olá, {usuario.nome.split(' ')[0]}</span></header><main id="conteudo" className="main-content">{notice&&<div className="notice"><Alert type="success">{notice}</Alert><button className="icon-button" aria-label="Fechar aviso" onClick={()=>setNotice('')}><Icon name="close"/></button></div>}<Outlet context={{notify:setNotice}}/></main><footer className="app-footer">MinhasContas · Projeto acadêmico · Dados pessoais separados por usuário</footer></div></div>;
}
export default function App(){return <Routes><Route path="/login" element={<Public/>}/><Route path="/cadastro" element={<Public register/>}/><Route element={<Protected/>}><Route index element={<Dashboard/>}/><Route path="lancamentos" element={<Entries/>}/><Route path="categorias" element={<CatalogPage key="categories" kind="categories"/>}/><Route path="fontes-destinos" element={<CatalogPage key="sources" kind="sources"/>}/><Route path="relatorios" element={<Reports/>}/><Route path="faturas" element={<Invoices/>}/><Route path="saude-financeira" element={<FinancialHealth/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>;}
