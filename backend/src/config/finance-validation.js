import { AppError } from './errors.js';

export function invalid(field, message) {
  throw new AppError(400, 'Revise os campos informados.', { [field]: message });
}
export function positiveId(value, field = 'id') {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) invalid(field, 'Informe um identificador válido.');
  return Number(value);
}
function object(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'Envie um objeto JSON válido.');
}
function text(value, field, max) {
  if (typeof value !== 'string') invalid(field, 'Campo obrigatório.');
  const result = value.trim().replace(/\s+/g, ' ');
  if (!result || result.length > max || /[\u0000-\u001f\u007f<>]/.test(result)) invalid(field, `Use de 1 a ${max} caracteres válidos.`);
  return result;
}
export function cents(value, field = 'valor') {
  if (!['string', 'number'].includes(typeof value) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(value))) invalid(field, 'Informe um valor positivo com até duas casas decimais, usando ponto.');
  const [whole, decimal = ''] = String(value).split('.');
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < 1 || result > 999999999999) invalid(field, 'Valor fora do intervalo permitido.');
  return result;
}
export const money = (value) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
export function dateISO(value, field = 'data') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') invalid(field, 'Informe uma data válida no formato AAAA-MM-DD, a partir de 1900.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid(field, 'Informe uma data existente.');
  return value;
}
function tipo(value) {
  if (!['entrada','saida'].includes(value)) invalid('tipo', 'Selecione entrada ou saída.');
  return value;
}
export function categoryBody(body) {
  object(body);
  return { nome: text(body.nome,'nome',60), tipo: tipo(body.tipo) };
}
export function sourceBody(body) {
  object(body);
  const nome = text(body.nome,'nome',60);
  if (!['renda','conta','cartao_credito'].includes(body.tipo)) invalid('tipo','Selecione renda, conta ou cartão de crédito.');
  if (body.tipo !== 'cartao_credito') {
    if (['dia_fechamento','dia_vencimento','limite'].some(key => body[key] !== undefined && body[key] !== null && body[key] !== '')) invalid('tipo','Apenas cartões podem ter fechamento, vencimento ou limite.');
    return { nome,tipo:body.tipo,dia_fechamento:null,dia_vencimento:null,limite:null };
  }
  const days = {};
  for (const field of ['dia_fechamento','dia_vencimento']) {
    if (!/^\d{1,2}$/.test(String(body[field])) || Number(body[field]) < 1 || Number(body[field]) > 31) invalid(field,'Informe um dia de 1 a 31.');
    days[field] = Number(body[field]);
  }
  return { nome,tipo:body.tipo,...days,limite:money(cents(body.limite,'limite')) };
}
export function entryBody(body, { updating = false } = {}) {
  object(body);
  const data = {
    tipo:tipo(body.tipo), descricao:text(body.descricao,'descricao',120), valorCentavos:cents(body.valor),
    data:dateISO(body.data), categoria_id:positiveId(body.categoria_id,'categoria_id'),
    fonte_destino_id:positiveId(body.fonte_destino_id,'fonte_destino_id'),
  };
  if (updating) {
    if (['total_parcelas','parcela_atual','grupo_parcelamento'].some(field => body[field] !== undefined)) invalid('total_parcelas','Edite os dados da parcela sem alterar a estrutura do parcelamento.');
  } else {
    const count = body.total_parcelas ?? 1;
    if (!/^\d{1,2}$/.test(String(count)) || Number(count) < 1 || Number(count) > 48) invalid('total_parcelas','Escolha de 1 a 48 parcelas.');
    data.total_parcelas = Number(count);
    if (data.valorCentavos < data.total_parcelas) invalid('valor','Cada parcela deve ter pelo menos um centavo.');
  }
  return data;
}
export function installments(total, count) {
  const base = Math.floor(total / count);
  return Array.from({length:count},(_,i)=>base+(i === 0 ? total % count : 0));
}
export function entryFilters(query) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const start = `${y}-${m}-01`;
  const end = `${y}-${m}-${new Date(y,now.getMonth()+1,0).getDate()}`;
  const result = { inicio:dateISO(query.inicio ?? start,'inicio'), fim:dateISO(query.fim ?? end,'fim') };
  if (result.inicio > result.fim) invalid('fim','A data final deve ser igual ou posterior à inicial.');
  if (query.tipo !== undefined) result.tipo=tipo(query.tipo);
  for (const field of ['categoria_id','fonte_destino_id']) if (query[field] !== undefined) result[field]=positiveId(query[field],field);
  for (const [field, fallback, max] of [['pagina',1,10000000],['limite',20,100]]) {
    const value=query[field] ?? fallback;
    if (!/^[1-9]\d*$/.test(String(value)) || Number(value)>max) invalid(field,`Informe um inteiro de 1 a ${max}.`);
    result[field]=Number(value);
  }
  return result;
}
