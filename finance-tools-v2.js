'use strict';
(function(){
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const num=v=>{const s=String(v??'').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const normDate=v=>{const s=String(v||'').trim();const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:s;};
  const roleAllowed=roles=>{try{return roles.includes(String(state?.role||'viewer'));}catch(_){return false;}};
  const toastSafe=(m,t)=>{try{toast(m,t);}catch(_){alert(m);}};

  function keyFor(item){
    const base=[item.data||'',item.descricao||'',item.cartao||'',item.ref||'',Number(item.valor||0).toFixed(2)].join('|');
    let h=2166136261; for(let i=0;i<base.length;i++){h^=base.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0).toString(36).toUpperCase();
  }

  function ensureViews(){
    const pv=$('privateView'); if(!pv)return;
    if(!$('viewRefunds')){
      const a=document.createElement('article'); a.className='card view'; a.id='viewRefunds'; a.hidden=true;
      a.innerHTML=`<h3>Estorno / Devolução</h3>
      <div class="grid">
        <div class="col-3"><label for="refundStart">Compras desde</label><input type="date" id="refundStart"></div>
        <div class="col-3"><label for="refundEnd">Até</label><input type="date" id="refundEnd"></div>
        <div class="col-3"><label for="refundSearch">Pesquisar</label><input id="refundSearch" placeholder="Descrição, cartão ou valor"></div>
        <div class="col-3 actions"><button class="btn primary" id="refundLoad">Carregar compras</button></div>
      </div>
      <div class="finance-tools-summary"><div class="finance-tools-kpi"><span>Compras encontradas</span><strong id="refundCount">0</strong></div><div class="finance-tools-kpi"><span>Compra selecionada</span><strong id="refundSelectedValue">R$ 0,00</strong></div><div class="finance-tools-kpi"><span>Saldo disponível</span><strong id="refundAvailable">R$ 0,00</strong></div></div>
      <div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Cartão</th><th class="right">Valor</th><th></th></tr></thead><tbody id="refundBody"></tbody></table></div>
      <div class="refund-purchase" id="refundForm" hidden><strong id="refundPurchaseTitle"></strong><div class="grid">
        <div class="col-3"><label for="refundDate">Data do estorno</label><input type="date" id="refundDate"></div>
        <div class="col-3"><label for="refundValue">Valor a estornar</label><input type="number" min="0.01" step="0.01" id="refundValue"></div>
        <div class="col-6"><label for="refundReason">Motivo / observação</label><input id="refundReason" maxlength="120" placeholder="Ex.: compra cancelada, produto devolvido"></div>
        <div class="col-12 refund-actions"><button class="btn" id="refundSave">Gravar estorno</button><button class="btn ghost" id="refundClear">Cancelar seleção</button></div>
      </div><p class="muted small">A compra original permanece intacta. O estorno é registrado como um novo movimento vinculado à compra selecionada.</p></div>`;
      pv.appendChild(a);
    }
    if(!$('viewCalculator')){
      const a=document.createElement('article'); a.className='card view'; a.id='viewCalculator'; a.hidden=true;
      a.innerHTML=`<h3>Calculadora</h3><div class="calc-shell"><input id="calcDisplay" class="calc-display" inputmode="decimal" value="0" aria-label="Visor da calculadora"><div class="calc-grid" id="calcGrid">
      <button class="calc-clear" data-calc="clear">C</button><button data-calc="back">⌫</button><button data-calc="percent">%</button><button class="calc-op" data-calc="/">÷</button>
      <button data-calc="7">7</button><button data-calc="8">8</button><button data-calc="9">9</button><button class="calc-op" data-calc="*">×</button>
      <button data-calc="4">4</button><button data-calc="5">5</button><button data-calc="6">6</button><button class="calc-op" data-calc="-">−</button>
      <button data-calc="1">1</button><button data-calc="2">2</button><button data-calc="3">3</button><button class="calc-op" data-calc="+">+</button>
      <button data-calc="0">0</button><button data-calc=".">,</button><button data-calc="copy">Copiar</button><button class="calc-eq" data-calc="=">=</button></div><div class="calc-note">Funciona somente no navegador e não grava dados na planilha.</div></div>`;
      pv.appendChild(a);
    }
  }

  function activate(id){
    document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==id);
    try{state.activeView=id;sessionStorage.setItem('cg_view',id);}catch(_){}
    document.querySelectorAll('#tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.financeView===id));
    ensureMenu();
  }

  function ensureMenu(){
    const nav=$('tabs'); if(!nav||nav.hidden)return;
    const defs=[
      {id:'viewRefunds',label:'Estorno / Devolução',roles:['admin','editor']},
      {id:'viewCalculator',label:'Calculadora',roles:['admin','editor','viewer']}
    ];
    defs.forEach(d=>{
      if(!roleAllowed(d.roles))return;
      let b=nav.querySelector(`[data-finance-view="${d.id}"]`);
      if(!b){b=document.createElement('button');b.type='button';b.className='tab';b.dataset.financeView=d.id;b.textContent=d.label;b.addEventListener('click',()=>activate(d.id));nav.appendChild(b);}
      try{b.classList.toggle('active',state.activeView===d.id);}catch(_){}
    });
  }

  const rs={rows:[],selected:null,used:new Map()};
  function computeUsed(){rs.used=new Map();rs.rows.forEach(i=>{const m=String(i.descricao||'').match(/^ESTORNO\s+\[([A-Z0-9]+)\]/i);const v=num(i.valor);if(m&&v<0){const k=m[1].toUpperCase();rs.used.set(k,(rs.used.get(k)||0)+Math.abs(v));}});}
  function available(i){return Math.max(0,Math.abs(num(i.valor))-(rs.used.get(keyFor(i))||0));}
  function cardRef(i){const s=$('expenseCard');if(!s)return '';const os=[...s.options];const r=String(i.ref||'').trim();let o=os.find(x=>x.value===r);if(o)return o.value;const c=String(i.cartao||'').toLowerCase();o=os.find(x=>String(x.textContent||'').toLowerCase().includes(c));return o?o.value:'';}
  function rowsFiltered(){const q=String($('refundSearch')?.value||'').trim().toLowerCase();const ini=$('refundStart')?.value||'';const fim=$('refundEnd')?.value||'';return rs.rows.filter(i=>{const v=num(i.valor),d=String(i.descricao||''),dt=normDate(i.data);if(v<=0||/^ESTORNO\s+\[/i.test(d))return false;if(ini&&dt&&dt<ini)return false;if(fim&&dt&&dt>fim)return false;return !q||[i.data,i.descricao,i.cartao,i.ref,String(i.valor)].some(x=>String(x||'').toLowerCase().includes(q));});}
  function renderRows(){const body=$('refundBody');if(!body)return;const list=rowsFiltered();$('refundCount').textContent=String(list.length);body.innerHTML='';if(!list.length){body.innerHTML='<tr><td colspan="5" class="empty">Nenhuma compra encontrada no período.</td></tr>';return;}list.forEach(i=>{const tr=document.createElement('tr');[i.data||'',i.descricao||'',i.cartao||''].forEach(x=>{const td=document.createElement('td');td.textContent=x;tr.appendChild(td);});const tdv=document.createElement('td');tdv.className='right';tdv.textContent=money(i.valor);tr.appendChild(tdv);const tda=document.createElement('td');const b=document.createElement('button');b.className='btn ghost';b.textContent='Selecionar';b.onclick=()=>selectRefund(i);tda.appendChild(b);tr.appendChild(tda);body.appendChild(tr);});}
  function selectRefund(i){rs.selected=i;const a=available(i);$('refundForm').hidden=false;$('refundDate').value=iso(new Date());$('refundValue').value=a>0?a.toFixed(2):'';$('refundValue').max=a.toFixed(2);$('refundReason').value='';$('refundPurchaseTitle').textContent=`${i.data||''} — ${i.descricao||''} — ${money(i.valor)}`;$('refundSelectedValue').textContent=money(i.valor);$('refundAvailable').textContent=money(a);$('refundSave').disabled=a<=0;}
  function clearSel(){rs.selected=null;if($('refundForm'))$('refundForm').hidden=true;if($('refundSelectedValue'))$('refundSelectedValue').textContent=money(0);if($('refundAvailable'))$('refundAvailable').textContent=money(0);}
  async function loadRefunds(){const ini=$('refundStart').value,fim=$('refundEnd').value;if(!ini||!fim)return toastSafe('Informe o período das compras.','error');try{const r=await call('listDespesas',{token:state.token,inicio:ini,fim:fim});rs.rows=Array.isArray(r.rows)?r.rows:[];computeUsed();clearSel();renderRows();}catch(e){toastSafe(e.message,'error');}}
  async function saveRefund(){const i=rs.selected;if(!i)return toastSafe('Selecione a compra que será estornada.','error');const a=available(i),v=num($('refundValue').value),dt=$('refundDate').value,reason=String($('refundReason').value||'').trim(),ref=cardRef(i);if(!dt||v<=0)return toastSafe('Informe a data e o valor do estorno.','error');if(v>a+0.0001)return toastSafe(`O máximo disponível é ${money(a)}.`,'error');if(!ref)return toastSafe('Não foi possível identificar o cartão da compra original.','error');const k=keyFor(i),desc=`ESTORNO [${k}] ${i.descricao||'Compra'}${reason?` — ${reason}`:''}`.slice(0,220),b=$('refundSave'),old=b.textContent;b.disabled=true;b.textContent='Gravando...';try{const r=await call('saveDespesa',{token:state.token,data:dt,descricao:desc,valorTotal:(-Math.abs(v)).toFixed(2),refCartao:ref,nParcelas:'1',divididoSN:'false',modoData:'mesmo_dia',tipoMovimento:'ESTORNO',compraOrigem:k,adiarOrdenacaoFinal:'true'},false);toastSafe(r.msg||'Estorno gravado.');await loadRefunds();}catch(e){toastSafe(e.message,'error');}finally{b.disabled=false;b.textContent=old;}}

  let expr='';
  function calc(a){const d=$('calcDisplay');try{if(a==='clear'){expr='';d.value='0';return;}if(a==='back'){expr=expr.slice(0,-1);d.value=expr||'0';return;}if(a==='copy'){navigator.clipboard?.writeText(d.value);toastSafe('Resultado copiado.');return;}if(a==='percent'){if(!/^[0-9+\-*/().\s]+$/.test(expr||'0'))throw 0;expr=String(Function(`"use strict";return (${expr||'0'})`)()/100);d.value=expr.replace('.',',');return;}if(a==='='){if(!/^[0-9+\-*/().\s]+$/.test(expr||'0'))throw 0;const n=Function(`"use strict";return (${expr||'0'})`)();if(!Number.isFinite(n))throw 0;expr=String(n);d.value=expr.replace('.',',');return;}expr+=a;d.value=expr.replace(/\*/g,'×').replace(/\//g,'÷').replace(/\./g,',');}catch(_){expr='';d.value='Erro';}}

  function bind(){
    const map=[['refundLoad','click',loadRefunds],['refundSearch','input',renderRows],['refundSave','click',saveRefund],['refundClear','click',()=>{clearSel();renderRows();}]];
    map.forEach(([id,ev,fn])=>{const e=$(id);if(e&&!e.dataset.ftv2){e.dataset.ftv2='1';e.addEventListener(ev,fn);}});
    const g=$('calcGrid');if(g&&!g.dataset.ftv2){g.dataset.ftv2='1';g.addEventListener('click',e=>{const b=e.target.closest('[data-calc]');if(b)calc(b.dataset.calc);});}
  }
  function defaults(){const n=new Date(),s=new Date(n.getFullYear(),n.getMonth()-6,n.getDate());if($('refundStart')&&!$('refundStart').value)$('refundStart').value=iso(s);if($('refundEnd')&&!$('refundEnd').value)$('refundEnd').value=iso(n);}
  let busy=false;
  function install(){if(busy)return;busy=true;try{ensureViews();bind();defaults();ensureMenu();}finally{busy=false;}}
  install();
  new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{ensureViews();bind();ensureMenu();},1200);
})();
