// Valores do PostgreSQL chegam como strings NUMERIC; somas permanecem exatas.
export function bigCents(value){
  const raw=String(value),negative=raw.startsWith('-');
  const [whole,decimal='']=raw.replace(/^-/, '').split('.');
  const amount=BigInt(whole)*100n+BigInt(decimal.padEnd(2,'0'));
  return negative?-amount:amount;
}
export function decimal(value){
  const negative=value<0n;
  const n=negative?-value:value;
  return `${negative?'-':''}${n/100n}.${String(n%100n).padStart(2,'0')}`;
}
export function percentage(part,total){
  if(total===0n)return 0;
  return Number((part*10000n+total/2n)/total)/100;
}
export function change(current,previous){
  if(previous===0n)return current===0n?0:null;
  const delta=current-previous,absolute=delta<0n?-delta:delta;
  return (delta<0n?-1:1)*percentage(absolute,previous);
}
