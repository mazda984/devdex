/*
  Devdex - Lightweight Roblox-style platform UI (mobile-first)
  - Persistent game storage via WebsimSocket (room.collection('game'))
  - Thumbnail files uploaded using window.websim.upload(file)
*/

/* Start with no sample games — games will come from persisted records */
const SAMPLE_GAMES = [];

const room = new WebsimSocket();

const state = {
  view: 'discover', // current sidebar view
  page: 1,
  perPage: 8,
  filtered: SAMPLE_GAMES.slice(),
  currentUser: null // will hold { name, photo } after login
};

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

async function loadGamesFromDb(){
  // fetch all saved games from persistent collection and keep state.filtered in sync
  try{
    const records = await room.collection('game').getList();
    // records come newest->oldest; we want newest first (keep as is)
    state.filtered = records.map(r=>({
      id: r.id,
      title: r.title,
      author: r.author,
      players: r.players || 0,
      color: r.color || `hsl(${Math.floor(Math.random()*360)} 70% 70%)`,
      description: r.description || '',
      url: r.url || '',
      thumbUrl: r.thumbUrl || ''
    }));
    renderGrid();
  }catch(err){
    console.warn('Could not load games from DB', err);
  }

  // subscribe for live updates
  room.collection('game').subscribe(records=>{
    state.filtered = records.map(r=>({
      id: r.id,
      title: r.title,
      author: r.author,
      players: r.players || 0,
      color: r.color || `hsl(${Math.floor(Math.random()*360)} 70% 70%)`,
      description: r.description || '',
      url: r.url || '',
      thumbUrl: r.thumbUrl || ''
    }));
    // ensure page still valid
    const max = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    if(state.page > max) state.page = max;
    renderGrid();
  });
}

