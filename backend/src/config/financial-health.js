import {bigCents,decimal,percentage} from './decimal.js';
import {calcularFatura,iso,safeDate} from './finance-dates.js';

const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)/100);
const monthAt=(year,month)=>iso(safeDate(year,month,1)).slice(0,7);
const signedPercent=(part,total)=>total===0n?null:(part<0n?-1:1)*percentage(part<0n?-part:part,total);
const max=(a,b)=>a>b?a:b;
const average=(value,count)=>count?(value+BigInt(count)/2n)/BigInt(count):0n;

// Função pura: recebe apenas os lançamentos do usuário e retorna JSON serializável.
export function calculateFinancialHealth(entries,month){
  const [year,m]=month.split('-').map(Number);
  const previous=Array.from({length:3},(_,i)=>monthAt(year,m-4+i));
  const next=Array.from({length:3},(_,i)=>monthAt(year,m+i));
  const buckets=new Map();
  const bucket=key=>{
    if(!buckets.has(key))buckets.set(key,{income:0n,regular:0n,installments:0n,cards:0n,count:0});
    return buckets.get(key);
  };
  let futureInstallments=0n,futureCount=0,lastInstallment=null;
  for(const entry of entries){
    const card=entry.fonte_tipo==='cartao_credito';
    const effective=card?calcularFatura(entry.data,entry,entry.parcela_atual).vencimento:entry.data;
    const target=effective.slice(0,7),row=bucket(target),amount=bigCents(entry.valor);
    row.count++;
    if(entry.tipo==='entrada')row.income+=amount;
    else{
      const installment=card&&entry.total_parcelas>1;
      if(installment)row.installments+=amount;else row.regular+=amount;
      if(card)row.cards+=amount;
      if(installment&&target>month){
        futureInstallments+=amount;futureCount++;
        if(!lastInstallment||effective>lastInstallment)lastInstallment=effective;
      }
    }
  }
  const history=previous.map(key=>({month:key,...bucket(key)}));
  const observed=history.filter(row=>row.count>0).length;
  const sum=field=>history.reduce((n,row)=>n+row[field],0n);
  const averageIncome=average(sum('income'),observed),averageRegular=average(sum('regular'),observed);
  const current=bucket(month),currentExpense=current.regular+current.installments;
  const currentNet=current.income-currentExpense;
  let cumulative=0n;
  const projection=next.map(key=>{
    const known=bucket(key);
    // Evita contar as mesmas despesas duas vezes: parcelas entram só na sua linha.
    const income=max(averageIncome,known.income),regular=max(averageRegular,known.regular);
    const total=regular+known.installments,net=income-total;cumulative+=net;
    return {mes:key,entradas_estimadas:decimal(income),saidas_regulares_estimadas:decimal(regular),
      parcelas_conhecidas:decimal(known.installments),saidas_estimadas:decimal(total),
      variacao_mensal:decimal(net),variacao_acumulada:decimal(cumulative)};
  });
  const nextCards=next.reduce((n,key)=>n+bucket(key).cards,0n);
  const tips=[];
  if(current.income===0n)tips.push({nivel:'info',titulo:'Sem base de renda neste mês',texto:'Não há entradas registradas para calcular a taxa de sobra. Isso não significa que sua renda real seja zero.'});
  else if(currentNet<0n)tips.push({nivel:'atencao',titulo:'Saídas acima das entradas',texto:`No mês selecionado, as saídas consideradas superam as entradas em ${brl(-currentNet)}. Confira os registros e seus vencimentos.`});
  else tips.push({nivel:'info',titulo:'Diferença positiva no mês',texto:`As entradas registradas superam as saídas consideradas em ${brl(currentNet)}. Esse valor é a diferença do período, não um saldo bancário confirmado.`});
  if(futureInstallments>0n)tips.push({nivel:'info',titulo:'Parcelas já comprometidas',texto:`Existem ${futureCount} parcelas após o mês selecionado, somando ${brl(futureInstallments)}. A última vence em ${lastInstallment.split('-').reverse().join('/')}.`});
  else tips.push({nivel:'info',titulo:'Sem parcelas futuras registradas',texto:'Não há parcelas de compras em cartão após o mês selecionado. Outros gastos futuros podem não ter sido cadastrados.'});
  if(observed<3)tips.push({nivel:'atencao',titulo:'Histórico parcial',texto:`A janela de três meses completos contém ${observed} mês(es) com registros. A média considera somente esses meses; com poucos dados, a projeção é mais limitada.`});
  const negative=projection.find(row=>bigCents(row.variacao_acumulada)<0n);
  if(negative)tips.push({nivel:'atencao',titulo:'Variação negativa no cenário',texto:`Pelas hipóteses desta projeção, a variação acumulada fica negativa em ${negative.mes.split('-').reverse().join('/')}. O resultado não considera um saldo inicial de conta.`});
  return {
    mes:month,aviso:'Informações educativas. Não constituem recomendação financeira profissional.',
    periodo_historico:{inicio:previous[0],fim:previous[2],meses_com_registros:observed,janela_meses:3},
    resumo:{entradas:decimal(current.income),saidas:decimal(currentExpense),diferenca:decimal(currentNet)},
    indicadores:{taxa_sobra_percentual:signedPercent(currentNet,current.income),
      comprometimento_cartoes_percentual:averageIncome===0n?null:percentage(nextCards,averageIncome*3n),
      proximas_faturas_total:decimal(nextCards),parcelas_futuras_total:decimal(futureInstallments),parcelas_futuras_quantidade:futureCount,
      ultima_parcela:lastInstallment,renda_media_mensal:decimal(averageIncome),saidas_regulares_media:decimal(averageRegular)},
    historico:history.map(row=>({mes:row.month,tem_registros:row.count>0,entradas:decimal(row.income),saidas_regulares:decimal(row.regular),parcelas:decimal(row.installments),saidas:decimal(row.regular+row.installments)})),
    projecao:projection,dicas:tips,
    premissas:[
      'Análise por mês de vencimento dos cartões; demais lançamentos usam a data registrada.',
      'Médias calculadas nos meses com registros entre os três meses completos anteriores ao selecionado.',
      'A projeção usa o maior valor entre a média histórica e os lançamentos já conhecidos do mês, para entradas e saídas regulares.',
      'Despesas parceladas são excluídas da média regular e acrescentadas apenas pelos vencimentos conhecidos, sem dupla contagem.',
      'Variação acumulada começa em zero: não representa o saldo de uma conta e não considera pagamento ou baixa de faturas.'
    ]
  };
}
