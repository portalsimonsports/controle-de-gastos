(function(){
  'use strict';
  if (window.__cgIncomeBrlFixInstalled) return;
  window.__cgIncomeBrlFixInstalled = true;

  const IDS = ['incomeSalary','incomeOthers','incomeRent','incomeRefund','incomeReturn'];
  const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});

  function el(id){ return document.getElementById(id); }

  function parseMoney(value){
    let s=String(value==null?'':value).trim();
    if(!s) return 0;
    s=s.replace(/\s/g,'').replace(/^R\$/i,'');
    if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s=s.replace(',','.');
    s=s.replace(/[^0-9.-]/g,'');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  }

  function canonical(value){
    const n=parseMoney(value);
    return n ? n.toFixed(2) : '';
  }

  function formatInput(input){
    if(!input) return;
    const raw=String(input.value||'').trim();
    if(!raw){ input.value=''; return; }
    input.value=brl.format(parseMoney(raw));
  }

  function editInput(input){
    if(!input) return;
    const raw=String(input.value||'').trim();
    if(!raw){ input.value=''; return; }
    const n=parseMoney(raw);
    input.value=n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false});
    try{ input.setSelectionRange(input.value.length,input.value.length); }catch(_){}
  }

  function prepare(){
    IDS.forEach(function(id){
      const input=el(id);
      if(!input || input.dataset.brlReady==='1') return;
      input.dataset.brlReady='1';
      input.type='text';
      input.inputMode='decimal';
      input.autocomplete='off';
      input.placeholder='R$ 0,00';
      input.addEventListener('focus',function(){ editInput(input); });
      input.addEventListener('blur',function(){ formatInput(input); });
      input.addEventListener('input',function(){
        input.value=String(input.value||'').replace(/[^0-9,.-]/g,'');
      });
      formatInput(input);
    });

    const save=el('saveIncome');
    if(save && save.dataset.brlCapture!=='1'){
      save.dataset.brlCapture='1';
      save.addEventListener('click',function(){
        IDS.forEach(function(id){
          const input=el(id);
          if(input) input.value=canonical(input.value);
        });
        setTimeout(function(){
          IDS.forEach(function(id){
            const input=el(id);
            if(input && String(input.value||'').trim()) formatInput(input);
          });
        },0);
      },true);
    }
  }

  prepare();
  new MutationObserver(prepare).observe(document.documentElement,{childList:true,subtree:true});
})();