function renderGrid(){
  const grid = $('#grid');
  grid.innerHTML = '';

  // If view is 'develop' show the URL webviewer only
  if(state.view === 'develop'){
    const url = 'https://mazda984.github.io/studio/';
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.height = '100%';
    wrap.innerHTML = `
      <div style="font-size:13px;color:var(--muted)">Aşağıdaki geliştirici görüntüleyici:</div>
      <iframe src="${url}" style="width:100%;height:100%;border-radius:10px;border:1px solid #e6e7ea" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
    `;
    grid.style.height = '100%';
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.appendChild(wrap);
    $('#page').textContent = '—';
    $('#onlineCount').textContent = '';
    return;
  }

  // LIBRARY view: show all games as wide rectangular rows (thumbnail left, details right)
  if(state.view === 'library'){
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = '10px';
    grid.style.overflow = 'auto';
    grid.style.height = '100%';
    $('#page').textContent = '—';

    const items = state.filtered.slice(); // show all saved games
    if(items.length === 0){
      const empty = document.createElement('div');
      empty.style.padding = '18px';
      empty.style.borderRadius = '10px';
      empty.style.background = 'var(--panel)';
      empty.style.boxShadow = '0 6px 18px rgba(16,24,40,0.04)';
      empty.style.color = 'var(--muted)';
      empty.textContent = 'Kütüphanenizde henüz oyun yok.';
      grid.appendChild(empty);
      $('#onlineCount').textContent = '0';
      return;
    }

    items.forEach(g=>{
      const row = document.createElement('div');
      row.className = 'library-row';
      Object.assign(row.style, {
        display: 'flex',
        gap: '12px',
        alignItems: 'stretch',
        background: 'var(--panel)',
        borderRadius: '10px',
        padding: '10px',
        boxShadow: '0 6px 18px rgba(16,24,40,0.04)',
        overflow: 'hidden'
      });

      const thumbWrap = document.createElement('div');
      Object.assign(thumbWrap.style, {
        width: '160px',
        minWidth: '120px',
        height: '110px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: g.color
      });
      if(g.thumbUrl){
        const img = document.createElement('img');
        img.src = g.thumbUrl;
        img.alt = g.title;
        Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
        thumbWrap.appendChild(img);
      } else {
        thumbWrap.textContent = g.title;
        thumbWrap.style.display = 'flex';
        thumbWrap.style.alignItems = 'center';
        thumbWrap.style.justifyContent = 'center';
        thumbWrap.style.color = 'rgba(0,0,0,0.6)';
        thumbWrap.style.fontWeight = '700';
        thumbWrap.style.padding = '8px';
      }

      const meta = document.createElement('div');
      Object.assign(meta.style, {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: '1 1 auto',
        minWidth: 0
      });
      meta.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
          <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.title}</div>
          <div style="color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.author} • ${g.players.toLocaleString()} oyuncu</div>
          <div style="color:var(--muted);font-size:13px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${g.description}</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button class="play" style="height:40px;padding:8px 12px;border-radius:8px">Oyna</button>
          <button style="padding:8px;border-radius:8px;border:1px solid #e6e7ea;background:var(--panel)">Düzenle</button>
        </div>
      `;

      row.appendChild(thumbWrap);
      row.appendChild(meta);

      // attach actions
      const playBtn = row.querySelector('.play');
      playBtn.addEventListener('click', ()=> {
        openGameOverlay(g.url);
      });
      row.addEventListener('click', (e)=>{
        // avoid double-trigger when clicking buttons
        if(e.target.closest('button')) return;
        openModal(gameDetailHtml(g));
      });

      grid.appendChild(row);
    });

    $('#onlineCount').textContent = String(state.filtered.reduce((s,g)=>s+g.players,0));
    return;
  }

  if(state.view !== 'discover'){
    const msg = document.createElement('div');
    msg.style.padding = '18px';
    msg.style.borderRadius = '10px';
    msg.style.background = 'var(--panel)';
    msg.style.boxShadow = '0 6px 18px rgba(16,24,40,0.04)';
    msg.textContent = 'Bu sekmede oyunlar gösterilmiyor.';
    grid.appendChild(msg);
    $('#page').textContent = '—';
    $('#onlineCount').textContent = String(state.filtered.reduce((s,g)=>s+g.players,0));
    return;
  }

  const start = (state.page-1)*state.perPage;
  const pageItems = state.filtered.slice(start, start + state.perPage);

  if(pageItems.length === 0){
    const empty = document.createElement('div');
    empty.style.padding = '18px';
    empty.style.borderRadius = '10px';
    empty.style.background = 'var(--panel)';
    empty.style.boxShadow = '0 6px 18px rgba(16,24,40,0.04)';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'Henüz oyun yok. Oluştur tuşuyla kendi oyununu ekleyebilirsin.';
    grid.appendChild(empty);
  }

  pageItems.forEach(g=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.dataset.id = g.id;
    const thumbHtml = g.thumbUrl
      ? `<div class="thumb" style="background:${g.color};"><img src="${g.thumbUrl}" alt="${g.title}" style="width:100%;height:100%;object-fit:cover;border-radius:0" /></div>`
      : `<div class="thumb" style="background:${g.color}; color:rgba(0,0,0,0.6)">${g.title}</div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div class="card-body">
        <div class="meta">
          <div class="title">${g.title}</div>
          <div class="sub">${g.author} • ${g.players.toLocaleString()} oyuncu</div>
        </div>
        <div>
          <button class="play">Oyna</button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    card.querySelector('.play').addEventListener('click', (e)=>{
      e.stopPropagation();
      openModal(gameDetailHtml(g));
    });
    card.addEventListener('click', ()=> openModal(gameDetailHtml(g)));
    card.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter') openModal(gameDetailHtml(g));
    });
  });

  $('#page').textContent = String(state.page);
  $('#onlineCount').textContent = String(state.filtered.reduce((s,g)=>s+g.players,0));
}

function gameDetailHtml(g){
  return `
    <h2 style="margin:0 0 8px">${g.title}</h2>
    <div style="color:var(--muted);margin-bottom:12px">${g.author} • ${g.players.toLocaleString()} oyuncu</div>
    <div style="padding:12px;border-radius:8px;background:linear-gradient(180deg, #fff, #fbfbff)">${g.description}</div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button id="playNow" class="play">Oyna</button>
      <button id="favBtn" style="padding:8px;border-radius:8px;border:1px solid #e6e7ea">Favoriler</button>
    </div>
  `;
}

