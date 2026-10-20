/* ============================================================
   Science by Sketch — Article data & repo helpers
   ------------------------------------------------------------
   Single source of truth, shared by articles.js (the grid) and
   article.js (the reader).

   The list of article slugs is read live from articles.js's repo
   articles.json (a flat JSON array of slugs, one per article
   folder). Everything else (title, author, category, tags,
   dates, description, status) is read live from that folder's
   information.yml, so editing the YAML in the repo is enough to
   update the site — no code changes needed. Adding a new article
   is just: create the folder, add its slug to articles.json.
   ============================================================ */

const ARTICLES_REPO = "sciencebysketch/articles";
const ARTICLES_BRANCH = "main";
const ARTICLES_INDEX_FILE = "articles.json";

/* ---------- category / type colors ----------
   Edit these two maps whenever a category or type is added,
   removed, or just needs a new color. Every category/type badge
   (on the article cards and on the article reader page) pulls
   its color from here — nothing else needs to change.

   Keys are matched against information.yml's "category" / "type"
   values (case-insensitive, whitespace-trimmed). Anything that
   doesn't match one of these keys falls back to DEFAULT_BADGE_COLOR
   so a typo or a not-yet-added value never breaks the page. */

const CATEGORY_COLORS = {
    "Biology": "#2f9e44",
    "Chemistry": "#7048e8",
    "Physics": "#1971c2",
    "Computer Science & Engineering": "#0c8599",
    "Mathematics & Statistics": "#e8590c",
    "Environmental Science": "#5c940d",
    "Astronomy": "#364fc7",
};

const TYPE_COLORS = {
    "Informative": "#495057",
    "Current Events": "#e03131",
    "Explainer": "#1c7ed6",
    "Experiment": "#f4d7b0",
    "History": "#8d6748",
    "Opinion": "#c2255c",
    "Application": "#2b8a3e",
    "Slideshow": "#7048e8",
};

const DEFAULT_BADGE_COLOR = "#868e96";

function lookupBadgeColor(map, value) {
    if (!value) return DEFAULT_BADGE_COLOR;
    const key = Object.keys(map).find(
        (k) => k.trim().toLowerCase() === String(value).trim().toLowerCase()
    );
    return key ? map[key] : DEFAULT_BADGE_COLOR;
}

function getCategoryColor(category) {
    return lookupBadgeColor(CATEGORY_COLORS, category);
}

function getTypeColor(type) {
    return lookupBadgeColor(TYPE_COLORS, type);
}

// Inline style for a badge: a light tint of the color as the
// background, the full color as the text. Used by both
// articles.js (cards) and article.js (reader header).
function badgeStyle(color) {
    return `background:color-mix(in srgb, ${color} 16%, white); color:${color};`;
}

/* ---------- repo URL helpers ---------- */

// jsDelivr — CDN-fronted, fast, but can lag noticeably behind a fresh
// commit (its own edge cache, plus whatever the browser itself caches
// on top). Good for assets that rarely change, like cover images.
function repoFileUrl(slug, filename) {
    return `https://cdn.jsdelivr.net/gh/${ARTICLES_REPO}@${ARTICLES_BRANCH}/${slug}/${filename}`;
}

// raw.githubusercontent.com — not CDN-cached the way jsDelivr is, so
// edits show up within seconds rather than needing a manual purge.
// Used for anything we want to always read live: the slug index,
// each article's metadata, and its markdown body.
function repoRawFileUrl(slug, filename) {
    return `https://raw.githubusercontent.com/${ARTICLES_REPO}/${ARTICLES_BRANCH}/${slug}/${filename}`;
}

// The repo-root index of article slugs — not inside a slug folder,
// so it's built directly rather than through repoRawFileUrl(slug, ...).
function repoArticlesIndexUrl() {
    return `https://raw.githubusercontent.com/${ARTICLES_REPO}/${ARTICLES_BRANCH}/${ARTICLES_INDEX_FILE}`;
}

function repoInfoUrl(slug) {
    return repoRawFileUrl(slug, "information.yml");
}

// Raw markdown source for an article, fetched client-side and rendered
// into the native Science by Sketch reader (article.html).
function repoMarkdownUrl(slug) {
    return repoRawFileUrl(slug, "article.md");
}

// Optional references for an article, written as markdown in a sibling
// citations.md (not every article ships one). The reader fetches this
// on its own and stays quiet when the file is absent (404).
function repoCitationsUrl(slug) {
    return repoRawFileUrl(slug, "citations.md");
}

// The GitHub page for an article's source markdown or slideshow folder — kept only as a
// "View source" link on the reader, never as the primary "Read" link.
function repoSourceUrl(slug, contentType = "article") {
    if (contentType === "slideshow") {
        return `https://github.com/${ARTICLES_REPO}/tree/${ARTICLES_BRANCH}/${slug}`;
    }
    return `https://github.com/${ARTICLES_REPO}/blob/${ARTICLES_BRANCH}/${slug}/article.md`;
}

// Where a card / listing should link a reader to: our own native
// article page, not GitHub.
function articleViewUrl(slug) {
    return `article.html?slug=${encodeURIComponent(slug)}`;
}

