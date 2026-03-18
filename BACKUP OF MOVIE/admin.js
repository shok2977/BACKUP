const ADMIN_ID = "Adityasharma123";
const ADMIN_PASSWORD = "Aditya@sharma2977";
const TMDB_API_KEY = "e84730516a1d5987f96fd63d46d2f119";
const STORAGE_KEY = "flakes_movies_data";

function loadMovieData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { movies: {}, lists: {} };
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

function ensureDefaultLists(data) {
  const defaults = ["Anime", "New Releases", "Hidden Gems", "Best", "Top 10"];
  if (!data.lists) data.lists = {};
  defaults.forEach((name) => {
    if (!data.lists[name]) data.lists[name] = [];
  });
  return data;
}

function setAuth(state) {
  if (state) sessionStorage.setItem("flakes_admin_auth", "1");
  else sessionStorage.removeItem("flakes_admin_auth");
}

function isAuthed() {
  return sessionStorage.getItem("flakes_admin_auth") === "1";
}

function switchSection(targetId) {
  document.querySelectorAll(".admin-section").forEach((s) => {
    s.classList.toggle("admin-section-active", s.id === targetId);
  });
  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-section") === targetId);
  });
}

function renderDashboard() {
  const data = loadMovieData();
  const totalTitlesEl = document.getElementById("stat-total-titles");
  const totalListsEl = document.getElementById("stat-total-lists");
  const recentListEl = document.getElementById("admin-recent-list");

  const movieKeys = Object.keys(data.movies);
  const listNames = Object.keys(data.lists);

  if (totalTitlesEl) totalTitlesEl.textContent = movieKeys.length;
  if (totalListsEl) totalListsEl.textContent = listNames.length;

  if (!recentListEl) return;
  recentListEl.innerHTML = "";

  if (movieKeys.length === 0) {
    recentListEl.innerHTML =
      '<p class="admin-empty">No titles added yet. Add your first movie, anime or TV show.</p>';
    return;
  }

  const table = document.createElement("div");
  table.className = "admin-table-inner";
  const header = document.createElement("div");
  header.className = "admin-table-row admin-table-header";
  header.innerHTML = `
    <div>Title</div>
    <div>Type</div>
    <div>TMDB ID</div>
    <div>Seasons/Episodes</div>
    <div></div>
  `;
  table.appendChild(header);

  const recentKeys = movieKeys.slice(-10).reverse();
  recentKeys.forEach((key) => {
    const m = data.movies[key];
    let epInfo = "-";
    if ((m.type === "tv" || m.type === "anime") && m.seasons && m.seasons.length) {
      const total = m.seasons.reduce((s, x) => s + (x.episodes ? x.episodes.length : 0), 0);
      epInfo = `${m.seasons.length} S · ${total} E`;
    }
    const row = document.createElement("div");
    row.className = "admin-table-row";
    row.innerHTML = `
      <div>${m.title || "Untitled"}</div>
      <div>${m.type || "-"}</div>
      <div>${m.tmdbId || "-"}</div>
      <div>${epInfo}</div>
      <div>
        <button class="admin-secondary-btn admin-edit-btn" data-key="${key}">Edit</button>
        <button class="admin-delete-btn" data-key="${key}">Delete</button>
      </div>
    `;
    table.appendChild(row);
  });
  recentListEl.appendChild(table);
}

let currentEditMovieKey = null;
let currentDownloadEpisodesSeasons = null;
let currentDownloadEpisodesTmdb = null;

function episodeKey(seasonNumber, episodeNumber) {
  return `s${seasonNumber}_e${episodeNumber}`;
}

function buildLanguageRow(lang) {
  const row = document.createElement("div");
  row.className = "admin-language-row";
  row.innerHTML = `
    <div class="admin-language-fields">
      <input
        type="text"
        class="admin-input edit-lang-name"
        placeholder="Language name (e.g. Hindi)"
        value="${lang?.name ? String(lang.name).replace(/"/g, "&quot;") : ""}"
      />
      <textarea
        class="admin-input edit-lang-script"
        placeholder="Paste Fluid Player embed script for this language"
        rows="4"
      ></textarea>
    </div>
    <div class="admin-language-actions">
      <button type="button" class="admin-delete-btn edit-lang-remove">Remove</button>
    </div>
  `;
  const textarea = row.querySelector(".edit-lang-script");
  if (textarea) textarea.value = lang?.script || "";
  return row;
}