/* Game overlay (iframe with bottom-close) */
function openGameOverlay(url){
  // create overlay container
  let overlay = document.getElementById('gameOverlay');
  if(overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'gameOverlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(10,12,14,0.6)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 60,
    alignItems: 'stretch',
    justifyContent: 'center'
  });

  // iframe area
  const iframeWrap = document.createElement('div');
  Object.assign(iframeWrap.style, {
    flex: '1 1 auto',
    margin: '12px',
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'white',
    boxShadow: '0 12px 30px rgba(16,24,40,0.12)'
  });

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
  iframeWrap.appendChild(iframe);

  // bottom bar with close and fullscreen buttons
  const bottomBar = document.createElement('div');
  Object.assign(bottomBar.style, {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '8px',
    background: 'transparent'
  });

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = 'Tam Ekran';
  fullscreenBtn.className = 'play';
  Object.assign(fullscreenBtn.style, {
    width: '220px',
    maxWidth: '40%',
    height: '44px',
    borderRadius: '12px',
    background: 'var(--panel)',
    color: 'var(--text)',
    border: '1px solid #e6e7ea',
    fontWeight: 600
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Kapat';
  closeBtn.className = 'play';
  Object.assign(closeBtn.style, {
    width: '220px',
    maxWidth: '40%',
    height: '44px',
    borderRadius: '12px'
  });

  // fullscreen logic: request fullscreen on the iframe wrapper so it fills viewport
  let isInFullscreen = false;
  async function enterFullscreen(){
    try{
      if(iframeWrap.requestFullscreen) await iframeWrap.requestFullscreen();
      else if(iframeWrap.webkitRequestFullscreen) await iframeWrap.webkitRequestFullscreen();
      else if(iframeWrap.msRequestFullscreen) await iframeWrap.msRequestFullscreen();
      isInFullscreen = true;
      fullscreenBtn.textContent = 'Çıkış Tam Ekran';
    }catch(err){
      console.warn('Fullscreen failed', err);
    }
  }
  async function exitFullscreen(){
    try{
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.webkitFullscreenElement) await document.webkitExitFullscreen();
      isInFullscreen = false;
      fullscreenBtn.textContent = 'Tam Ekran';
    }catch(err){
      console.warn('Exit fullscreen failed', err);
    }
  }

  fullscreenBtn.addEventListener('click', async ()=>{
    if(!isInFullscreen){
      await enterFullscreen();
    } else {
      await exitFullscreen();
    }
  });

  // Close handler should also exit fullscreen if active
  closeBtn.addEventListener('click', async ()=> {
    try{
      if(document.fullscreenElement) await document.exitFullscreen();
    }catch(e){}
    overlay.remove();
  });

  // listen for fullscreenchange to keep button state in sync
  function onFsChange(){
    isInFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    fullscreenBtn.textContent = isInFullscreen ? 'Çıkış Tam Ekran' : 'Tam Ekran';
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('msfullscreenchange', onFsChange);

  bottomBar.appendChild(fullscreenBtn);
  bottomBar.appendChild(closeBtn);

  overlay.appendChild(iframeWrap);
  overlay.appendChild(bottomBar);

  document.body.appendChild(overlay);
}

/* Modal */
function openModal(html){
  const modal = $('#modal');
  $('#modalContent').innerHTML = html;
  modal.setAttribute('aria-hidden','false');

  const play = document.getElementById('playNow');
  if(play) play.addEventListener('click', ()=>{
    // find the game's URL from the currently displayed modal content (if present)
    // we stored the URL on the modal element if available, otherwise try to parse from existing content
    // Preferred: if modal was opened from a card click, the card's dataset.id is set; otherwise try to find anchor href
    const content = $('#modalContent');
    // Look up the open game's URL by matching title text to state.filtered (best-effort)
    const titleEl = content.querySelector('h2');
    let foundUrl = '';
    if(titleEl){
      const title = titleEl.textContent.trim();
      const g = state.filtered.find(x=> x.title === title);
      if(g && g.url) foundUrl = g.url;
    }
    // If not found, try data-url attribute
    if(!foundUrl && content.dataset && content.dataset.url) foundUrl = content.dataset.url;

    if(foundUrl){
      // open iframe overlay and close modal
      openGameOverlay(foundUrl);
      closeModal();
    } else {
      // fallback: just close modal
      closeModal();
    }
  });
}
function closeModal(){ $('#modal').setAttribute('aria-hidden','true') }

/* Search / filter */
function applySearch(q){
  const val = q.trim().toLowerCase();
  if(!val) state.filtered = state.filtered.slice(); // no-op, DB-backed list is already present
  else state.filtered = state.filtered.filter(g=> g.title.toLowerCase().includes(val) || g.author.toLowerCase().includes(val));
  state.page = 1;
  renderGrid();
}

/* Update top-right login button to show profile photo when logged in
   and helper to apply uploaded photo as the app background */
function setBackgroundFromPhoto(url){
  if(!url){
    // reset to original background color
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    return;
  }
  // use a subtle overlay so UI remains readable
  document.body.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)), url(${url})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
}

