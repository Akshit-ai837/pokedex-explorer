// ===========================
// STATE
// ===========================
const STATE = {
  allPokemon: [],       // all fetched pokemon for current page
  filteredPokemon: [],  // after search/filter/sort
  favourites: new Set(JSON.parse(localStorage.getItem('pokeFavourites') || '[]')),
  currentPage: 1,
  limit: 24,
  totalCount: 0,
  searchQuery: '',
  selectedType: '',
  sortOption: 'id-asc',
  showFavourites: false,
  debounceTimer: null,
};

// ===========================
// DOM ELEMENTS
// ===========================
const grid         = document.getElementById('pokemonGrid');
const loader       = document.getElementById('loader');
const noResults    = document.getElementById('noResults');
const searchInput  = document.getElementById('searchInput');
const typeFilter   = document.getElementById('typeFilter');
const sortSelect   = document.getElementById('sortSelect');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const pageInfo     = document.getElementById('pageInfo');
const pokemonCount = document.getElementById('pokemonCount');
const themeToggle  = document.getElementById('themeToggle');
const favToggleBtn = document.getElementById('favToggleBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');

// ===========================
// THEME
// ===========================
const savedTheme = localStorage.getItem('pokeTheme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pokeTheme', next);
});

// ===========================
// FETCH POKEMON LIST
// ===========================
async function fetchPokemonPage(page) {
  showLoader(true);
  grid.innerHTML = '';

  const offset = (page - 1) * STATE.limit;
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${STATE.limit}&offset=${offset}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    STATE.totalCount = data.count;

    // Fetch details for each pokemon in parallel
    const details = await Promise.all(
      data.results.map(p => fetchPokemonDetail(p.url))
    );

    STATE.allPokemon = details.filter(Boolean);
    applyFilters();

  } catch (err) {
    console.error('Error fetching Pokémon:', err);
    grid.innerHTML = `<p style="color:red;padding:2rem;">Failed to load Pokémon. Check your internet connection.</p>`;
  } finally {
    showLoader(false);
  }
}

// ===========================
// FETCH SINGLE POKEMON
// ===========================
async function fetchPokemonDetail(url) {
  try {
    const res  = await fetch(url);
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ===========================
// FETCH ALL TYPES (for filter)
// ===========================
async function fetchTypes() {
  try {
    const res  = await fetch('https://pokeapi.co/api/v2/type?limit=20');
    const data = await res.json();
    data.results.forEach(type => {
      const option = document.createElement('option');
      option.value = type.name;
      option.textContent = capitalize(type.name);
      typeFilter.appendChild(option);
    });
  } catch (err) {
    console.error('Error fetching types:', err);
  }
}

// ===========================
// APPLY FILTERS, SORT, SEARCH
// ===========================
function applyFilters() {
  let list = [...STATE.allPokemon];

  // Show favourites only
  if (STATE.showFavourites) {
    list = list.filter(p => STATE.favourites.has(p.id));
  }

  // Search using filter() HOF
  if (STATE.searchQuery) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(STATE.searchQuery.toLowerCase())
    );
  }

  // Type filter using filter() HOF
  if (STATE.selectedType) {
    list = list.filter(p =>
      p.types.some(t => t.type.name === STATE.selectedType)
    );
  }

  // Sort using sort() HOF
  list = list.sort((a, b) => {
    if (STATE.sortOption === 'id-asc')   return a.id - b.id;
    if (STATE.sortOption === 'id-desc')  return b.id - a.id;
    if (STATE.sortOption === 'name-asc') return a.name.localeCompare(b.name);
    if (STATE.sortOption === 'name-desc')return b.name.localeCompare(a.name);
    return 0;
  });

  STATE.filteredPokemon = list;
  renderGrid(list);
  updateStats(list.length);
  updatePagination();
}

// ===========================
// RENDER GRID
// ===========================
function renderGrid(list) {
  grid.innerHTML = '';

  if (list.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');

  // map() HOF to create card elements
  const cards = list.map(pokemon => createCard(pokemon));
  cards.forEach(card => grid.appendChild(card));
}

// ===========================
// CREATE CARD
// ===========================
function createCard(pokemon) {
  const primaryType = pokemon.types[0].type.name;
  const isFav = STATE.favourites.has(pokemon.id);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--type-color', getTypeColor(primaryType));

  card.innerHTML = `
    <div class="card-bg bg-${primaryType}">
      <span class="card-id">#${String(pokemon.id).padStart(3, '0')}</span>
      <img
        src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}"
        alt="${pokemon.name}"
        loading="lazy"
      />
      <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${pokemon.id}" title="Favourite">
        ${isFav ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="card-body">
      <div class="card-name">${capitalize(pokemon.name)}</div>
      <div class="types">
        ${pokemon.types.map(t => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join('')}
      </div>
    </div>
  `;

  // Click card → open modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) return;
    openModal(pokemon);
  });

  // Favourite button
  card.querySelector('.fav-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavourite(pokemon.id, card.querySelector('.fav-btn'));
  });

  return card;
}