function openEditMovie(key) {
  const data = loadMovieData();
  const movie = data.movies[key];
  if (!movie) return;

  currentEditMovieKey = key;

  const titleEl = document.getElementById("edit-movie-title");
  const listEl = document.getElementById("edit-movie-languages");

  if (titleEl) {
    titleEl.textContent = movie.title || "Untitled";
  }
  if (listEl) {
    listEl.innerHTML = "";
    const langs = Array.isArray(movie.languages) ? movie.languages : [];
    if (!langs.length) {
      const info = document.createElement("p");
      info.className = "admin-help-text";
      info.textContent = "No extra languages yet. Click \"Add language\" to create one.";
      listEl.appendChild(info);
    } else {
      langs.forEach((lang) => {
        listEl.appendChild(buildLanguageRow(lang));
      });
    }
  }

  // Render per-episode Fluid codes for downloads TV/Anime
  const episodesTitle = document.getElementById("edit-episodes-title");
  const episodesHelp = document.getElementById("edit-episodes-help");
  const episodesContainer = document.getElementById("edit-download-episodes");
  if (episodesTitle && episodesHelp && episodesContainer) {
    if (
      movie.sourceKind === "download" &&
      (movie.type === "tv" || movie.type === "anime") &&
      Array.isArray(movie.seasons) &&
      movie.seasons.length
    ) {
      episodesTitle.style.display = "block";
      episodesHelp.style.display = "block";
      episodesContainer.innerHTML = "";
      const existing = movie.downloadEpisodes || {};
      movie.seasons.forEach((s) => {
        const seasonHeader = document.createElement("h4");
        seasonHeader.textContent = `Season ${s.season_number}`;
        episodesContainer.appendChild(seasonHeader);
        (s.episodes || []).forEach((ep) => {
          const key = episodeKey(s.season_number, ep.episode_number);
          const row = document.createElement("div");
          row.className = "admin-episode-row";
          row.dataset.epKey = key;
          row.innerHTML = `
            <label class="admin-label">S${s.season_number} · E${ep.episode_number} - ${
            ep.name || ""
          }</label>
            <textarea class="admin-input edit-episode-script" rows="3"
              placeholder="Fluid Player code for this episode (optional)">${
                existing[key]?.script || existing[key] || ""
              }</textarea>
          `;
          episodesContainer.appendChild(row);
        });
      });
    } else {
      episodesTitle.style.display = "none";
      episodesHelp.style.display = "none";
      episodesContainer.innerHTML = "";
    }
  }

  switchSection("dashboard-section"); // ensure valid sections exist
  switchSection("edit-movie-section");
}

function renderLists() {
  const data = loadMovieData();
  const listsTable = document.getElementById("lists-table");
  const assignListSelect = document.getElementById("assign-list");
  if (!listsTable || !assignListSelect) return;

  listsTable.innerHTML = "";
  assignListSelect.innerHTML = "";

  const listNames = Object.keys(data.lists || {});
  if (listNames.length === 0) {
    listsTable.innerHTML = '<p class="admin-empty">No lists yet. Create some above.</p>';
    return;
  }

  const table = document.createElement("div");
  table.className = "admin-table-inner";
  const header = document.createElement("div");
  header.className = "admin-table-row admin-table-header";
  header.innerHTML = `<div>List name</div><div>Titles</div>`;
  table.appendChild(header);

  listNames.forEach((name) => {
    const count = (data.lists[name] || []).length;
    const row = document.createElement("div");
    row.className = "admin-table-row";
    row.innerHTML = `<div>${name}</div><div>${count}</div>`;
    table.appendChild(row);

    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    assignListSelect.appendChild(opt);
  });
  listsTable.appendChild(table);
}

