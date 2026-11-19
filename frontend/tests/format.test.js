import test from 'node:test';
import assert from 'node:assert/strict';
import {cpfMask,cpfValid,decimalInput,moneyValid,monthPeriod,dateBR} from '../src/components/format.js';
test('máscara de CPF mantém dígitos verificadores e valida exemplos',()=>{assert.equal(cpfMask('52998224725'),'529.982.247-25');assert.equal(cpfValid(cpfMask('52998224725')),true);assert.equal(cpfValid('52998224724'),false);assert.equal(cpfValid('11111111111'),false);});
test('valores brasileiros são convertidos antes do envio sem aceitar casas extras',()=>{assert.equal(decimalInput('1.234,56'),'1234.56');assert.equal(moneyValid('1.234,56'),true);assert.equal(moneyValid('0,01'),true);assert.equal(moneyValid('1,234'),false);assert.equal(moneyValid('-1,00'),false);assert.equal(moneyValid('0,00'),false);});
test('período e exibição de datas preservam o dia sem conversão de fuso',()=>{assert.deepEqual(monthPeriod('2028-02'),{inicio:'2028-02-01',fim:'2028-02-29'});assert.equal(dateBR('2026-11-03'),'03/11/2026');});