// ===========================
// TOGGLE FAVOURITE
// ===========================
function toggleFavourite(id, btn) {
  if (STATE.favourites.has(id)) {
    STATE.favourites.delete(id);
    btn.textContent = '🤍';
    btn.classList.remove('active');
  } else {
    STATE.favourites.add(id);
    btn.textContent = '❤️';
    btn.classList.add('active');
  }
  // Save to localStorage
  localStorage.setItem('pokeFavourites', JSON.stringify([...STATE.favourites]));

  if (STATE.showFavourites) applyFilters();
}

// ===========================
// MODAL
// ===========================
function openModal(pokemon) {
  const primaryType = pokemon.types[0].type.name;

  modalContent.innerHTML = `
    <div class="modal-header bg-${primaryType}">
      <img class="modal-img" src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}" />
      <div class="modal-header-info">
        <div class="modal-id">#${String(pokemon.id).padStart(3, '0')}</div>
        <h2>${capitalize(pokemon.name)}</h2>
        <div class="types">
          ${pokemon.types.map(t => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-body">
      <h3>Base Stats</h3>
      ${pokemon.stats.map(s => `
        <div class="stat-row">
          <span class="stat-label">${s.stat.name.replace('-', ' ')}</span>
          <div class="stat-bar-bg">
            <div class="stat-bar-fill" style="width: ${Math.min(s.base_stat, 150) / 150 * 100}%"></div>
          </div>
          <span class="stat-value">${s.base_stat}</span>
        </div>
      `).join('')}

      <h3 style="margin-top:1rem;">Abilities</h3>
      <div class="abilities-list">
        ${pokemon.abilities.map(a => `<span class="ability-badge">${a.ability.name.replace('-', ' ')}</span>`).join('')}
      </div>

      <h3 style="margin-top:1rem;">Info</h3>
      <div class="stat-row">
        <span class="stat-label">Height</span>
        <span style="font-weight:700">${(pokemon.height / 10).toFixed(1)} m</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Weight</span>
        <span style="font-weight:700">${(pokemon.weight / 10).toFixed(1)} kg</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Base XP</span>
        <span style="font-weight:700">${pokemon.base_experience ?? 'N/A'}</span>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===========================
// PAGINATION
// ===========================
function updatePagination() {
  const totalPages = Math.ceil(STATE.totalCount / STATE.limit);
  pageInfo.textContent = `Page ${STATE.currentPage} of ${totalPages}`;
  prevBtn.disabled = STATE.currentPage === 1;
  nextBtn.disabled = STATE.currentPage >= totalPages;
}

prevBtn.addEventListener('click', () => {
  if (STATE.currentPage > 1) {
    STATE.currentPage--;
    fetchPokemonPage(STATE.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

nextBtn.addEventListener('click', () => {
  STATE.currentPage++;
  fetchPokemonPage(STATE.currentPage);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===========================
// SEARCH (with debounce)
// ===========================
searchInput.addEventListener('input', (e) => {
  clearTimeout(STATE.debounceTimer);
  STATE.debounceTimer = setTimeout(() => {
    STATE.searchQuery = e.target.value.trim();
    applyFilters();
  }, 400);
});

// ===========================
// TYPE FILTER
// ===========================
typeFilter.addEventListener('change', (e) => {
  STATE.selectedType = e.target.value;
  applyFilters();
});

// ===========================
// SORT
// ===========================
sortSelect.addEventListener('change', (e) => {
  STATE.sortOption = e.target.value;
  applyFilters();
});

// ===========================
// FAVOURITES TOGGLE
// ===========================
favToggleBtn.addEventListener('click', () => {
  STATE.showFavourites = !STATE.showFavourites;
  favToggleBtn.classList.toggle('active', STATE.showFavourites);
  favToggleBtn.textContent = STATE.showFavourites ? '❤️ Show All' : '❤️ Show Favourites';
  applyFilters();
});

// ===========================
// STATS BAR
// ===========================
function updateStats(count) {
  pokemonCount.textContent = `Showing ${count} Pokémon`;
}

// ===========================
// LOADER
// ===========================
function showLoader(show) {
  loader.classList.toggle('hidden', !show);
}

// ===========================
// HELPERS
// ===========================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTypeColor(type) {
  const colors = {
    fire: '#FF6B35', water: '#4FC3F7', grass: '#66BB6A',
    electric: '#FFD600', psychic: '#EC407A', ice: '#4DD0E1',
    dragon: '#7C4DFF', dark: '#4A4A6A', fairy: '#F48FB1',
    normal: '#A5A5A5', fighting: '#D84315', flying: '#90CAF9',
    poison: '#AB47BC', ground: '#D4A558', rock: '#9E9E6A',
    bug: '#8BC34A', ghost: '#5C6BC0', steel: '#B0BEC5',
  };
  return colors[type] || '#888';
}

// ===========================
// INIT
// ===========================
async function init() {
  await fetchTypes();
  await fetchPokemonPage(STATE.currentPage);
}

init();