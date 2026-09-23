'use strict';
(function(){
  if(window.__cgRefundDirectSaveInstalled)return;
  window.__cgRefundDirectSaveInstalled=true;

  let selected=null;

  const $=id=>document.getElementById(id);
  const parseMoney=value=>{
    const s=String(value??'').trim().replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const apiMoney=value=>Math.abs(Number(value||0)).toFixed(2);
  const keyFor=item=>{
    const base=[item.data||'',item.descricao||'',item.cartao||'',item.ref||'',Number(item.valor||0).toFixed(2)].join('|');
    let h=2166136261;
    for(let i=0;i<base.length;i++){h^=base.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36).toUpperCase();
  };
  const cardRefFor=name=>{
    const select=$('expenseCard');
    if(!select)return '';
    const wanted=String(name||'').trim().toLocaleLowerCase('pt-BR');
    const option=[...select.options].find(o=>String(o.textContent||'').toLocaleLowerCase('pt-BR').includes(wanted));
    return option?option.value:'';
  };
  const toastSafe=(msg,type)=>{try{toast(msg,type);}catch(_){alert(msg);}};

  function normalizeUi(){
    const value=$('refundValue');
    if(value){
      value.removeAttribute('max');
      value.removeAttribute('min');
    }
    const available=$('refundAvailable');
    if(available){
      const box=available.closest('.finance-tools-kpi');
      const label=box?.querySelector('span');
      if(label)label.textContent='Valor da compra';
      if(selected)available.textContent=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(selected.valor||0);
    }
  }

  document.addEventListener('click',function(event){
    const selectButton=event.target.closest('#refundBody button');
    if(selectButton){
      const tr=selectButton.closest('tr');
      const cells=tr?[...tr.querySelectorAll('td')]:[];
      if(cells.length>=4){
        selected={
          data:String(cells[0].textContent||'').trim(),
          descricao:String(cells[1].textContent||'').trim(),
          cartao:String(cells[2].textContent||'').trim(),
          valor:parseMoney(cells[3].textContent)
        };
        setTimeout(normalizeUi,0);
      }
      return;
    }

    const saveButton=event.target.closest('#refundSave');
    if(!saveButton)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if(!selected){
      toastSafe('Selecione a compra que será estornada.','error');
      return;
    }

    const date=$('refundDate')?.value||'';
    const value=parseMoney($('refundValue')?.value||'');
    const reason=String($('refundReason')?.value||'').trim();
    const refCartao=cardRefFor(selected.cartao);

    if(!date||value<=0){
      toastSafe('Informe a data e o valor do estorno.','error');
      return;
    }
    if(!refCartao){
      toastSafe('Não foi possível identificar o cartão da compra selecionada.','error');
      return;
    }

    const key=keyFor(selected);
    const description=`ESTORNO [${key}] ${selected.descricao}${reason?` — ${reason}`:''}`.slice(0,220);
    const oldText=saveButton.textContent;
    saveButton.disabled=true;
    saveButton.textContent='Gravando...';

    Promise.resolve(call('saveDespesa',{
      token:state.token,
      data:date,
      descricao:description,
      valorTotal:'-'+apiMoney(value),
      refCartao:refCartao,
      nParcelas:'1',
      divididoSN:'false',
      modoData:'mesmo_dia',
      tipoMovimento:'ESTORNO',
      compraOrigem:key,
      dataOrigem:selected.data,
      descricaoOrigem:selected.descricao,
      valorOrigem:apiMoney(selected.valor),
      adiarOrdenacaoFinal:'false'
    },false)).then(result=>{
      toastSafe(result?.msg||'Estorno gravado.');
      selected=null;
      const load=$('refundLoad');
      if(load)load.click();
    }).catch(error=>{
      toastSafe(error?.message||String(error),'error');
    }).finally(()=>{
      saveButton.disabled=false;
      saveButton.textContent=oldText;
    });
  },true);

  const observer=new MutationObserver(normalizeUi);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  normalizeUi();
})();
