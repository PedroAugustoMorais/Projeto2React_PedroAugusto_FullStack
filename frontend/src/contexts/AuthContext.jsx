import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {api,readToken,storeToken} from '../services/api';

const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [usuario,setUsuario]=useState(null),[token,setToken]=useState(readToken),[iniciando,setIniciando]=useState(true),[erroSessao,setErroSessao]=useState('');
  const logout=useCallback(()=>{try{storeToken(null);}catch{}setToken(null);setUsuario(null);setErroSessao('');},[]);
  useEffect(()=>{
    if(!token)return;
    let deadline;
    try{const payload=JSON.parse(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));deadline=Number.isFinite(payload.exp)?payload.exp*1000:0;}
    catch{deadline=0;}
    const timer=setTimeout(()=>{
      if(readToken()!==token)return;
      try{storeToken(null);}catch{}
      window.dispatchEvent(new CustomEvent('conta-clara:session-ended'));
    },Math.max(0,Math.min(deadline-Date.now(),2147483647)));
    return()=>clearTimeout(timer);
  },[token]);
  useEffect(()=>{
    const controller=new AbortController();
    const ended=()=>{setToken(null);setUsuario(null);setErroSessao('Sua sessão terminou. Entre novamente.');};
    window.addEventListener('conta-clara:session-ended',ended);
    const existing=readToken();
    if(!existing)setIniciando(false);
    else api('/auth/me',{signal:controller.signal}).then(data=>{setUsuario(data.usuario);setToken(existing);})
      .catch(error=>{if(!controller.signal.aborted){if(error.status!==401)setErroSessao(error.message);setToken(null);setUsuario(null);}})
      .finally(()=>{if(!controller.signal.aborted)setIniciando(false);});
    return()=>{controller.abort();window.removeEventListener('conta-clara:session-ended',ended);};
  },[]);
  async function login(email,senha){
    const data=await api('/auth/login',{method:'POST',body:{email,senha},authenticated:false});
    storeToken(data.token);setToken(data.token);setUsuario(data.usuario);setErroSessao('');
  }
  async function cadastrar(body){return api('/auth/cadastro',{method:'POST',body,authenticated:false});}
  return <AuthContext.Provider value={{usuario,token,iniciando,erroSessao,login,logout,cadastrar}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth exige AuthProvider.');return context;}
