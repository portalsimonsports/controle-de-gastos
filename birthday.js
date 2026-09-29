(function(){
  'use strict';

  if (window.__cgBirthdayInstalled) return;
  window.__cgBirthdayInstalled = true;

  function el(id){ return document.getElementById(id); }
  function canEdit(){ return state && (state.role === 'admin' || state.role === 'editor'); }

  function installStyle(){
    if (el('cgBirthdayStyle')) return;
    const style = document.createElement('style');
    style.id = 'cgBirthdayStyle';
    style.textContent = `
      #viewBirthday .birthday-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin-bottom:8px}
      #viewBirthday .birthday-actions{display:flex;gap:8px;flex-wrap:wrap}
      #viewBirthday .birthday-name{font-weight:750}
      #viewBirthday .birthday-muted{color:var(--muted);font-size:.82rem}
      #viewBirthday .birthday-form[hidden]{display:none!important}
      #viewBirthday .birthday-edit-btn{min-height:34px;padding:6px 10px}
      @media(max-width:900px){#viewBirthday table{min-width:760px}}
    `;
    document.head.appendChild(style);
  }

  function installView(){
    if (el('viewBirthday')) return;
    const host = el('privateView');
    if (!host) return;

    const article = document.createElement('article');
    article.className = 'card view';
    article.id = 'viewBirthday';
    article.hidden = true;
    article.innerHTML = `
      <h3>Aniversários</h3>
      <div class="birthday-toolbar">
        <button class="btn primary" type="button" id="birthdayNew">Novo cadastro</button>
        <button class="btn ghost" type="button" id="birthdayRefresh">Atualizar</button>
      </div>

      <div class="grid birthday-form" id="birthdayForm" hidden>
        <input type="hidden" id="birthdayRow">
        <div class="col-4"><label for="birthdayName">Nome</label><input id="birthdayName" maxlength="180" autocomplete="off"></div>
        <div class="col-3"><label for="birthdayBirth">Data de nascimento</label><input id="birthdayBirth" type="date"></div>
        <div class="col-3"><label for="birthdayDate">Data</label><input id="birthdayDate" type="date"></div>
        <div class="col-12 birthday-actions">
          <button class="btn" type="button" id="birthdaySave">Salvar</button>
          <button class="btn ghost" type="button" id="birthdayCancel">Cancelar</button>
        </div>
        <div class="col-12 birthday-muted">Ao preencher o campo Data, o cadastro permanece na planilha, mas deixa de aparecer nesta lista.</div>
      </div>

      <div class="table-wrap"><table>
        <thead><tr><th>Nome</th><th>Data Nascimento</th><th>Ano(s)</th><th>Mês(es)</th><th>Dia(s)</th><th id="birthdayActionsHead">Ações</th></tr></thead>
        <tbody id="birthdayBody"></tbody>
      </table></div>
    `;
    host.appendChild(article);

    el('birthdayNew').addEventListener('click', birthdayNew);
    el('birthdayRefresh').addEventListener('click', birthdayLoad);
    el('birthdaySave').addEventListener('click', birthdaySave);
    el('birthdayCancel').addEventListener('click', birthdayCancel);
    paintPermissions();
  }

  function paintPermissions(){
    const editable = canEdit();
    if (el('birthdayNew')) el('birthdayNew').hidden = !editable;
    if (el('birthdayActionsHead')) el('birthdayActionsHead').hidden = !editable;
  }

  function birthdayCancel(){
    el('birthdayForm').hidden = true;
    el('birthdayRow').value = '';
    el('birthdayName').value = '';
    el('birthdayBirth').value = '';
    el('birthdayDate').value = '';
  }

  function birthdayNew(){
    if (!canEdit()) return;
    birthdayCancel();
    el('birthdayForm').hidden = false;
    el('birthdayName').focus();
  }

  function birthdayEdit(item){
    if (!canEdit()) return;
    el('birthdayRow').value = item.linha || '';
    el('birthdayName').value = item.nome || '';
    el('birthdayBirth').value = item.nascimento || '';
    el('birthdayDate').value = '';
    el('birthdayForm').hidden = false;
    el('birthdayName').focus();
    el('viewBirthday').scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function birthdaySave(){
    if (!canEdit()) return toast('Seu perfil não permite alterações.', 'error');
    const nome = el('birthdayName').value.trim();
    const nascimento = el('birthdayBirth').value;
    const data = el('birthdayDate').value;
    if (!nome || !nascimento) return toast('Informe nome e data de nascimento.', 'error');

    try{
      const result = await call('birthdaySave', {token: state.token, linha: el('birthdayRow').value, nome, nascimento, data});
      toast(result.msg || 'Cadastro salvo.');
      birthdayCancel();
      await birthdayLoad();
    }catch(error){toast(error.message, 'error');}
  }

  function td(row, value, className){
    const cell = document.createElement('td');
    cell.textContent = value == null ? '' : String(value);
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  async function birthdayLoad(){
    const body = el('birthdayBody');
    if (!body || !state.token) return;
    paintPermissions();
    try{
      const result = await call('birthdayList', {token: state.token});
      const rows = result.rows || [];
      body.innerHTML = '';
      if (!rows.length){
        const tr = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = canEdit() ? 6 : 5;
        cell.className = 'empty';
        cell.textContent = 'Nenhum cadastro ativo encontrado.';
        tr.appendChild(cell); body.appendChild(tr); return;
      }
      rows.forEach(function(item){
        const tr = document.createElement('tr');
        td(tr, item.nome, 'birthday-name'); td(tr, item.nascimentoDisplay || ''); td(tr, item.anos || ''); td(tr, item.meses || ''); td(tr, item.dias || '');
        if (canEdit()){
          const actions = document.createElement('td');
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'btn ghost birthday-edit-btn'; button.textContent = 'Editar';
          button.addEventListener('click', function(){ birthdayEdit(item); }); actions.appendChild(button); tr.appendChild(actions);
        }
        body.appendChild(tr);
      });
    }catch(error){
      body.innerHTML = '';
      const tr = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 6; cell.className = 'empty';
      cell.textContent = error.message || 'Não foi possível carregar os aniversários.'; tr.appendChild(cell); body.appendChild(tr); toast(error.message, 'error');
    }
  }

  function installTab(){
    if (!tabs.some(function(tab){return tab.id === 'viewBirthday';})) tabs.push({ id: 'viewBirthday', label: 'Aniversários', roles: ['admin','editor','viewer'] });
    const originalShowView = showView;
    showView = async function(id){await originalShowView(id); if (id === 'viewBirthday') await birthdayLoad();};
    if (state && state.token){renderTabs(); if (state.activeView === 'viewBirthday') birthdayLoad();}
  }

  installStyle(); installView(); installTab();
})();
