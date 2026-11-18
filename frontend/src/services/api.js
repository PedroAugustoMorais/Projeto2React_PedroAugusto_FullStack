const key='conta-clara-session-v1';
export class ApiError extends Error{
  constructor(message,status=0,fields={}){super(message);this.status=status;this.fields=fields;}
}
export function readToken(){try{return sessionStorage.getItem(key)||null;}catch{return null;}}
export function storeToken(token){
  try{token?sessionStorage.setItem(key,token):sessionStorage.removeItem(key);}
  catch{throw new ApiError('O navegador não permitiu salvar a sessão. Habilite o armazenamento deste site.');}
}
export async function api(path,{method='GET',body,signal,authenticated=true}={}){
  const token=authenticated?readToken():null;
  let response;
  try{
    response=await fetch('/api'+path,{method,signal,cache:'no-store',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
  }catch(error){if(error.name==='AbortError')throw error;throw new ApiError('Não foi possível conectar à API. Confira se o backend está em execução.');}
  let data;
  if(response.status!==204){try{data=await response.json();}catch(error){if(error.name==='AbortError')throw error;throw new ApiError('A API devolveu uma resposta inesperada. Confira o servidor.',response.status);}}
  if(!response.ok){
    if(response.status===401&&authenticated&&readToken()===token){
      try{storeToken(null);}catch{}
      window.dispatchEvent(new CustomEvent('conta-clara:session-ended'));
    }
    throw new ApiError(data?.erro??'Não foi possível concluir a operação.',response.status,data?.campos??{});
  }
  return data;
}
