export const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value??0));
export const dateBR=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'—';
export const monthBR=value=>value?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z')):'—';
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const currentMonth=()=>today().slice(0,7);
export function monthPeriod(month){const [y,m]=month.split('-').map(Number);return {inicio:`${month}-01`,fim:`${month}-${new Date(y,m,0).getDate()}`};}
export function query(values){return new URLSearchParams(Object.entries(values).filter(([,v])=>v!==''&&v!==undefined&&v!==null)).toString();}
export function decimalInput(value){
  const raw=String(value??'').trim();
  const n=raw.includes(',')?raw.replaceAll('.','').replace(',','.'):raw;
  return n;
}
export const inputMoney=value=>String(value??'').replace('.',',');
export function moneyValid(value){const n=decimalInput(value);return /^\d{1,10}(\.\d{1,2})?$/.test(n)&&Number(n)>0&&Number(n)<=9999999999.99;}
export function cpfMask(value){const s=value.replace(/\D/g,'').slice(0,11);return s.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');}
export function cpfValid(value){
  const n=value.replace(/\D/g,'');if(n.length!==11||/^(\d)\1{10}$/.test(n))return false;
  const digit=size=>{let s=0;for(let i=0;i<size;i++)s+=Number(n[i])*(size+1-i);const r=s*10%11;return r===10?0:r;};
  return digit(9)===Number(n[9])&&digit(10)===Number(n[10]);
}
export const sourceType=value=>({conta:'Conta',renda:'Fonte de renda',cartao_credito:'Cartão de crédito'}[value]??value);
