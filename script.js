const POKEMON_PER_LOAD = 10;
const API_URL = "https://pokeapi.co/api/v2/pokemon";
let currentOffset = 0;
let favoriteIds = [];
let currentView = 'pokemons';

let currentLoadedPokemon = []; 
let totalPokemonCount = 0; 

const grid = document.getElementById('pokedex-list');
const favoritesGrid = document.getElementById('favorites-list');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchInput = document.getElementById('pokemon-search');
const typeFiltersContainer = document.getElementById('type-filters');
const emptyFavoritesMsg = document.getElementById('empty-favorites-message');
const mainNavLinks = document.querySelectorAll('.main-nav a');
const filtersSection = document.querySelector('.filters-section');
const favoritesTitle = document.getElementById('favorites-title'); 
const searchButton = document.querySelector('.search-button');
const favEmpty = document.getElementById('fav-empty');

// Variáveis para o modal
const pokemonDetailsModal = document.getElementById('pokemon-details-modal');
const modalContent = document.getElementById('pokemon-details');
const closeButton = document.querySelector('.close-button');


const allTypes = [
    'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting',
    'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost',
    'Dragon', 'Steel', 'Dark', 'Fairy'
];

function getTypeColor(type) {
    const colors = {
        normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850',
        electric: '#F8D030', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
        ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
        rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', steel: '#B8B8D0',
        dark: '#705848', fairy: '#EE99AC',
    };
    return colors[type.toLowerCase()] || '#888888';
}

// Função auxiliar para capitalizar o nome
const formatName = (name) => name.charAt(0).toUpperCase() + name.slice(1);

function loadFavorites() {
    const storedFavorites = localStorage.getItem('pokemonFavorites');
    favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];
}

function saveFavorites() {
      localStorage.setItem('pokemonFavorites', JSON.stringify(favoriteIds));
}

function toggleFavorite(pokemonId) {
      const id = Number(pokemonId);
      const index = favoriteIds.indexOf(id);

      if (index === -1) {
            favoriteIds.push(id);
      } else {
            favoriteIds.splice(index, 1);
      }

      saveFavorites();

      document.querySelectorAll(`.favorite-toggle[data-id="${id}"]`).forEach(heartIcon => {
            const isFav = favoriteIds.includes(id);
            heartIcon.classList.toggle('is-favorite', isFav);
            heartIcon.textContent = isFav ? '❤️' : '🤍';
      });

      if (currentView === 'favoritos') {
            renderFavorites();
      }
}


function createPokemonCard(pokemon) {
      const card = document.createElement('div');
      card.setAttribute('data-id', pokemon.id);
      card.classList.add('pokemon-card');
      
      card.addEventListener('click', () => {
          openPokemonDetails(pokemon.id, pokemon.name); 
      }); 

      const isFav = favoriteIds.includes(pokemon.id);
      const pokemonTypes = Array.isArray(pokemon.type) ? pokemon.type : [pokemon.type];

      const typeHTML = pokemonTypes.map(type => `
            <span class="card-type" style="background-color: ${getTypeColor(type)};">
                  ${type.toUpperCase()}
            </span>
      `).join('');

      card.innerHTML = `
            <span class="favorite-toggle ${isFav ? 'is-favorite' : ''}" data-id="${pokemon.id}">
                  ${isFav ? '❤️' : '🤍'}
            </span>
            <span class="card-id">#${String(pokemon.id).padStart(3, '0')}</span>
            <div class="card-image-container">
                  <img class="card-image" src="${pokemon.image_url}" alt="${pokemon.name}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/150?text=No+Image'">
            </div>
            <h3 class="card-name">${pokemon.name}</h3>
            <div class="card-types">
                  ${typeHTML}
            </div>
      `;

      const favButton = card.querySelector('.favorite-toggle');
      favButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleFavorite(pokemon.id);
      });

      return card;
}


function renderTypeButtons() {
      if (typeFiltersContainer) typeFiltersContainer.innerHTML = '';

      const renderButton = (type, isActive = false) => {
            const button = document.createElement('button');
            button.textContent = type.toUpperCase();
            button.classList.add('type-button');
            if (isActive) button.classList.add('active');
            button.setAttribute('data-type', type.toLowerCase());
            button.addEventListener('click', handleFilter);
            if (typeFiltersContainer) typeFiltersContainer.appendChild(button);
      };

      renderButton('todos', true);
      allTypes.forEach(type => renderButton(type));
}

