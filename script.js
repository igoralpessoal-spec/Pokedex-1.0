async function loadPokemon() {
  const res = await fetch("pokemon.json");
  const data = await res.json();

  const list = document.getElementById("pokemon-list");
  list.innerHTML = "";

  data.forEach(pokemon => {
    const card = document.createElement("article");
    card.className = "pokemon-card";

    card.innerHTML = `
      <span class="type ${pokemon.type}" data-type="${pokemon.type}">
        <i class="fas fa-circle"></i>
      </span>
      <img src="${pokemon.image}" alt="${pokemon.name}">
      <h3>${pokemon.name}</h3>
    `;

    list.appendChild(card);
  });

  // Sistema de busca
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", e => {
    const value = e.target.value.toLowerCase();
    document.querySelectorAll(".pokemon-card").forEach(card => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      card.style.display = name.includes(value) ? "flex" : "none";
    });
  });
}

loadPokemon();