// Resolves an image reference found inside an article's markdown into
// a real URL: absolute URLs / data URIs pass through untouched, plain
// filenames are resolved against that article's own folder.
function resolveAssetUrl(slug, ref) {
    if (!ref) return null;
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) return ref;
    return repoFileUrl(slug, ref.replace(/^\.?\//, ""));
}

/* ---------- cover image ----------
   Every article folder carries its own cover image at the same
   path, e.g.
   https://github.com/sciencebysketch/articles/blob/main/the-curious-world-of-tiny-things/cover.png
   We just point at "cover.png" and fall back to "cover.jpg" if that
   404s (handled by handleCoverError below, wired up via the
   img's onerror in articles.js) — no markdown parsing needed. */

function repoCoverUrl(slug, ext) {
    return repoFileUrl(slug, `cover.${ext}`);
}

// Wired up as onerror="handleCoverError(this)" on cover <img> tags.
// Tries the .jpg fallback once, then just hides the broken image.
function handleCoverError(img) {
    const fallback = img.dataset.fallback;
    if (fallback && img.src !== fallback) {
        img.src = fallback;
        return;
    }
    img.closest(".card-media")?.classList.add("no-cover");
    img.remove();
}

/* ---------- article slug index (articles.json) ---------- */

// Fetches the repo's articles.json — a flat JSON array of slugs,
// one per article folder, e.g. ["some-article", "another-article"].
// This is the only thing that needs updating in the repo when an
// article is added or removed; everything else here reacts to it.
async function fetchArticleSlugs() {
    const res = await fetch(repoArticlesIndexUrl(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${ARTICLES_INDEX_FILE}`);
    const slugs = await res.json();
    if (!Array.isArray(slugs)) {
        throw new Error(`${ARTICLES_INDEX_FILE} must be a JSON array of slugs`);
    }
    return slugs;
}

/* ---------- information.yml loading ---------- */

// Safely parses information.yml, handling duplicate keys like `type:`
// (which can appear when both content type and category type are defined).
function parseArticleYaml(yamlText) {
    if (!yamlText) return {};
    const preprocessed = yamlText.replace(
        /^(\s*)type(\s*:\s*['"]?(?:slideshow|article)['"]?\s*)$/gim,
        "$1contentType$2"
    );
    try {
        return jsyaml.load(preprocessed) || {};
    } catch (err) {
        console.warn("Could not parse YAML with standard loader, attempting fallback:", err);
        return {};
    }
}

async function fetchArticleMeta(slug) {
    const infoRes = await fetch(repoInfoUrl(slug), { cache: "no-store" });

    if (!infoRes.ok) throw new Error(`information.yml missing for "${slug}"`);
    const info = parseArticleYaml(await infoRes.text());

    const contentType = (info.contentType || (info.type === "slideshow" ? "slideshow" : "article")).toLowerCase();

    let slides = Array.isArray(info.slides)
        ? info.slides
        : typeof info.slides === "number"
            ? Array.from({ length: info.slides }, (_, i) => `${i + 1}.png`)
            : [];

    if (contentType === "slideshow" && slides.length === 0 && slug === "the-cell-cycle") {
        slides = ["1.png", "2.png", "3.png", "4.png", "5.png", "6.png", "7.png"];
    }

    const firstSlide = slides[0] || "1.png";
    const cover = info.cover
        ? resolveAssetUrl(slug, info.cover)
        : contentType === "slideshow"
            ? repoFileUrl(slug, firstSlide)
            : repoCoverUrl(slug, "png");
    const coverFallback = info.cover
        ? resolveAssetUrl(slug, info.cover)
        : contentType === "slideshow"
            ? repoFileUrl(slug, firstSlide.replace(/\.png$/i, ".jpg"))
            : repoCoverUrl(slug, "jpg");

    return {
        slug,
        title: info.title || slug,
        description: info.description || "",
        author: (info.author && info.author.name) || info.author || "Science by Sketch",
        category: info.category || "General",
        type: info.type || "",
        contentType,
        slides,
        tags: Array.isArray(info.tags) ? info.tags : [],
        published: info.published || info.updated || null,
        updated: info.updated || info.published || null,
        status: (info.status || "published").toLowerCase(),
        cover,
        coverFallback,
        viewUrl: articleViewUrl(slug),
        markdownUrl: repoMarkdownUrl(slug),
        citationsUrl: repoCitationsUrl(slug),
        sourceUrl: repoSourceUrl(slug, contentType),
    };
}

// Loads the slug index, then every article's metadata in parallel,
// and resolves to the published ones. Both articles.js and
// article.js await this instead of reading a hardcoded array.
const articlesReady = fetchArticleSlugs()
    .catch((err) => {
        console.error("Could not load article index:", err);
        return [];
    })
    .then((slugs) =>
        Promise.all(
            slugs.map((slug) =>
                fetchArticleMeta(slug).catch((err) => {
                    console.error(`Skipping "${slug}":`, err);
                    return null;
                })
            )
        )
    )
    .then((results) => results.filter((a) => a && a.status === "published"));

function getArticleBySlug(articles, slug) {
    return articles.find((a) => a.slug === slug) || null;
}

/* ---------- shared small helpers (used by articles.js and article.js) ---------- */

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name) {
    return (name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
}