async function fetchTmdbDetails(tmdbId, type) {
  const base = "https://api.themoviedb.org/3";
  const path =
    type === "movie" || type === "animeMovie"
      ? `/movie/${tmdbId}`
      : `/tv/${tmdbId}`;
  const url = `${base}${path}?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed (status ${res.status})`);
  const data = await res.json();
  return {
    title: data.title || data.name || "",
    overview: data.overview || "",
    posterUrl: data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : "",
  };
}

async function fetchTmdbTvSeasons(tmdbId) {
  const base = "https://api.themoviedb.org/3";
  const tvRes = await fetch(
    `${base}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`
  );
  if (!tvRes.ok) return [];
  const tv = await tvRes.json();
  const numSeasons = Math.min(tv.number_of_seasons || 0, 20);
  const seasons = [];

  for (let s = 1; s <= numSeasons; s++) {
    try {
      const seasonRes = await fetch(
        `${base}/tv/${tmdbId}/season/${s}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      if (!seasonRes.ok) continue;
      const seasonData = await seasonRes.json();
      const episodes = (seasonData.episodes || []).map((ep) => ({
        episode_number: ep.episode_number,
        name: ep.name || `Episode ${ep.episode_number}`,
      }));
      seasons.push({ season_number: s, episodes });
    } catch (_) {}
  }
  return seasons;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginCard = document.getElementById("admin-login-card");
  const panel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");
  const logoutBtn = document.getElementById("admin-logout-btn");
  const createListForm = document.getElementById("create-list-form");
  const addTitleForm = document.getElementById("add-title-form");
  const addTitleError = document.getElementById("add-title-error");
  const addTitleSuccess = document.getElementById("add-title-success");
  const sourceKindSelect = document.getElementById("source-kind");
  const downloadFields = document.getElementById("download-fields");
  const contentTypeSelect = document.getElementById("content-type");
  const tmdbInput = document.getElementById("tmdb-id");
  const editLangAddBtn = document.getElementById("edit-movie-add-language");
  const editLangSaveBtn = document.getElementById("edit-movie-save");
  const editLangCancelBtn = document.getElementById("edit-movie-cancel");

  if (isAuthed()) {
    if (loginCard) loginCard.style.display = "none";
    if (panel) panel.style.display = "flex";
    let data = loadMovieData();
    data = ensureDefaultLists(data);
    saveMovieData(data);
    renderDashboard();
    renderLists();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = (document.getElementById("admin-username")?.value || "").trim();
      const pass = document.getElementById("admin-password")?.value || "";
      if (id === ADMIN_ID && pass === ADMIN_PASSWORD) {
        setAuth(true);
        if (loginError) loginError.textContent = "";
        if (loginCard) loginCard.style.display = "none";
        if (panel) panel.style.display = "flex";
        let data = loadMovieData();
        data = ensureDefaultLists(data);
        saveMovieData(data);
        renderDashboard();
        renderLists();
      } else if (loginError) {
        loginError.textContent = "Invalid ID or password.";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setAuth(false);
      window.location.reload();
    });
  }

  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-section");
      if (t) switchSection(t);
    });
  });

  if (createListForm) {
    createListForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("new-list-name");
      const name = input?.value?.trim();
      if (!name) return;
      const data = loadMovieData();
      if (!data.lists[name]) {
        data.lists[name] = [];
        saveMovieData(data);
        if (input) input.value = "";
        renderLists();
      }
    });
  }

  const recentListEl = document.getElementById("admin-recent-list");
  if (recentListEl) {
    recentListEl.addEventListener("click", (e) => {
      const target = e.target;
      if (!target) return;
      if (target.classList?.contains("admin-delete-btn")) {
        const key = e.target.getAttribute("data-key");
        if (!key) return;
        const data = loadMovieData();
        delete data.movies[key];
        Object.keys(data.lists || {}).forEach((n) => {
          data.lists[n] = (data.lists[n] || []).filter((k) => k !== key);
        });
        saveMovieData(data);
        renderDashboard();
        renderLists();
      } else if (target.classList?.contains("admin-edit-btn")) {
        const key = target.getAttribute("data-key");
        if (!key) return;
        openEditMovie(key);
      }
    });
  }

  if (addTitleForm) {
    addTitleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      addTitleError.textContent = "";
      addTitleSuccess.textContent = "";

      const tmdbId = (document.getElementById("tmdb-id")?.value || "").trim();
      const type = document.getElementById("content-type")?.value || "movie";
      const listName = document.getElementById("assign-list")?.value || "";
      const sourceKind =
        document.getElementById("source-kind")?.value || "vidsrc";
      const downloadScript =
        document.getElementById("download-fluid-script")?.value || "";

      if (!tmdbId || !listName) {
        addTitleError.textContent = "TMDB ID and list are required.";
        return;
      }
      if (sourceKind === "download" && !downloadScript.trim()) {
        addTitleError.textContent =
          "For downloads, Fluid Player code is required.";
        return;
      }

      let meta;
      let seasons = [];
      try {
        meta = await fetchTmdbDetails(tmdbId, type);
        if (type === "tv" || type === "anime") {
          seasons = await fetchTmdbTvSeasons(tmdbId);
        }
      } catch (err) {
        console.error(err);
        addTitleError.textContent = err?.message || "Failed to load TMDB data.";
        meta = { title: "", overview: "", posterUrl: "" };
      }

      const data = loadMovieData();
      const key = getMovieIdKey(tmdbId, type);

      const movieRecord = {
        key,
        tmdbId,
        type,
        title: meta.title,
        overview: meta.overview,
        posterUrl: meta.posterUrl,
        seasons: seasons.length ? seasons : null,
        sourceKind,
        createdAt: Date.now(),
      };

      if (sourceKind === "download") {
        if (type === "tv" || type === "anime") {
          // Per-episode codes from UI
          const epContainer = document.getElementById(
            "download-episodes-container"
          );
          const epMap = {};
          if (epContainer) {
            const rows = Array.from(
              epContainer.querySelectorAll(".admin-episode-row")
            );
            rows.forEach((row) => {
              const keyAttr = row.dataset.epKey;
              const ta = row.querySelector(".download-episode-script");
              const code = ta?.value?.trim();
              if (keyAttr && code) {
                epMap[keyAttr] = { script: code };
              }
            });
          }
          movieRecord.downloadEpisodes = epMap;
        } else {
          // Movie / Anime movie: single Fluid code via languages
          movieRecord.languages = [
            {
              name: "Original",
              script: downloadScript.trim(),
            },
          ];
        }
      }

      data.movies[key] = movieRecord;

      if (!data.lists[listName]) data.lists[listName] = [];
      if (!data.lists[listName].includes(key)) data.lists[listName].push(key);

      saveMovieData(data);
      renderDashboard();
      renderLists();

      const tmdbInput = document.getElementById("tmdb-id");
      if (tmdbInput) tmdbInput.value = "";
      const scriptInput = document.getElementById("download-fluid-script");
      if (scriptInput) scriptInput.value = "";
      addTitleSuccess.textContent = "Title saved successfully.";
    });
  }

  if (editLangAddBtn) {
    editLangAddBtn.addEventListener("click", () => {
      const listEl = document.getElementById("edit-movie-languages");
      if (!listEl) return;
      // Remove placeholder help text if present
      listEl.querySelectorAll(".admin-help-text").forEach((n) => n.remove());
      listEl.appendChild(buildLanguageRow({ name: "", script: "" }));
    });
  }

  if (editLangSaveBtn) {
    editLangSaveBtn.addEventListener("click", () => {
      if (!currentEditMovieKey) return;
      const data = loadMovieData();
      const movie = data.movies[currentEditMovieKey];
      if (!movie) return;

      const listEl = document.getElementById("edit-movie-languages");
      if (!listEl) return;

      const rows = Array.from(listEl.querySelectorAll(".admin-language-row"));
      const languages = [];
      rows.forEach((row) => {
        const nameInput = row.querySelector(".edit-lang-name");
        const scriptInput = row.querySelector(".edit-lang-script");
        const name = nameInput?.value?.trim();
        const script = scriptInput?.value?.trim();
        if (name && script) {
          languages.push({ name, script });
        }
      });

      movie.languages = languages;

      // Save per-episode Fluid codes for downloads TV/Anime
      if (movie.sourceKind === "download" && (movie.type === "tv" || movie.type === "anime")) {
        const epContainer = document.getElementById("edit-download-episodes");
        const epMap = {};
        if (epContainer) {
          const rowsEp = Array.from(
            epContainer.querySelectorAll(".admin-episode-row")
          );
          rowsEp.forEach((row) => {
            const keyAttr = row.dataset.epKey;
            const ta = row.querySelector(".edit-episode-script");
            const code = ta?.value?.trim();
            if (keyAttr && code) {
              epMap[keyAttr] = { script: code };
            }
          });
        }
        movie.downloadEpisodes = epMap;
      }

      data.movies[currentEditMovieKey] = movie;
      saveMovieData(data);
      renderDashboard();
      currentEditMovieKey = null;
      switchSection("dashboard-section");
    });
  }

  if (editLangCancelBtn) {
    editLangCancelBtn.addEventListener("click", () => {
      currentEditMovieKey = null;
      switchSection("dashboard-section");
    });
  }

  const editLangContainer = document.getElementById("edit-movie-languages");
  if (editLangContainer) {
    editLangContainer.addEventListener("click", (e) => {
      const target = e.target;
      if (target?.classList?.contains("edit-lang-remove")) {
        const row = target.closest(".admin-language-row");
        if (row) row.remove();
      }
    });
  }

  if (sourceKindSelect && downloadFields) {
    const updateDownloadVisibility = () => {
      const val = sourceKindSelect.value;
      downloadFields.style.display = val === "download" ? "block" : "none";
    };
    sourceKindSelect.addEventListener("change", updateDownloadVisibility);
    updateDownloadVisibility();
  }

  async function maybeLoadDownloadEpisodes() {
    if (!sourceKindSelect || !downloadFields) return;
    const sourceVal = sourceKindSelect.value;
    const typeVal = contentTypeSelect?.value || "movie";
    const tmdbVal = tmdbInput?.value?.trim();
    const epContainer = document.getElementById("download-episodes-container");
    if (
      sourceVal !== "download" ||
      !(typeVal === "tv" || typeVal === "anime") ||
      !tmdbVal ||
      !epContainer
    ) {
      if (epContainer) epContainer.innerHTML = "";
      return;
    }

    // Avoid refetch if same TMDB id
    if (
      currentDownloadEpisodesTmdb === tmdbVal &&
      Array.isArray(currentDownloadEpisodesSeasons) &&
      currentDownloadEpisodesSeasons.length
    ) {
      // Already rendered once; don't rebuild here
      return;
    }

    try {
      const seasons = await fetchTmdbTvSeasons(tmdbVal);
      currentDownloadEpisodesTmdb = tmdbVal;
      currentDownloadEpisodesSeasons = seasons;
      epContainer.innerHTML = "";
      seasons.forEach((s) => {
        const seasonHeader = document.createElement("h4");
        seasonHeader.textContent = `Season ${s.season_number}`;
        epContainer.appendChild(seasonHeader);
        (s.episodes || []).forEach((ep) => {
          const key = episodeKey(s.season_number, ep.episode_number);
          const row = document.createElement("div");
          row.className = "admin-episode-row";
          row.dataset.epKey = key;
          row.innerHTML = `
            <label class="admin-label">S${s.season_number} · E${ep.episode_number} - ${
            ep.name || ""
          }</label>
            <textarea class="admin-input download-episode-script" rows="3"
              placeholder="Fluid Player code for this episode (optional)"></textarea>
          `;
          epContainer.appendChild(row);
        });
      });
    } catch (_) {
      // ignore UI errors
    }
  }

  if (sourceKindSelect) {
    sourceKindSelect.addEventListener("change", () => {
      maybeLoadDownloadEpisodes();
    });
  }
  if (contentTypeSelect) {
    contentTypeSelect.addEventListener("change", () => {
      currentDownloadEpisodesTmdb = null;
      currentDownloadEpisodesSeasons = null;
      maybeLoadDownloadEpisodes();
    });
  }
  if (tmdbInput) {
    tmdbInput.addEventListener("blur", () => {
      currentDownloadEpisodesTmdb = null;
      currentDownloadEpisodesSeasons = null;
      maybeLoadDownloadEpisodes();
    });
  }
});
