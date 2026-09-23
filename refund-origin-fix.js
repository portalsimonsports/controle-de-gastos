'use strict';
(function(){
  if(window.__cgRefundOriginFixInstalled)return;
  window.__cgRefundOriginFixInstalled=true;
  let cachedRows=[];

  function keyFor(item){
    const base=[
      item?.data||'',
      item?.descricao||'',
      item?.cartao||'',
      item?.ref||'',
      Number(item?.valor||0).toFixed(2)
    ].join('|');
    let h=2166136261;
    for(let i=0;i<base.length;i++){
      h^=base.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(36).toUpperCase();
  }

  function install(){
    if(typeof window.call!=='function')return false;
    if(window.call.__cgRefundOriginWrapped)return true;

    const originalCall=window.call;
    async function wrappedCall(action,params={},showLoading=true){
      const nextParams={...(params||{})};

      if(action==='saveDespesa' && String(nextParams.tipoMovimento||'').toUpperCase()==='ESTORNO'){
        const wanted=String(nextParams.compraOrigem||'').trim().toUpperCase();
        const item=cachedRows.find(row=>keyFor(row)===wanted);
        if(item){
          nextParams.linhaOrigem=item.linha||'';
          nextParams.dataOrigem=item.data||'';
          nextParams.descricaoOrigem=item.descricao||'';
          nextParams.valorOrigem=item.valor??'';
          nextParams.refCartao=item.refCartao||nextParams.refCartao||'';
        }
      }

      const result=await originalCall(action,nextParams,showLoading);

      if(action==='listDespesas' && Array.isArray(result?.rows)){
        cachedRows=result.rows.slice();
      }

      return result;
    }

    wrappedCall.__cgRefundOriginWrapped=true;
    wrappedCall.__cgOriginalCall=originalCall;
    window.call=wrappedCall;
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),15000);
  }
})();