function updateLoginButton(){
  const loginBtn = document.getElementById('loginBtn');
  if(!state.currentUser){
    loginBtn.innerHTML = 'Giriş';
    loginBtn.classList.add('accent');
    loginBtn.style.padding = '';
    loginBtn.style.borderRadius = '';
    loginBtn.style.width = '';
    loginBtn.title = 'Giriş yap';
    // clear background when no user photo
    setBackgroundFromPhoto('');
  } else {
    const img = document.createElement('img');
    img.alt = state.currentUser.name || 'Profil';
    img.src = state.currentUser.photo || '';
    img.style.width = '36px';
    img.style.height = '36px';
    img.style.borderRadius = '8px';
    img.style.objectFit = 'cover';
    img.style.border = '1px solid #e6e7ea';
    loginBtn.textContent = '';
    loginBtn.classList.remove('accent');
    loginBtn.appendChild(img);
    loginBtn.title = state.currentUser.name || '';
    // apply user's photo as background if present
    if(state.currentUser.photo) setBackgroundFromPhoto(state.currentUser.photo);
  }
}

/* Sidebar navigation */
function setActiveNav(name){
  state.view = name;
  $all('.side-item').forEach(b=> b.classList.toggle('active', b.dataset.view === name));

  const heroTitle = $('#heroTitle');
  const heroSubtitle = $('#heroSubtitle');
  const viewAll = $('#viewAll');

  viewAll.onclick = null;
  viewAll.textContent = 'Hepsini Gör';

  if(name === 'discover'){
    heroTitle.textContent = 'Öne Çıkan Oyunlar';
    heroSubtitle.textContent = 'Popüler, yeni ve seni ilgilendirebilecek oyunlar';
  } else if(name === 'friends'){
    heroTitle.textContent = 'Arkadaşların ve Aktiviteler';
    heroSubtitle.textContent = '';
  } else if(name === 'messages'){
    heroTitle.textContent = 'Mesajlar';
    heroSubtitle.textContent = '';
  } else if(name === 'library'){
    heroTitle.textContent = 'Kütüphanen';
    heroSubtitle.textContent = '';
  } else if(name === 'develop'){
    const url = 'https://mazda984.github.io/studio/';
    heroTitle.textContent = 'Geliştirme';
    heroSubtitle.innerHTML = `<a href="${url}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">${url}</a>`;
    viewAll.textContent = 'Aç';
    viewAll.onclick = ()=> window.open(url, '_blank', 'noopener');
  }

  renderGrid();
}

