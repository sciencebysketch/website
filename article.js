/* ============================================================
   Science by Sketch — Article reader
   ------------------------------------------------------------
   article.html reads ?slug=..., waits for articlesReady (which
   loads every article's information.yml — see articles-data.js),
   fetches that article's raw article.md straight from the repo,
   and renders it as a native, on-brand Science by Sketch page
   using marked.js.
   ============================================================ */

const els = {
    skeleton: document.getElementById("articleSkeleton"),
    missing: document.getElementById("articleMissing"),
    error: document.getElementById("articleError"),
    errorSourceLink: document.getElementById("errorSourceLink"),
    retryLoad: document.getElementById("retryLoad"),
    view: document.getElementById("articleView"),
    category: document.getElementById("articleCategory"),
    type: document.getElementById("articleType"),
    title: document.getElementById("articleTitle"),
    description: document.getElementById("articleDescription"),
    authorAvatar: document.getElementById("articleAuthorAvatar"),
    authorName: document.getElementById("articleAuthorName"),
    date: document.getElementById("articleDate"),
    readTime: document.getElementById("articleReadTime"),
    tags: document.getElementById("articleTags"),
    content: document.getElementById("articleContent"),
    sourceLink: document.getElementById("articleSourceLink"),
};

// Only one of these is ever shown at a time — see the [hidden] rule
// in article.css that guarantees this attribute always wins.
function showOnly(state) {
    els.skeleton.hidden = state !== "loading";
    els.missing.hidden = state !== "missing";
    els.error.hidden = state !== "error";
    els.view.hidden = state !== "ready";
}

function estimateReadTime(markdown) {
    const plain = markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // inline images
        .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ") // reference images
        .replace(/\[[^\]]*\]:\s*<[^>]*>/g, " ") // reference definitions (incl. base64 data URIs)
        .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
        .replace(/[#>*_`~-]/g, " "); // markdown punctuation
    const words = plain.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
}

function renderMeta(article) {
    document.title = `${article.title} — Science by Sketch`;

    els.category.textContent = article.category;
    els.category.setAttribute("style", badgeStyle(getCategoryColor(article.category)));

    if (article.type) {
        els.type.textContent = article.type;
        els.type.setAttribute("style", badgeStyle(getTypeColor(article.type)));
    } else {
        els.type.textContent = "";
        els.type.removeAttribute("style");
    }

    els.title.textContent = article.title;
    els.description.textContent = article.description;
    els.authorAvatar.textContent = initials(article.author);
    els.authorName.textContent = article.author;
    els.date.textContent = formatDate(article.published);

    els.tags.innerHTML = article.tags
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("");

    els.sourceLink.href = article.sourceUrl;
    els.errorSourceLink.href = article.sourceUrl;
}

/* ---------- image + caption clean-up ----------
   Articles are written in a house style where a paragraph or
   heading holding an image is ALWAYS immediately followed (or, for
   headings, accompanied) by its caption text — never a real
   section heading. We convert both patterns into a proper
   <figure>/<figcaption> pair instead of showing them as a raw
   heading or a floating italic paragraph. */

function isImageOnly(el) {
    if (el.querySelectorAll("img").length !== 1) return false;
    const clone = el.cloneNode(true);
    clone.querySelectorAll("img").forEach((img) => img.remove());
    return clone.textContent.trim() === "";
}

function buildFigure(img, captionText) {
    const figure = document.createElement("figure");
    figure.className = "article-figure";

    img.loading = "lazy";
    img.decoding = "async";
    if (img.complete && img.naturalWidth !== 0) {
        img.classList.add("is-loaded");
    } else {
        img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
        img.addEventListener("error", () => img.classList.add("is-loaded"), { once: true });
    }

    figure.appendChild(img);
    const trimmed = (captionText || "").trim();
    if (trimmed) {
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = trimmed;
        figure.appendChild(figcaption);
    }
    return figure;
}

// Case A: an element (usually a heading) that bundles one image
// together with its own caption text in the same element.
function convertBundledImageCaptions(container) {
    container.querySelectorAll("h1, h2, h3, h4, h5, h6, p").forEach((el) => {
        const img = el.querySelector("img");
        if (!img || isImageOnly(el)) return; // pure image, handled by Case B
        const clone = el.cloneNode(true);
        clone.querySelectorAll("img").forEach((n) => n.remove());
        const captionText = clone.textContent.trim();
        if (!captionText) return;
        el.replaceWith(buildFigure(img.cloneNode(true), captionText));
    });
}

// Case B: a paragraph that is only an image — the very next block,
// whatever tag it is, is always that image's caption.
function convertAdjacentImageCaptions(container) {
    Array.from(container.children).forEach((el) => {
        if (!container.contains(el) || el.tagName !== "P" || !isImageOnly(el)) return;
        const img = el.querySelector("img");
        const next = el.nextElementSibling;
        const figure = buildFigure(img.cloneNode(true), next ? next.textContent : "");
        el.replaceWith(figure);
        if (next) next.remove();
    });
}

function renderMarkdown(markdown) {
    marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });
    els.content.innerHTML = marked.parse(markdown);
    convertBundledImageCaptions(els.content);
    convertAdjacentImageCaptions(els.content);
}

function loadArticle(article) {
    showOnly("loading");

    fetch(article.markdownUrl)
        .then((res) => {
            if (!res.ok) throw new Error(`Request failed with ${res.status}`);
            return res.text();
        })
        .then((markdown) => {
            els.readTime.textContent = estimateReadTime(markdown);
            renderMarkdown(markdown);
            showOnly("ready");
        })
        .catch((err) => {
            console.error("Failed to load article markdown:", err);
            showOnly("error");
        });
}

function init() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
        showOnly("missing");
        return;
    }

    showOnly("loading");

    articlesReady.then((articles) => {
        const article = getArticleBySlug(articles, slug);
        if (!article) {
            showOnly("missing");
            return;
        }
        renderMeta(article);
        loadArticle(article);
        els.retryLoad.addEventListener("click", () => loadArticle(article));
    });
}

init();
