// ===========================
// STATE
// ===========================
const STATE = {
  allPokemon:  [],
  filtered:    [],
  favourites:  new Set(JSON.parse(localStorage.getItem('pokeFavs') || '[]')),
  page:        1,
  perPage:     24,
  query:       '',
  type:        '',
  sort:        'id-asc',
  showFavs:    false,
  debounce:    null,
  total:       1302,
  currentPoke: null,
};

// ===========================
// DOM
// ===========================
const grid        = document.getElementById('pokemonGrid');
const loader      = document.getElementById('loader');
const noResults   = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const searchHint  = document.getElementById('searchHint');
const sortSelect  = document.getElementById('sortSelect');
const typeChips   = document.getElementById('typeChips');
const prevBtn     = document.getElementById('prevBtn');
const nextBtn     = document.getElementById('nextBtn');
const pageInfo    = document.getElementById('pageInfo');
const countEl     = document.getElementById('pokemonCount');
const themeBtn    = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const favBtn      = document.getElementById('favToggleBtn');
const overlay     = document.getElementById('modalOverlay');
const modalClose  = document.getElementById('modalClose');
const modalFav    = document.getElementById('modalFav');
const modalContent= document.getElementById('modalContent');

// ===========================
// THEME
// ===========================
const savedTheme = localStorage.getItem('pokeTheme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pokeTheme', next);
  themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ===========================
// FETCH ALL POKEMON
// ===========================
async function fetchAll() {
  showLoader(true);
  try {
    const res  = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${STATE.total}&offset=0`);
    const data = await res.json();

    // map() + Promise.all HOF — parallel fetch
    const details = await Promise.all(
      data.results.map(p => fetchOne(p.url))
    );

    // filter() HOF — remove nulls
    STATE.allPokemon = details.filter(Boolean);
    applyFilters();

  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p style="color:#ff5252;grid-column:1/-1;text-align:center;padding:3rem;font-weight:800;">⚠️ Failed to load. Check connection and refresh.</p>`;
  } finally {
    showLoader(false);
  }
}

async function fetchOne(url) {
  try { const r = await fetch(url); return await r.json(); }
  catch { return null; }
}

// ===========================
// FETCH TYPES
// ===========================
async function fetchTypes() {
  try {
    const res  = await fetch('https://pokeapi.co/api/v2/type?limit=20');
    const data = await res.json();

    // filter() HOF
    data.results
      .filter(t => t.name !== 'unknown' && t.name !== 'shadow')
      .forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'type-chip';
        btn.dataset.type = t.name;
        btn.textContent = cap(t.name);
        btn.style.setProperty('--chip-color', typeColor(t.name));
        btn.addEventListener('click', () => {
          document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          STATE.type = t.name;
          applyFilters();
        });
        typeChips.appendChild(btn);
      });
  } catch (e) { console.error(e); }
}

// ===========================
// APPLY FILTERS — HOFs only
// ===========================
function applyFilters() {
  let list = [...STATE.allPokemon];

  // filter() — favourites
  if (STATE.showFavs) {
    list = list.filter(p => STATE.favourites.has(p.id));
  }

  // filter() — search
  if (STATE.query) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(STATE.query.toLowerCase())
    );
    searchHint.textContent = `${list.length} found`;
  } else {
    searchHint.textContent = '';
  }

  // filter() + some() — type
  if (STATE.type) {
    list = list.filter(p =>
      p.types.some(t => t.type.name === STATE.type)
    );
  }

  // sort() HOF
  list = list.sort((a, b) => {
    if (STATE.sort === 'id-asc')   return a.id - b.id;
    if (STATE.sort === 'id-desc')  return b.id - a.id;
    if (STATE.sort === 'name-asc') return a.name.localeCompare(b.name);
    if (STATE.sort === 'name-desc')return b.name.localeCompare(a.name);
    return 0;
  });

  STATE.filtered = list;
  STATE.page = 1;
  renderPage();
  updateCount(list.length);
  updatePager();
}

// ===========================
// RENDER
// ===========================
function renderPage() {
  const start = (STATE.page - 1) * STATE.perPage;
  renderGrid(STATE.filtered.slice(start, start + STATE.perPage));
}

function renderGrid(list) {
  grid.innerHTML = '';
  if (!list.length) { noResults.classList.remove('hidden'); return; }
  noResults.classList.add('hidden');
  list.map(p => buildCard(p)).forEach(c => grid.appendChild(c));
}

