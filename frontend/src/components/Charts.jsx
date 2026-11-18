import {Bar,BarChart,CartesianGrid,Cell,Legend,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {brl} from './format';
import {Empty} from './ui';

const colors=['#087f72','#438cc6','#e2a23e','#8b73c5','#d56f76','#53a9a0','#56708f','#b99872'];
export function CategoryChart({data=[]}){
  const chart=data.filter(d=>Number(d.total)>0).map(d=>({...d,valor:Number(d.total)}));
  if(!chart.length)return <Empty title="Sem saídas neste período">Seus gastos por categoria aparecerão aqui.</Empty>;
  return <div className="donut-layout"><div className="chart" role="img" aria-label="Gráfico de saídas por categoria; valores disponíveis na legenda"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart} dataKey="valor" nameKey="nome" innerRadius={66} outerRadius={96} paddingAngle={3} stroke="none" isAnimationActive={false}>{chart.map((d,i)=><Cell key={d.id} fill={colors[i%colors.length]}/>)}</Pie><Tooltip formatter={value=>brl(value)}/></PieChart></ResponsiveContainer></div><ul className="chart-legend">{chart.map((d,i)=><li key={d.id}><span className="legend-dot" style={{background:colors[i%colors.length]}}/><span>{d.nome}</span><strong>{brl(d.total)}</strong></li>)}</ul></div>;
}
export function SourceChart({data=[]}){
  const chart=data.filter(d=>Number(d.entradas)||Number(d.saidas)).map(d=>({...d,entradas:Number(d.entradas),saidas:Number(d.saidas)}));
  if(!chart.length)return <Empty title="Sem movimentações neste período"/>;
  return <div className="chart wide" role="img" aria-label="Entradas e saídas por fonte ou destino; valores na tabela"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:15,right:10,left:15,bottom:15}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edef"/><XAxis dataKey="nome" tick={{fontSize:14}} tickFormatter={v=>v.length>15?v.slice(0,13)+'…':v}/><YAxis tick={{fontSize:14}} tickFormatter={v=>new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v)}/><Tooltip formatter={value=>brl(value)}/><Legend/><Bar name="Entradas" dataKey="entradas" fill="#087f72" radius={[4,4,0,0]} isAnimationActive={false}/><Bar name="Saídas" dataKey="saidas" fill="#d56f76" radius={[4,4,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>;
}