function handleFilter(event) {
      if (searchInput) searchInput.value = '';

      document.querySelectorAll('.type-button').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      const type = event.target.getAttribute('data-type');
      const dataToFilter = currentLoadedPokemon;

      if (type === 'todos') {
            loadPokemon(dataToFilter, true); 
            return;
      }

      const filteredPokemon = dataToFilter.filter(pokemon =>
            Array.isArray(pokemon.type) && pokemon.type.map(t => t.toLowerCase()).includes(type)
      );

      loadPokemon(filteredPokemon, true);
}


function handleSearchButton() {
      // Limpa filtros de tipo
      document.querySelectorAll('.type-button').forEach(btn => btn.classList.remove('active'));
      const allBtn = document.querySelector('.type-button[data-type="todos"]');
      if (allBtn) allBtn.classList.add('active');

      const searchTerm = searchInput.value.toLowerCase().trim();

      if (searchTerm.length === 0) {
            // Retorna à lista completa carregada
            if (currentOffset < totalPokemonCount) {
                    if (loadMoreBtn) loadMoreBtn.style.display = 'block';
            }
            loadPokemon(currentLoadedPokemon, true); 
            return;
      }

      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      if (grid) grid.innerHTML = '<div class="loading-indicator">Filtrando Pokédex...</div>';


      // Busca por Substring: Filtra localmente nos Pokémons já carregados.
      const filteredPokemon = currentLoadedPokemon.filter(pokemon => {
            const nameMatch = pokemon.name.toLowerCase().includes(searchTerm);
            const idMatch = String(pokemon.id) === searchTerm; 
            return nameMatch || idMatch;
      });

      if (grid) grid.innerHTML = '';
      
      if (filteredPokemon.length > 0) {
            loadPokemon(filteredPokemon, true);
      } else {
            if (grid) grid.innerHTML = `
                  <p style="color: #FF6347; text-align: center; padding: 50px;">
                        Nenhum Pokémon encontrado com o termo "${searchTerm}" nos dados carregados.
                  </p>`;
      }
}