// ===========================
// BUILD CARD
// ===========================
function buildCard(p) {
  const type  = p.types[0].type.name;
  const color = typeColor(type);
  const img   = p.sprites.other['official-artwork'].front_default || p.sprites.front_default;
  const isFav = STATE.favourites.has(p.id);

  const card = document.createElement('div');
  card.className = 'poke-card';
  card.style.setProperty('--card-color', color);
  card.style.setProperty('--card-glow', color + '30');

  card.innerHTML = `
    <div class="card-img-area">
      <div class="card-img-bg bg-${type}"></div>
      <div class="card-img-circle"></div>
      <span class="card-id">#${pad(p.id)}</span>
      <img class="card-img" src="${img}" alt="${p.name}" loading="lazy"/>
      <button class="card-star ${isFav ? 'loved' : ''}" title="Favourite">
        ${isFav ? '★' : '☆'}
      </button>
    </div>
    <div class="card-body">
      <div class="card-name">${cap(p.name)}</div>
      <div class="card-types">
        ${p.types.map(t => `
          <div class="type-dot dot-${t.type.name}" title="${cap(t.type.name)}">
            ${typeEmoji(t.type.name)}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  card.addEventListener('click', e => {
    if (e.target.closest('.card-star')) return;
    openModal(p);
  });

  card.querySelector('.card-star').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(p.id, card.querySelector('.card-star'));
  });

  return card;
}

// ===========================
// TOGGLE FAVOURITE
// ===========================
function toggleFav(id, btn) {
  if (STATE.favourites.has(id)) {
    STATE.favourites.delete(id);
    btn.textContent = '☆';
    btn.classList.remove('loved');
  } else {
    STATE.favourites.add(id);
    btn.textContent = '★';
    btn.classList.add('loved');
  }
  localStorage.setItem('pokeFavs', JSON.stringify([...STATE.favourites]));
  if (STATE.showFavs) applyFilters();
}