/* Init */
function bind(){
  renderGrid();
  loadGamesFromDb();

  $('#search').addEventListener('input', (e)=> applySearch(e.target.value));

  $all('.side-item').forEach(btn=>{
    btn.addEventListener('click', ()=> setActiveNav(btn.dataset.view));
  });

  $('#prev').addEventListener('click', ()=>{
    if(state.page>1){ state.page--; renderGrid(); }
  });
  $('#next').addEventListener('click', ()=>{
    const max = Math.ceil(state.filtered.length / state.perPage);
    if(state.page < max){ state.page++; renderGrid(); }
  });

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e)=>{ if(e.target === $('#modal')) closeModal(); });

  $('#loginBtn').addEventListener('click', ()=> {
    const loginScreen = document.getElementById('loginScreen');
    loginScreen.setAttribute('aria-hidden','false');

    // show the choice first, hide fields until user picks
    const loginChoice = document.getElementById('loginChoice');
    const loginFields = document.getElementById('loginFields');
    if(loginChoice) loginChoice.style.display = 'flex';
    if(loginFields) loginFields.style.display = 'none';

    document.getElementById('loginForm').reset();
    document.getElementById('photoPreview').src = '';
  });

  const loginScreen = document.getElementById('loginScreen');
  const loginClose = document.getElementById('loginClose');
  const loginCancel = document.getElementById('loginCancel');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const loginForm = document.getElementById('loginForm');

  function hideLogin(){ loginScreen.setAttribute('aria-hidden','true'); }

  loginClose.addEventListener('click', hideLogin);
  loginCancel.addEventListener('click', hideLogin);
  loginScreen.addEventListener('click', (e)=> { if(e.target === loginScreen) hideLogin(); });

  photoInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) { photoPreview.src = ''; setBackgroundFromPhoto(''); return; }
    const url = URL.createObjectURL(f);
    photoPreview.src = url;
    // keep a reference to the file for later upload
    photoPreview._file = f;
    // immediately show the chosen photo as app background (preview)
    setBackgroundFromPhoto(url);
  });

  // login choice buttons: reveal fields and set header text
  const loginChoiceEl = document.getElementById('loginChoice');
  const loginFieldsEl = document.getElementById('loginFields');
  const chooseLoginBtn = document.getElementById('chooseLogin');
  const chooseRegisterBtn = document.getElementById('chooseRegister');

  function showLoginFields(mode){
    if(loginChoiceEl) loginChoiceEl.style.display = 'none';
    if(loginFieldsEl) loginFieldsEl.style.display = 'block';
    const h2 = document.querySelector('.login-card h2');
    if(h2) h2.textContent = mode === 'register' ? 'Kayıt Ol' : 'Giriş Yap';
    // adjust submit button text
    const submitBtn = document.querySelector('#loginForm .play');
    if(submitBtn) submitBtn.textContent = mode === 'register' ? 'Kayıt Ol' : 'Giriş';
  }

  if(chooseLoginBtn) chooseLoginBtn.addEventListener('click', ()=> showLoginFields('login'));
  if(chooseRegisterBtn) chooseRegisterBtn.addEventListener('click', ()=> showLoginFields('register'));

  loginForm.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const name = document.getElementById('loginUsername').value.trim() || 'Misafir';
    const avatar = document.getElementById('avatar');
    const first = name.slice(0,1).toUpperCase();
    avatar.textContent = first;
    if(photoPreview.src) avatar.style.backgroundImage = `url(${photoPreview.src})`, avatar.style.backgroundSize = 'cover', avatar.style.color = 'transparent';
    document.querySelector('.acct-info .name').textContent = name;

    state.currentUser = {
      name,
      photo: photoPreview.src || ''
    };
    updateLoginButton();
    // ensure background is set from the saved preview (or cleared)
    setBackgroundFromPhoto(state.currentUser.photo || '');

    hideLogin();
  });

  $('#createBtn').addEventListener('click', ()=> {
    // require login before allowing game creation
    if(!state.currentUser){
      openModal(`
        <h2 style="margin:0 0 8px">Giriş Gerekli</h2>
        <div style="padding:12px;border-radius:8px;background:var(--panel)">Oyun paylaşmak için önce giriş yapmalısınız.</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          <button id="openLoginFromCreate" style="padding:8px;border-radius:8px;border:1px solid #e6e7ea;background:var(--panel)">Giriş Yap</button>
          <button id="closeCreateNotice" class="play">Kapat</button>
        </div>
      `);

      // wire the modal buttons
      setTimeout(()=>{
        const openLoginBtn = document.getElementById('openLoginFromCreate');
        const closeNotice = document.getElementById('closeCreateNotice');
        if(openLoginBtn) openLoginBtn.addEventListener('click', ()=>{
          closeModal();
          const loginScreen = document.getElementById('loginScreen');
          loginScreen.setAttribute('aria-hidden','false');
          const loginChoice = document.getElementById('loginChoice');
          const loginFields = document.getElementById('loginFields');
          if(loginChoice) loginChoice.style.display = 'flex';
          if(loginFields) loginFields.style.display = 'none';
        });
        if(closeNotice) closeNotice.addEventListener('click', ()=> closeModal());
      }, 10);

      return;
    }

    // if logged in, show create form
    const formHtml = `
      <h2 style="margin:0 0 8px">Yeni Oyun Oluştur</h2>
      <form id="createGameForm" style="display:flex;flex-direction:column;gap:10px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:13px;color:var(--muted)">Kapak Görseli</div>
          <input id="newThumb" type="file" accept="image/*" />
          <img id="newThumbPreview" src="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;display:none;border:1px solid #e6e7ea" />
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:13px;color:var(--muted)">Başlık</div>
          <input id="newTitle" type="text" required placeholder="Oyunun başlığı" style="height:40px;border-radius:8px;border:1px solid #e6e7ea;padding:8px" />
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:13px;color:var(--muted)">Açıklama</div>
          <textarea id="newDesc" rows="3" placeholder="Kısa açıklama" style="border-radius:8px;border:1px solid #e6e7ea;padding:8px"></textarea>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:13px;color:var(--muted)">Oyun URL'si</div>
          <input id="newUrl" type="url" required placeholder="https://..." style="height:40px;border-radius:8px;border:1px solid #e6e7ea;padding:8px" />
        </label>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
          <button type="button" id="cancelCreate" style="padding:8px;border-radius:8px;border:1px solid #e6e7ea;background:var(--panel)">İptal</button>
          <button type="submit" class="play">Oluştur</button>
        </div>
      </form>
    `;
    openModal(formHtml);

    const thumbInput = document.getElementById('newThumb');
    const thumbPreview = document.getElementById('newThumbPreview');
    const createForm = document.getElementById('createGameForm');
    const cancelCreate = document.getElementById('cancelCreate');

    thumbInput.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f){ thumbPreview.src=''; thumbPreview.style.display='none'; thumbPreview.dataset.file = ''; return; }
      const url = URL.createObjectURL(f);
      thumbPreview.src = url;
      thumbPreview.style.display = 'block';
      // store file reference via element property (can't store File object in dataset)
      thumbPreview._file = f;
    });

    cancelCreate.addEventListener('click', ()=> closeModal());

    createForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const title = document.getElementById('newTitle').value.trim() || 'Yeni Oyun';
      const desc = document.getElementById('newDesc').value.trim() || '';
      const url = document.getElementById('newUrl').value.trim() || '';
      const thumbFile = (thumbPreview && thumbPreview._file) ? thumbPreview._file : null;

      const authorName = state.currentUser ? state.currentUser.name : 'Misafir';

      let uploadedThumbUrl = '';
      if(thumbFile){
        try{
          uploadedThumbUrl = await window.websim.upload(thumbFile);
        }catch(err){
          console.warn('Thumbnail upload failed', err);
          uploadedThumbUrl = '';
        }
      }

      const newGameRecord = {
        title,
        author: authorName,
        players: 0,
        color: `hsl(${Math.floor(Math.random()*360)} 70% 70%)`,
        description: desc,
        url,
        thumbUrl: uploadedThumbUrl
      };

      try{
        // persist to DB; id is autogenerated
        await room.collection('game').create(newGameRecord);
      }catch(err){
        console.warn('Failed to save game record', err);
        // fallback: add locally so user sees it immediately
        const tmp = {
          id: 'g' + Date.now(),
          ...newGameRecord
        };
        state.filtered.unshift(tmp);
        renderGrid();
      }

      state.page = 1;
      closeModal();
    }, { once: true });
  });

  window.addEventListener('keydown', (ev)=> {
    if(ev.key === 'Escape' && $('#modal').getAttribute('aria-hidden') === 'false') closeModal();
  });

  $all('.card').forEach(c=> c.addEventListener('touchstart', ()=> c.classList.add('touched')));

  updateLoginButton();
}

bind();