const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('web/app.html','utf8');
const transport = html.slice(html.indexOf('    function api('), html.indexOf('    function appendCell('));
function setup() {
  let clock = 0, serial = 0, clears = 0, oldHandlerCalls = 0;
  const timers = new Map(), nodes = {}, clicks = [], scripts = [];
  function el(id,value='') {
    return nodes[id] = {id,value,dataset:{},style:{},disabled:false,textContent:'Gravar',
      classList:{remove(){},add(){}},setAttribute(){},removeAttribute(){},
      closest(s){return s === '#'+id ? this : {insertAdjacentElement(_p,node){nodes[node.id]=node;}};},
      addEventListener(){},remove(){this.removed=true;}};
  }
  for (const [id,value] of Object.entries({expenseDate:'2026-11-02',expenseCard:'6',expenseValue:'39,98',expenseDescription:'Mercado livre capa sofá marrom',expenseInstallments:'2',expenseDivided:'false',expenseMode:'mesmo_dia',expenseRecurring:'false',expenseRecurrenceInterval:'1',expenseRecurrenceCount:'1',expenseAccount:'PESSOAL',saveExpense:'',clearExpense:''})) el(id,value);
  const ctx = {console,URLSearchParams,Date,Math,Error,Promise,Number,Object,String,JSON,NaN,
    API_URL:'https://example.test/exec',ensureApiUrl(){},state:{token:'test'},loading(){},logout(){},
    performance:{now:()=>clock},
    setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:clock+ms});return id;},
    clearTimeout(id){timers.delete(id);},
    clearExpense(){clears++;nodes.expenseValue.value='';nodes.expenseDescription.value='';},
    resetExpenseExtras(){},
    MutationObserver:class {observe(){}},
    document:{documentElement:{},getElementById(id){return nodes[id]||null;},
      createElement(tag){return {tag,style:{},setAttribute(){},remove(){this.removed=true;}};},
      addEventListener(type,fn){if(type==='click')clicks.push(fn);},head:{appendChild(s){scripts.push(s);}}}
  };
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(transport,ctx);
  // Apply the existing timeout shim too: regression must survive the real load order.
  vm.runInContext(fs.readFileSync('web/api-timeout-fix.js','utf8'),ctx);
  vm.runInContext(fs.readFileSync('web/fast-save-ui.js','utf8'),ctx);
  clicks.push(()=>{oldHandlerCalls++;});
  const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
  return {ctx,nodes,scripts,timers,get clears(){return clears;},get oldCalls(){return oldHandlerCalls;},
    async click(){let stopped=false;const e={target:nodes.saveExpense,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){stopped=true;}};for(const fn of clicks){fn(e);if(stopped)break;}await flush();},
    async advance(ms){clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}await flush();},
    async reply(data){const s=scripts[scripts.length-1];const cb=new URL(s.src).searchParams.get('callback');ctx[cb](data);await flush();},flush};
}
(async()=>{
  const s=setup();await s.click();
  assert.equal(s.scripts.length,1);assert.equal(s.oldCalls,0);
  assert.equal(new URL(s.scripts[0].src).searchParams.get('valorTotal'),'39.98');
  await s.click();assert.equal(s.scripts.length,1,'double click must not resend');
  await s.advance(200000);
  assert.equal(s.nodes.saveExpense.disabled,true);assert.equal(s.clears,0);
  assert.match(s.nodes.cgExpenseSaveFeedback.textContent,/sem confirmação/);
  await s.reply({ok:true,msg:'Despesa gravada.'});
  assert.equal(s.clears,1);assert.equal(s.nodes.expenseDescription.value,'');
  assert.match(s.nodes.cgExpenseSaveFeedback.textContent,/DESPESA GRAVADA/);
  assert.equal(s.nodes.saveExpense.textContent,'✓ Gravado');
  assert.equal(s.nodes.saveExpense.disabled,false);assert.equal(s.nodes.clearExpense.disabled,false);
  assert.equal(s.timers.size,0);assert.equal(s.scripts.length,1);
  const failure=setup();await failure.click();failure.scripts[0].onerror();await failure.flush();
  assert.equal(failure.clears,0);assert.match(failure.nodes.cgExpenseSaveFeedback.textContent,/pode já estar/);
  await failure.click();assert.equal(failure.scripts.length,1,'ambiguous failure must not resend identical payload');
  const rejected=setup();await rejected.click();await rejected.reply({ok:false,msg:'Cartão inválido.'});
  assert.equal(rejected.clears,0);assert.match(rejected.nodes.cgExpenseSaveFeedback.textContent,/Cartão inválido/);
  assert.equal(rejected.nodes.saveExpense.disabled,false);
  const read=setup();let failed=false;const req=read.ctx.api('listDespesas').catch(()=>{failed=true;});
  await read.advance(180000);await req;assert.equal(failed,true,'read timeout remains bounded');
  console.log('PASS: late success after 200 s; one send; capture precedence; cleared form; persistent success; ambiguous failure; explicit rejection; bounded reads.');
})().catch(e=>{console.error(e);process.exit(1);});