// ===========================
// OPEN MODAL
// ===========================
function openModal(p) {
  STATE.currentPoke = p;
  const type1 = p.types[0].type.name;
  const color = typeColor(type1);
  const img   = p.sprites.other['official-artwork'].front_default || p.sprites.front_default;
  const isFav = STATE.favourites.has(p.id);

  modalFav.textContent = isFav ? '★' : '☆';
  modalFav.classList.toggle('loved', isFav);

  modalContent.innerHTML = `
    <div class="modal-hero">
      <div class="modal-hero-bg bg-${type1}"></div>
      <div class="modal-hero-overlay"></div>
      <img class="modal-hero-img" src="${img}" alt="${p.name}"/>
    </div>

    <div class="modal-info">

      <div class="modal-name-row">
        <span class="modal-name">${cap(p.name)}</span>
        <span class="modal-gender">♂</span>
      </div>

      <div class="modal-quick-stats">
        <div class="quick-stat">
          <span class="qs-val">${(p.height/10).toFixed(2)} M</span>
          <span class="qs-lbl">Height</span>
        </div>
        ${p.types.map(t => `
          <div class="quick-stat">
            <div class="qs-type-dot dot-${t.type.name}">${typeEmoji(t.type.name)}</div>
            <span class="qs-lbl">${cap(t.type.name)}</span>
          </div>
        `).join('')}
        <div class="quick-stat">
          <span class="qs-val">${(p.weight/10).toFixed(1)} KG</span>
          <span class="qs-lbl">Weight</span>
        </div>
      </div>

      <div class="modal-candy-row">
        <div class="candy-box">
          <span class="candy-icon">✦</span>
          <div>
            <span class="candy-val">${p.base_experience ?? 0}</span>
            <span class="candy-lbl">Base XP</span>
          </div>
        </div>
        <div class="candy-box">
          <span class="candy-icon">◉</span>
          <div>
            <span class="candy-val">${p.abilities.length}</span>
            <span class="candy-lbl">Abilities</span>
          </div>
        </div>
      </div>

      <div class="stat-section">
        ${p.stats.map(s => `
          <div class="stat-row">
            <span class="stat-name">${statShort(s.stat.name)}</span>
            <div class="stat-track">
              <div class="stat-fill" style="width:${Math.min(s.base_stat,150)/150*100}%;background:${statBarColor(s.stat.name, color)};"></div>
            </div>
            <span class="stat-num">${s.base_stat}</span>
          </div>
        `).join('')}
      </div>

      <div class="move-row">
        ${p.moves.slice(0,4).map(m => `
          <div class="move-chip">
            <div class="move-dot dot-${type1}">${typeEmoji(type1)}</div>
            <span>${cap(m.move.name.replace(/-/g,' '))}</span>
          </div>
        `).join('')}
      </div>

    </div>
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  STATE.currentPoke = null;
}

modalFav.addEventListener('click', () => {
  if (!STATE.currentPoke) return;
  toggleFav(STATE.currentPoke.id, modalFav);
});
modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===========================
// PAGINATION
// ===========================
function updatePager() {
  const total = Math.ceil(STATE.filtered.length / STATE.perPage);
  pageInfo.textContent = `${STATE.page} / ${Math.max(total,1)}`;
  prevBtn.disabled = STATE.page === 1;
  nextBtn.disabled = STATE.page >= total;
}

prevBtn.addEventListener('click', () => {
  if (STATE.page > 1) { STATE.page--; renderPage(); updatePager(); scrollTop(); }
});
nextBtn.addEventListener('click', () => {
  const total = Math.ceil(STATE.filtered.length / STATE.perPage);
  if (STATE.page < total) { STATE.page++; renderPage(); updatePager(); scrollTop(); }
});

// ===========================
// SEARCH debounce
// ===========================
searchInput.addEventListener('input', e => {
  clearTimeout(STATE.debounce);
  STATE.debounce = setTimeout(() => {
    STATE.query = e.target.value.trim();
    applyFilters();
  }, 400);
});

sortSelect.addEventListener('change', e => { STATE.sort = e.target.value; applyFilters(); });

favBtn.addEventListener('click', () => {
  STATE.showFavs = !STATE.showFavs;
  favBtn.classList.toggle('active', STATE.showFavs);
  favBtn.innerHTML = STATE.showFavs ? '♥ Show All' : '♥ Favs';
  applyFilters();
});

// ===========================
// HELPERS
// ===========================
function updateCount(n) {
  const isF = STATE.query || STATE.type || STATE.showFavs;
  countEl.textContent = isF
    ? `${n} of ${STATE.allPokemon.length} Pokémon`
    : `${STATE.allPokemon.length} Pokémon loaded`;
}

function showLoader(s)  { loader.classList.toggle('hidden', !s); }
function cap(s)         { return s.charAt(0).toUpperCase() + s.slice(1); }
function pad(id)        { return String(id).padStart(3,'0'); }
function scrollTop()    { window.scrollTo({top:0,behavior:'smooth'}); }

function statShort(name) {
  const m = { hp:'HP', attack:'Attack', defense:'Defense', 'special-attack':'Sp.Atk', 'special-defense':'Sp.Def', speed:'Speed' };
  return m[name] || cap(name);
}

function statBarColor(stat, fallback) {
  if (stat === 'hp')       return '#4ade80';
  if (stat === 'attack')   return '#fb923c';
  if (stat === 'defense')  return '#60a5fa';
  if (stat === 'speed')    return '#f472b6';
  return fallback || '#4ade80';
}

function typeColor(t) {
  const m = {
    fire:'#FF6B35', water:'#29B6F6', grass:'#4ade80', electric:'#FFD740',
    psychic:'#E040FB', ice:'#26C6DA', dragon:'#7C4DFF', dark:'#6A5F9E',
    fairy:'#F06292', normal:'#9E9E9E', fighting:'#EF6C00', flying:'#42A5F5',
    poison:'#AB47BC', ground:'#D4A558', rock:'#8D6E63', bug:'#8BC34A',
    ghost:'#5C6BC0', steel:'#90A4AE',
  };
  return m[t] || '#9E9E9E';
}

function typeEmoji(t) {
  const m = {
    fire:'🔥', water:'💧', grass:'🌿', electric:'⚡', psychic:'🔮',
    ice:'❄️', dragon:'🐉', dark:'🌑', fairy:'✨', normal:'⭕',
    fighting:'🥊', flying:'🌪️', poison:'☠️', ground:'🌍', rock:'🪨',
    bug:'🐛', ghost:'👻', steel:'⚙️',
  };
  return m[t] || '❓';
}

// ===========================
// INIT
// ===========================
async function init() {
  await fetchTypes();
  await fetchAll();
}

init();