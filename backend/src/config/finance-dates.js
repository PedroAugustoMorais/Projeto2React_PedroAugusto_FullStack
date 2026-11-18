import { dateISO } from './finance-validation.js';

export const dayMs=86400000;
export const iso=(date)=>date.toISOString().split('T')[0];
export function safeDate(year,month,day){
  const first=new Date(Date.UTC(year,month,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(day,last)));
}
export function todayISO(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function previousPeriod(start,end){
  const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');
  const last=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+1,0));
  if(a.getUTCDate()===1 && iso(last)===end){
    return {inicio:iso(safeDate(a.getUTCFullYear(),a.getUTCMonth()-1,1)),fim:iso(new Date(a.getTime()-dayMs)),regra:'mes_anterior'};
  }
  const days=(b-a)/dayMs+1;
  return {inicio:iso(new Date(a.getTime()-days*dayMs)),fim:iso(new Date(a.getTime()-dayMs)),regra:'mesma_quantidade_de_dias'};
}

export function invoiceFromClosing(year,month,card){
  const fechamento=safeDate(year,month,card.dia_fechamento);
  const vencimento=safeDate(year,month+(card.dia_vencimento>card.dia_fechamento?0:1),card.dia_vencimento);
  return {referencia:iso(vencimento).slice(0,7),fechamento:iso(fechamento),vencimento:iso(vencimento)};
}
export function calcularFatura(purchaseDate,card,installment=1){
  dateISO(purchaseDate);
  const [year,month,day]=purchaseDate.split('-').map(Number);
  const closing=safeDate(year,month-1,card.dia_fechamento).getUTCDate();
  const offset=day<closing?month-1:month;
  return invoiceFromClosing(year,offset+installment-1,card);
}
export function nextInvoices(referenceDate,card){
  const [year,month,day]=referenceDate.split('-').map(Number);
  const closing=safeDate(year,month-1,card.dia_fechamento).getUTCDate();
  const firstMonth=day<closing?month-1:month;
  return Array.from({length:4},(_,index)=>invoiceFromClosing(year,firstMonth+index,card));
}
