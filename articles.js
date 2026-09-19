/* ============================================================
   Science by Sketch — Articles page
   ------------------------------------------------------------
   Article data lives in articles-data.js (shared with the
   article.html reader) and loads live from each article's
   information.yml. This file only handles rendering the grid,
   category filters, and search on articles.html.
   ============================================================ */

/* ---------- state ---------- */

let allArticles = [];
let activeCategory = "All";
let searchTerm = "";

/* ---------- rendering ---------- */

function renderCategoryFilters() {
    const container = document.getElementById("categoryFilters");
    if (!container) return;

    const categories = ["All", ...new Set(allArticles.map((a) => a.category))];

    container.innerHTML = categories
        .map(
            (cat) => `
        <button type="button" class="filter-chip${cat === activeCategory ? " active" : ""}" data-category="${escapeHtml(cat)}">
            ${escapeHtml(cat)}
        </button>`
        )
        .join("");

    container.querySelectorAll(".filter-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeCategory = btn.dataset.category;
            renderCategoryFilters();
            renderArticles();
        });
    });
}

function cardTemplate(article) {
    const tagsHtml = article.tags
        .slice(0, 4)
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("");

    const coverHtml = article.cover
        ? `<img src="${article.cover}" data-fallback="${article.coverFallback || ""}" onerror="handleCoverError(this)" onload="this.classList.add('is-loaded')" class="smooth-image" alt="" loading="lazy" decoding="async">`
        : "";

    const categoryColor = getCategoryColor(article.category);
    const typeColor = getTypeColor(article.type);
    const typeHtml = article.type
        ? `<span class="card-type" style="${badgeStyle(typeColor)}">${escapeHtml(article.type)}</span>`
        : "";

    return `
    <a class="article-card" href="${article.viewUrl}">
        <div class="card-media">${coverHtml}</div>
        <div class="card-body">
            <div class="card-badges">
                <span class="card-category" style="${badgeStyle(categoryColor)}">${escapeHtml(article.category)}</span>
                ${typeHtml}
            </div>
            <h2 class="card-title">${escapeHtml(article.title)}</h2>
            <p class="card-description">${escapeHtml(article.description)}</p>
            <div class="card-tags">${tagsHtml}</div>
            <div class="card-meta">
                <span class="card-author">
                    <span class="card-author-avatar">${escapeHtml(initials(article.author))}</span>
                    <span class="card-author-name">${escapeHtml(article.author)}</span>
                </span>
                <span class="card-date">${formatDate(article.published)}</span>
            </div>
        </div>
    </a>`;
}

function matchesSearch(article, term) {
    if (!term) return true;
    const haystack = [article.title, article.description, article.author, article.category, ...article.tags]
        .join(" ")
        .toLowerCase();
    return haystack.includes(term);
}

function renderArticles() {
    const grid = document.getElementById("articlesGrid");
    const emptyState = document.getElementById("emptyState");
    const resultsCount = document.getElementById("resultsCount");
    if (!grid) return;

    const term = searchTerm.trim().toLowerCase();

    const filtered = allArticles
        .filter((a) => activeCategory === "All" || a.category === activeCategory)
        .filter((a) => matchesSearch(a, term))
        .sort((a, b) => new Date(b.published) - new Date(a.published));

    grid.innerHTML = filtered.map(cardTemplate).join("");

    const isFiltering = term.length > 0 || activeCategory !== "All";
    if (resultsCount) {
        const count = filtered.length;
        resultsCount.textContent = isFiltering
            ? `${count} article${count === 1 ? "" : "s"} found`
            : `${count} article${count === 1 ? "" : "s"}`;
    }

    if (emptyState) {
        emptyState.hidden = filtered.length !== 0;
    }
    grid.hidden = filtered.length === 0;
}

/* ---------- search wiring ---------- */

const searchInput = document.getElementById("articleSearch");
const clearSearchBtn = document.getElementById("clearSearch");
const resetSearchBtn = document.getElementById("resetSearch");

function updateClearButton() {
    if (!clearSearchBtn) return;
    clearSearchBtn.hidden = searchTerm.length === 0;
}

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        updateClearButton();
        renderArticles();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
        searchTerm = "";
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        updateClearButton();
        renderArticles();
    });
}

if (resetSearchBtn) {
    resetSearchBtn.addEventListener("click", () => {
        searchTerm = "";
        activeCategory = "All";
        if (searchInput) searchInput.value = "";
        updateClearButton();
        renderCategoryFilters();
        renderArticles();
    });
}

/* ---------- init ---------- */

const resultsCountEl = document.getElementById("resultsCount");
if (resultsCountEl) resultsCountEl.textContent = "Loading articles…";

articlesReady.then((articles) => {
    allArticles = articles;
    renderCategoryFilters();
    renderArticles();
});
