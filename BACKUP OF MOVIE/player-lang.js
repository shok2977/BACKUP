const STORAGE_KEY = "flakes_movies_data";

function loadMovieData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { movies: {}, lists: {} };
    const parsed = JSON.parse(raw);
    return { movies: parsed.movies || {}, lists: parsed.lists || {} };
  } catch (e) {
    return { movies: {}, lists: {} };
  }
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener("DOMContentLoaded", () => {
  const movieKey = getQueryParam("key");
  const langIndexStr = getQueryParam("lang");
  const seasonParam = getQueryParam("season");
  const episodeParam = getQueryParam("episode");

  const titleEl = document.getElementById("alt-player-title");
  const langEl = document.getElementById("alt-player-language");
  const container = document.getElementById("fluid-player-container");

  if (!movieKey) {
    if (titleEl) titleEl.textContent = "Not found";
    if (langEl) langEl.textContent = "Missing movie.";
    return;
  }

  const data = loadMovieData();
  const movie = data.movies[movieKey];

  if (!movie) {
    if (titleEl) titleEl.textContent = "Not found";
    if (langEl) langEl.textContent = "This title is not in the library.";
    return;
  }

  if (titleEl) titleEl.textContent = movie.title || "Untitled";
  let scriptToUse = "";

  // 1) Downloads TV/Anime per-episode
  if (
    movie.sourceKind === "download" &&
    (movie.type === "tv" || movie.type === "anime") &&
    seasonParam &&
    episodeParam
  ) {
    if (langEl)
      langEl.textContent = `Season ${seasonParam} · Episode ${episodeParam}`;
    const key = `s${seasonParam}_e${episodeParam}`;
    const episodesMap = movie.downloadEpisodes || {};
    const entry = episodesMap[key];
    if (entry && typeof entry === "object" && entry.script) {
      scriptToUse = entry.script;
    } else if (typeof entry === "string") {
      scriptToUse = entry;
    }
  } else {
    // 2) Language-based scripts (movies or manual configs)
    const languages = Array.isArray(movie.languages) ? movie.languages : [];
    const langIndex =
      langIndexStr !== null ? parseInt(langIndexStr, 10) : 0;
    const lang =
      !Number.isNaN(langIndex) && languages.length
        ? languages[langIndex]
        : null;

    if (lang) {
      if (langEl) langEl.textContent = `Language: ${lang.name || "Alternate"}`;
      scriptToUse = lang.script || "";
    } else {
      if (langEl) langEl.textContent = "Language configuration not found.";
    }
  }

  if (container && scriptToUse) {
    // Inject HTML for Fluid Player structure
    container.innerHTML = scriptToUse;

    const scriptNodes = Array.from(container.querySelectorAll("script"));
    const inlineScripts = [];
    const fluidExternalScripts = [];

    scriptNodes.forEach((oldScript) => {
      const src = oldScript.getAttribute("src");
      if (src) {
        if (src.includes("fluidplayer.com")) {
          fluidExternalScripts.push(src);
        }
        const newScript = document.createElement("script");
        newScript.src = src;
        document.body.appendChild(newScript);
      } else if (oldScript.textContent) {
        inlineScripts.push(oldScript.textContent);
      }
    });

    function runInlineScripts() {
      inlineScripts.forEach((code) => {
        try {
          new Function(code)();
        } catch (e) {
          console.error("Error running language script", e);
        }
      });
    }

    if (inlineScripts.length) {
      // If embed already includes Fluid Player script, wait for it to load, then run.
      if (fluidExternalScripts.length) {
        let loaded = 0;
        fluidExternalScripts.forEach((src) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = () => {
            loaded += 1;
            if (loaded === fluidExternalScripts.length) {
              runInlineScripts();
            }
          };
          document.body.appendChild(s);
        });
      } else if (window.fluidPlayer) {
        // Already present globally
        runInlineScripts();
      } else {
        // Fallback: load Fluid Player from CDN, then run
        const fpScript = document.createElement("script");
        fpScript.src = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
        fpScript.onload = runInlineScripts;
        document.body.appendChild(fpScript);
      }
    }
  }
});