// Função auxiliar para buscar um único Pokémon, não usada na busca principal por substring.
async function fetchSinglePokemon(searchTerm) {
      try {
            const response = await fetch(`${API_URL}/${searchTerm}`);
            
            if (!response.ok) {
                  if (response.status === 404) return null;
                  throw new Error(`Erro de rede: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                  id: data.id,
                  name: formatName(data.name), 
                  image_url: data.sprites.other['official-artwork']?.front_default || data.sprites.front_default,
                  type: data.types.map(typeInfo => formatName(typeInfo.type.name))
            };

      } catch (error) {
            console.error("Erro na busca direta da API:", error);
            return null;
      }
}


function loadPokemon(data, clearGrid = false) { 
      currentView = 'pokemons';
      
      if (filtersSection) filtersSection.style.display = 'block'; 
      if (grid) grid.style.display = 'grid';
      if (favoritesGrid) favoritesGrid.style.display = 'none';
      if (emptyFavoritesMsg) emptyFavoritesMsg.style.display = 'none';
      if (favoritesTitle) favoritesTitle.style.display = 'none';
      if (favEmpty) favEmpty.style.display = 'none';

      if (clearGrid) { 
            if (grid) grid.innerHTML = '';
      }
      
      if (!grid) return; 

      data.forEach(pokemon => {
            grid.appendChild(createPokemonCard(pokemon));
      });

      const isFiltered = data !== currentLoadedPokemon;

      if (isFiltered || currentLoadedPokemon.length >= totalPokemonCount) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      } else {
            if (loadMoreBtn) loadMoreBtn.style.display = 'block';
      }
}

function renderFavorites() {
      currentView = 'favoritos';
      
      if (filtersSection) filtersSection.style.display = 'none';
      if (grid) grid.style.display = 'none';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      
      if (favoritesTitle) favoritesTitle.style.display = 'block';
      if (favoritesGrid) favoritesGrid.innerHTML = ''; 
      if (favEmpty) favEmpty.style.display = 'block';

      // Filtra apenas os favoritos que já foram carregados
      const favoritePokemon = currentLoadedPokemon.filter(pokemon => favoriteIds.includes(pokemon.id));
      
      if (!favoritesGrid) return; 
      const hasFavorites = favoritePokemon.length > 0;
      if (emptyFavoritesMsg) emptyFavoritesMsg.style.display = hasFavorites ? 'none' : 'block';
      favoritesGrid.style.display = hasFavorites ? 'grid' : 'none';

      if(favoritePokemon != 0){
        favEmpty.style.display = 'none';
      }

      if (hasFavorites) {
            favoritePokemon.forEach(pokemon => {
                  favoritesGrid.appendChild(createPokemonCard(pokemon));
            });
      }
}

function renderHome() {
      currentView = 'home';
      
      if (filtersSection) filtersSection.style.display = 'block';
      if (grid) grid.style.display = 'grid';
      
      if (favoritesGrid) favoritesGrid.style.display = 'none';
      if (emptyFavoritesMsg) emptyFavoritesMsg.style.display = 'none';
      if (favoritesTitle) favoritesTitle.style.display = 'none';
      if (favEmpty) favEmpty.style.display = 'none';
}


async function fetchPokemonData(limit = POKEMON_PER_LOAD, offset = 0, clearGrid = false) {
      if (clearGrid) {
            if (grid) grid.innerHTML = '<div class="loading-indicator">Carregando Pokédex...</div>';
            currentLoadedPokemon = [];
            currentOffset = 0;
      }

      if (currentLoadedPokemon.length === 0 && grid) {
            grid.innerHTML = '<div class="loading-indicator">Carregando Pokédex...</div>';
      } else {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      }


      try {
            const listResponse = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);
            
            if (!listResponse.ok) {
                  throw new Error(`Erro de Rede ao buscar lista: Status ${listResponse.status}`);
            }

            const listData = await listResponse.json();
            const results = listData.results; 
            totalPokemonCount = listData.count; 

            // Busca paralela de detalhes
            const detailPromises = results.map(pokemon => fetch(pokemon.url).then(res => res.json()));
            const detailData = await Promise.all(detailPromises);
            
            const formattedPokemonData = detailData.map(data => ({
                  id: data.id,
                  name: formatName(data.name), 
                  image_url: data.sprites.other['official-artwork']?.front_default || data.sprites.front_default,
                  type: data.types.map(typeInfo => formatName(typeInfo.type.name))
            }));

            // Atualiza o estado da paginação
            currentLoadedPokemon = currentLoadedPokemon.concat(formattedPokemonData);
            currentOffset += formattedPokemonData.length; 

            if (clearGrid) {
                    if (grid) grid.innerHTML = '';
                    loadPokemon(currentLoadedPokemon, true); 
            } else {
                    loadPokemon(formattedPokemonData, false); 
            }

            renderTypeButtons();

            if (currentOffset < totalPokemonCount) {
                  if (loadMoreBtn) loadMoreBtn.style.display = 'block';
            } else {
                  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }


      } catch (error) {
            console.error("Houve um erro no fetch de dados:", error);
            if (grid) grid.innerHTML =
                  `<p style="color: #FF6347; text-align: center; padding: 50px;">
                        Erro ao carregar dados da Pokédex.
                  </p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            if (typeFiltersContainer) typeFiltersContainer.style.display = 'none';
            if (searchInput) searchInput.parentElement.style.display = 'none';
      }
}


function smoothScrollTo(elementId) {
      const targetElement = document.getElementById(elementId);
      if (!targetElement) return;

      const headerElement = document.querySelector('.main-content-card .main-header');
      const headerHeight = headerElement ? headerElement.offsetHeight + 30 : 0;
      const cardContainer = document.querySelector('.main-content-card');
      const targetPosition = targetElement.offsetTop - headerHeight;

      if (cardContainer) {
            cardContainer.scrollTo({ top: targetPosition, behavior: 'smooth' });
      } else {
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
}


// Função para buscar a cadeia de evolução (Recursiva)
async function fetchEvolutionChain(chainUrl) {
    try {
        const response = await fetch(chainUrl);
        const data = await response.json();

        const getIdFromUrl = (url) => {
            const parts = url.split('/');
            return parts[parts.length - 2];
        };

        let currentStage = data.chain;
        const evolutionChain = [];

        while(currentStage) {
            const speciesName = currentStage.species.name;
            const pokemonId = getIdFromUrl(currentStage.species.url);
            
            const detailResponse = await fetch(`${API_URL}/${pokemonId}`);
            const detailData = await detailResponse.json();
            
            evolutionChain.push({
                id: Number(pokemonId),
                name: formatName(speciesName),
                image_url: detailData.sprites.other['official-artwork']?.front_default || detailData.sprites.front_default,
            });

            currentStage = currentStage.evolves_to.length > 0 ? currentStage.evolves_to[0] : null;
        }

        return evolutionChain;

    } catch (error) {
        console.error("Erro ao buscar cadeia de evolução:", error);
        return [];
    }
}

// Função para renderizar as estatísticas como barras
function renderStats(stats) {
    const maxStatValue = 255; 

    return stats.map(s => {
        const value = s.base_stat;
        const percent = (value / maxStatValue) * 100;
        const statName = s.stat.name.toUpperCase().replace('-', ' ');

        return `
            <div class="stat-bar-container">
                <div class="stat-label">
                    <span>${statName}</span>
                    <span>${value}</span>
                </div>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${percent}%; animation: loadBar 1s ease-out forwards;"></div>
                </div>
            </div>
        `;
    }).join('');
}


// Função principal para abrir os detalhes do Pokémon
async function openPokemonDetails(pokemonId, pokemonName) {
    if (!pokemonDetailsModal || !modalContent) return;

    modalContent.innerHTML = '<div class="loading-indicator" style="text-align: center; color: var(--color-accent-orange); padding: 50px;">Carregando detalhes de ' + pokemonName + '...</div>';
    pokemonDetailsModal.style.display = 'block';

    try {
        // 1. Busca os detalhes principais (Stats, Species)
        const detailsResponse = await fetch(`${API_URL}/${pokemonId}`);
        const detailsData = await detailsResponse.json();

        const speciesResponse = await fetch(detailsData.species.url);
        const speciesData = await speciesResponse.json();
        
        // 2. Processamento de Dados Adicionais

        // A. Descrição (Flavor Text)
        const flavorTextEntry = speciesData.flavor_text_entries.find(entry => 
            entry.language.name === 'en' || entry.language.name === 'pt' // Busca inglês como fallback
        ) || speciesData.flavor_text_entries[0];
        
        const description = flavorTextEntry 
            ? flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ') // Remove quebras de linha
            : 'Descrição não disponível.';

        // B. Altura e Peso (Convertendo dm para metros e hg para kg)
        const heightMeters = (detailsData.height / 10).toFixed(1); // dm para metros
        const weightKg = (detailsData.weight / 10).toFixed(1); // hg para kg

        // C. Habilidades
        const abilitiesHTML = detailsData.abilities.map(abilityInfo => {
            const name = formatName(abilityInfo.ability.name);
            const isHidden = abilityInfo.is_hidden ? ' (Oculta)' : '';
            return `<li class="ability-item">${name}${isHidden}</li>`;
        }).join('');


        // 3. Busca a cadeia de evolução
        const evolutionChainUrl = speciesData.evolution_chain.url;
        const evolutionChain = await fetchEvolutionChain(evolutionChainUrl);
        
        // Formatação do HTML da Evolução
        const evolutionHTML = evolutionChain.map((evo, index, arr) => {
            let arrow = index < arr.length - 1 ? '<span class="evo-arrow">⟶</span>' : '';
            const isCurrent = evo.id === pokemonId;
            
            const evoCard = `
                <div class="evolution-stage ${isCurrent ? 'current-evo' : ''}" data-id="${evo.id}" data-name="${evo.name}">
                    <div class="evo-image-container">
                        <img class="evo-image" src="${evo.image_url}" alt="${evo.name}">
                    </div>
                    <span class="evo-name">${evo.name}</span>
                </div>
            `;
            
            return evoCard + arrow;
        }).join('');
        
        const typeHTML = detailsData.types.map(typeInfo => {
            const type = formatName(typeInfo.type.name);
            return `<span class="card-type" style="background-color: ${getTypeColor(type)};">${type.toUpperCase()}</span>`;
        }).join('');

        // 4. Monta o HTML final do modal com os novos dados
        modalContent.innerHTML = `
            <div class="details-content">
                <div class="details-basic-info">
                    <h2 class="details-name">${formatName(detailsData.name)}</h2>
                    <p class="details-id">#${String(detailsData.id).padStart(3, '0')}</p>
                    <img class="details-image" src="${detailsData.sprites.other['official-artwork']?.front_default || detailsData.sprites.front_default}" alt="${detailsData.name}">
                    <div class="details-types">${typeHTML}</div>
                    
                    <div class="details-physical-info">
                        <div class="physical-item">
                            <h4>Altura</h4>
                            <p>${heightMeters} m</p>
                        </div>
                        <div class="physical-item">
                            <h4>Peso</h4>
                            <p>${weightKg} kg</p>
                        </div>
                    </div>
                    
                    <div class="details-description">
                        <h3>Sobre</h3>
                        <p>${description}</p>
                    </div>
                </div>

                <div class="details-stats-evolution">
                    <div class="details-stats">
                        <h3>Estatísticas Base</h3>
                        ${renderStats(detailsData.stats)}
                    </div>
                    
                    <div class="details-abilities">
                        <h3>Habilidades</h3>
                        <ul class="abilities-list">
                            ${abilitiesHTML}
                        </ul>
                    </div>

                    <div class="evolution-chain">
                        <h3>Cadeia de Evolução</h3>
                        <div class="evolution-line">
                            ${evolutionHTML}
                        </div>
                    </div>
                </div>
            </div>
            `;
        
        // Adiciona listeners de clique aos cards de evolução dentro do modal
        document.querySelectorAll('.evolution-stage').forEach(evoElement => {
            evoElement.addEventListener('click', (e) => {
                const id = Number(evoElement.getAttribute('data-id'));
                const name = evoElement.getAttribute('data-name');
                openPokemonDetails(id, name); // Abre os detalhes do Pokémon clicado
            });
        });

    } catch (error) {
        console.error("Erro ao carregar detalhes do Pokémon:", error);
        modalContent.innerHTML = '<p style="color: #FF6347; text-align: center; padding: 50px;">Não foi possível carregar os detalhes do Pokémon.</p>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
      loadFavorites();
      fetchPokemonData(POKEMON_PER_LOAD, 0, true); 

      if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                  const isFiltered = document.querySelector('.type-button.active')?.getAttribute('data-type') !== 'todos' || searchInput?.value.trim() !== '';

                  if (!isFiltered) {
                        fetchPokemonData(POKEMON_PER_LOAD, currentOffset, false);
                  }
            });
      }

    // Event listeners para a busca por botão/Enter (Substring Local)
    if (searchButton) {
        searchButton.addEventListener('click', handleSearchButton);
    }
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleSearchButton();
            }
        });
    }
    
    // Listeners para fechar o modal
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            pokemonDetailsModal.style.display = 'none';
        });
    }

    if (pokemonDetailsModal) {
        window.addEventListener('click', (event) => {
            if (event.target === pokemonDetailsModal) {
                pokemonDetailsModal.style.display = 'none';
            }
        });
    }


mainNavLinks.forEach(link => {
      link.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            const sectionId = this.getAttribute('href').substring(1);
            
            // Lógica de navegação
            if (sectionId === 'pokemons' || sectionId === 'home') {
                  renderHome(); 
                  if (searchInput) searchInput.value = '';
                  loadPokemon(currentLoadedPokemon, true);
            } else if (sectionId === 'favoritos') {
                  loadFavorites();
                  renderFavorites(); 
            }

            smoothScrollTo(sectionId);

            mainNavLinks.forEach(a => a.classList.remove('active'));
            this.classList.add('active');
      });
});

      const ctaButton = document.querySelector('.hero-cta-button');
      if(ctaButton) {
            ctaButton.addEventListener('click', function() {
                  smoothScrollTo('pokemons');
                  
                  mainNavLinks.forEach(a => a.classList.remove('active'));
                  document.querySelector('.main-nav a[data-section="pokemons"]').classList.add('active');
            });
      }
});