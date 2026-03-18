// UTILITIES FOR MOVIE STORAGE

const STORAGE_KEY = "flakes_movies_data";

function loadMovieData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { movies: {}, lists: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      movies: parsed.movies || {},
      lists: parsed.lists || {},
    };
  } catch (e) {
    console.error("Failed to load movie data", e);
    return { movies: {}, lists: {} };
  }
}

function saveMovieData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getMovieIdKey(tmdbId, type) {
  return `${type}-${tmdbId}`;
}

// RENDER LISTS ON HOME PAGE (DYNAMIC)

function renderDynamicLists() {
  const data = loadMovieData();
  const root = document.getElementById("dynamic-lists-root");
  if (!root) return;

  root.innerHTML = "";

  const listNames = Object.keys(data.lists);
  if (listNames.length === 0) {
    return;
  }

  listNames.forEach((listName) => {
    const movieIds = data.lists[listName] || [];
    if (movieIds.length === 0) return;

    const container = document.createElement("div");
    container.className = "movie-list-container";

    const titleEl = document.createElement("h1");
    titleEl.className = "movie-list-title";
    titleEl.textContent = listName;
    container.appendChild(titleEl);

    const wrapper = document.createElement("div");
    wrapper.className = "movie-list-wrapper";

    const listEl = document.createElement("div");
    listEl.className = "movie-list";

    movieIds.forEach((movieKey) => {
      const movie = data.movies[movieKey];
      if (!movie) return;

      const item = document.createElement("div");
      item.className = "movie-list-item";
      item.dataset.movieKey = movieKey;
      item.addEventListener("click", () => {
        window.location.href = `player.html?key=${encodeURIComponent(
          movieKey
        )}`;
      });

      const img = document.createElement("img");
      img.className = "movie-list-item-img";
      img.src = movie.posterUrl || "img/1.jpeg";
      img.alt = movie.title || "";

      const title = document.createElement("span");
      title.className = "movie-list-item-title";
      title.textContent = movie.title || "Untitled";

      const desc = document.createElement("p");
      desc.className = "movie-list-item-desc";
      desc.textContent =
        movie.overview ||
        "No description available for this title yet.";

      const btn = document.createElement("button");
      btn.className = "movie-list-item-button";
      btn.textContent = "Watch";

      // Button click also navigates, but main click is on whole card

      item.appendChild(img);
      item.appendChild(title);
      item.appendChild(desc);
      item.appendChild(btn);
      listEl.appendChild(item);
    });

    wrapper.appendChild(listEl);
    container.appendChild(wrapper);
    root.appendChild(container);
  });
}

// SEARCH

function performSearch(query) {
  const trimmed = query.trim().toLowerCase();
  const resultsContainer = document.getElementById("search-results-container");
  const resultsList = document.getElementById("search-results");
  if (!resultsContainer || !resultsList) return;

  if (!trimmed) {
    resultsContainer.style.display = "none";
    resultsList.innerHTML = "";
    return;
  }

  const data = loadMovieData();
  const allMovies = Object.entries(data.movies);
  const matches = allMovies.filter(([key, movie]) => {
    const title = (movie.title || "").toLowerCase();
    return title.includes(trimmed);
  });

  resultsList.innerHTML = "";

  if (matches.length === 0) {
    resultsContainer.style.display = "none";
    return;
  }

  matches.forEach(([movieKey, movie]) => {
    const item = document.createElement("div");
    item.className = "movie-list-item";
    item.dataset.movieKey = movieKey;
    item.addEventListener("click", () => {
      window.location.href = `player.html?key=${encodeURIComponent(movieKey)}`;
    });

    const img = document.createElement("img");
    img.className = "movie-list-item-img";
    img.src = movie.posterUrl || "img/1.jpeg";
    img.alt = movie.title || "";

    const title = document.createElement("span");
    title.className = "movie-list-item-title";
    title.textContent = movie.title || "Untitled";

    const desc = document.createElement("p");
    desc.className = "movie-list-item-desc";
    desc.textContent =
      movie.overview || "No description available for this title yet.";

    const btn = document.createElement("button");
    btn.className = "movie-list-item-button";
    btn.textContent = "Watch";

    // Button inherits card click; no separate handler needed

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(desc);
    item.appendChild(btn);
    resultsList.appendChild(item);
  });

  resultsContainer.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  renderDynamicLists();

  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");

  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        performSearch(searchInput.value);
      }
    });
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener("click", () => {
      performSearch(searchInput.value);
    });
  }
});
