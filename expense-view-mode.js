'use strict';
(function(){
  const BOX='expenseViewModeControl',SEL='expenseViewModeSelect',BTN='expenseViewModeApply',MSG='expenseViewModeStatus';
  let loaded='',busy=false;
  const manage=()=>typeof state!=='undefined'&&(state.role==='admin'||state.role==='editor');
  const session=()=>typeof state!=='undefined'&&Boolean(state.token);

  function option(value,text){const o=document.createElement('option');o.value=value;o.textContent=text;return o;}
  function ensure(){
    const view=document.getElementById('viewExpenses');
    if(!view||document.getElementById(BOX))return;
    const st=document.createElement('style');st.textContent='.expense-view-mode{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;margin:0 0 16px;padding:14px;border:1px solid var(--border);border-radius:14px;background:rgba(11,20,36,.54)}.expense-view-mode p{grid-column:1/-1;margin:0;color:var(--muted);font-size:.82rem;line-height:1.4}.expense-view-mode p strong{color:#dbe7fb}@media(max-width:700px){.expense-view-mode{grid-template-columns:1fr}.expense-view-mode .btn{width:100%}.expense-view-mode p{grid-column:1}}';document.head.appendChild(st);
    const box=document.createElement('div');box.id=BOX;box.className='expense-view-mode';
    const field=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select'),button=document.createElement('button'),msg=document.createElement('p');
    label.htmlFor=SEL;label.textContent='Visualização da aba Despesas';select.id=SEL;
    select.append(option('TODOS','Exibir todos os lançamentos'),option('ATE_HOJE','Exibir somente até a data atual'));
    field.append(label,select);button.id=BTN;button.type='button';button.className='btn primary';button.textContent='Aplicar visualização';button.addEventListener('click',apply);
    msg.id=MSG;msg.textContent='Carregando a visualização atual…';box.append(field,button,msg);
    const title=view.querySelector('h3');title?title.insertAdjacentElement('afterend',box):view.prepend(box);
  }

  function lock(on,text){const s=document.getElementById(SEL),b=document.getElementById(BTN);if(s)s.disabled=on||!manage();if(b){b.disabled=on||!manage();b.textContent=on?(text||'Aplicando…'):'Aplicar visualização';}}
  function paint(r){
    const s=document.getElementById(SEL),b=document.getElementById(BTN),m=document.getElementById(MSG);if(!s||!m)return;
    if(Array.isArray(r.opcoes)&&r.opcoes.length){s.innerHTML='';r.opcoes.forEach(x=>s.append(option(x.valor,x.rotulo)));}
    s.value=r.modo||'ATE_HOJE';const allowed=r.permiteAlterar!==false&&manage();s.disabled=!allowed;if(b){b.disabled=!allowed;b.hidden=!allowed;}
    m.innerHTML='';const strong=document.createElement('strong');strong.textContent=(r.descricao||'Visualização atual')+'.';m.append(strong);
    m.append(document.createTextNode(r.modo==='ATE_HOJE'?' '+Number(r.futurosOcultos||0)+' lançamento(s) futuro(s) permanecem gravados e ocultos somente na planilha.':' Lançamentos atuais e futuros estão visíveis na planilha.'));
    m.append(document.createTextNode(' Esta preferência é global.'));
  }

  async function load(force){ensure();if(!session()||busy||(!force&&loaded===state.token))return;busy=true;lock(true,'Carregando…');try{const r=await call('getExpenseViewMode',{token:state.token},false);loaded=state.token;paint(r);}catch(e){const m=document.getElementById(MSG);if(m)m.textContent=e.message||'Não foi possível carregar a visualização.';}finally{busy=false;lock(false);}}
  async function apply(){if(!session()||!manage())return;const s=document.getElementById(SEL);if(!s)return;lock(true,'Aplicando…');try{const r=await call('setExpenseViewMode',{token:state.token,modo:s.value},false);paint(r);loaded=state.token;toast(r.msg||'Visualização atualizada.');}catch(e){toast(e.message,'error');}finally{lock(false);}}

  document.addEventListener('click',e=>{const t=e.target.closest('.tab');if(t&&String(t.textContent||'').trim()==='Despesas')setTimeout(()=>load(true),50);},true);
  window.addEventListener('focus',()=>{const v=document.getElementById('viewExpenses');if(v&&!v.hidden)load(true);});
  ensure();setInterval(()=>{if(!session()){loaded='';return;}if(loaded!==state.token)load(true);},1000);
})();
