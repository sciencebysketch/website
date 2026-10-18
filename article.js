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

    let formatBadge = document.getElementById("articleFormatBadge");
    if (!formatBadge) {
        formatBadge = document.createElement("span");
        formatBadge.id = "articleFormatBadge";
        formatBadge.className = "article-format-badge";
        els.type.parentNode.appendChild(formatBadge);
    }
    if (article.contentType === "slideshow") {
        formatBadge.innerHTML = `<i class="hgi-stroke hgi-presentation-online" aria-hidden="true"></i> Slideshow`;
        formatBadge.style.display = "inline-flex";
    } else {
        formatBadge.style.display = "none";
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
    els.sourceLink.textContent = article.contentType === "slideshow" ? "View slides on GitHub" : "View source on GitHub";
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

/* ---------- markdown rendering & embedded slideshows ---------- */

function preprocessMarkdownSlideshows(markdown) {
    return markdown
        .replace(/\\?<ISSAC\s+NEWTON\s+GRAPHIC\\?>/gi, `<div class="embedded-slideshow-container" data-slideshow-path="issac-newton-slideshow"></div>`)
        .replace(/::slideshow\[([^\]]+)\]/gi, (match, path) => `<div class="embedded-slideshow-container" data-slideshow-path="${escapeHtml(path.trim())}"></div>`)
        .replace(/\[slideshow:\s*([^\]]+)\]/gi, (match, path) => `<div class="embedded-slideshow-container" data-slideshow-path="${escapeHtml(path.trim())}"></div>`)
        .replace(/<slideshow\s+src=["']([^"']+)["'][^>]*>.*?<\/slideshow>/gi, (match, path) => `<div class="embedded-slideshow-container" data-slideshow-path="${escapeHtml(path.trim())}"></div>`)
        .replace(/<slideshow\s+src=["']([^"']+)["']\s*\/?>/gi, (match, path) => `<div class="embedded-slideshow-container" data-slideshow-path="${escapeHtml(path.trim())}"></div>`);
}

async function resolveFolderSlides(slug, subPath) {
    const checkImage = (url) =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });

    const discovered = [];
    for (let i = 1; i <= 30; i++) {
        const png = repoFileUrl(slug, `${subPath}/${i}.png`);
        if (await checkImage(png)) {
            discovered.push(png);
            continue;
        }
        const jpg = repoFileUrl(slug, `${subPath}/${i}.jpg`);
        if (await checkImage(jpg)) {
            discovered.push(jpg);
            continue;
        }
        break;
    }
    return discovered;
}

async function mountEmbeddedSlideshows(container, article) {
    const placeholders = container.querySelectorAll(".embedded-slideshow-container");
    if (!placeholders.length) return;

    for (const ph of placeholders) {
        const subPath = ph.dataset.slideshowPath;
        if (!subPath) continue;

        try {
            let slideUrls = [];
            let slideshowTitle = "";

            // Try fetching information.yml for the embedded slideshow
            try {
                const infoRes = await fetch(repoRawFileUrl(article.slug, `${subPath}/information.yml`), { cache: "no-store" });
                if (infoRes.ok) {
                    const info = parseArticleYaml(await infoRes.text());
                    slideshowTitle = info.title || "";
                    if (Array.isArray(info.slides) && info.slides.length > 0) {
                        slideUrls = info.slides.map((s) => repoFileUrl(article.slug, `${subPath}/${s}`));
                    }
                }
            } catch (_) {}

            // Fallback for known subfolder or dynamic probe
            if (slideUrls.length === 0) {
                if (subPath.includes("newton")) {
                    slideshowTitle = "Isaac Newton Graphic";
                    slideUrls = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) =>
                        repoFileUrl(article.slug, `${subPath}/${i}.png`)
                    );
                } else {
                    slideUrls = await resolveFolderSlides(article.slug, subPath);
                }
            }

            if (slideUrls.length > 0) {
                createCarousel(ph, slideUrls, {
                    title: slideshowTitle || "Embedded Slideshow",
                    id: "embedded_" + subPath.replace(/[^a-zA-Z0-9_-]/g, "_"),
                });
            }
        } catch (err) {
            console.error(`Failed to mount embedded slideshow "${subPath}":`, err);
        }
    }
}

function renderMarkdown(markdown, article) {
    marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });
    const preprocessed = preprocessMarkdownSlideshows(markdown);
    els.content.innerHTML = marked.parse(preprocessed);
    convertBundledImageCaptions(els.content);
    convertAdjacentImageCaptions(els.content);
    if (article) {
        mountEmbeddedSlideshows(els.content, article);
    }
}

/* ---------- slideshow carousel ---------- */

let activeCarousel = null;

async function resolveSlideshowImages(article) {
    if (article.slides && article.slides.length > 0) {
        return article.slides.map((s) => resolveAssetUrl(article.slug, s));
    }

    if (article.slug === "the-cell-cycle") {
        return [1, 2, 3, 4, 5, 6, 7].map((i) => repoFileUrl(article.slug, `${i}.png`));
    }

    // Dynamic discovery for sequentially numbered slide images
    const checkImage = (url) =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });

    const discovered = [];
    for (let i = 1; i <= 30; i++) {
        const png = repoFileUrl(article.slug, `${i}.png`);
        if (await checkImage(png)) {
            discovered.push(png);
            continue;
        }
        const jpg = repoFileUrl(article.slug, `${i}.jpg`);
        if (await checkImage(jpg)) {
            discovered.push(jpg);
            continue;
        }
        break;
    }

    return discovered.length > 0 ? discovered : [repoFileUrl(article.slug, "1.png")];
}

function createCarousel(container, slideUrls, options = {}) {
    if (!slideUrls || slideUrls.length === 0) return null;

    const carouselId = options.id || ("carousel_" + Math.random().toString(36).substr(2, 6));
    const title = options.title || "Cartoon Slideshow";

    container.innerHTML = `
        <div class="slideshow-carousel" id="${carouselId}" role="region" aria-label="${escapeHtml(title)}" tabindex="0">
            <div class="carousel-stage">
                <div class="carousel-viewport">
                    <img class="carousel-slide-img is-loaded" src="${slideUrls[0]}" alt="Slide 1 of ${slideUrls.length}" draggable="false" onerror="if(this.src.includes('cdn.jsdelivr.net')){this.src=this.src.replace('cdn.jsdelivr.net/gh','raw.githubusercontent.com');}">
                </div>

                <button type="button" class="carousel-nav-btn prev" aria-label="Previous slide" title="Previous (Left Arrow)">
                    <i class="hgi-stroke hgi-arrow-left-01" aria-hidden="true"></i>
                </button>
                <button type="button" class="carousel-nav-btn next" aria-label="Next slide" title="Next (Right Arrow)">
                    <i class="hgi-stroke hgi-arrow-right-01" aria-hidden="true"></i>
                </button>
            </div>

            <div class="carousel-bottom-bar">
                <div class="carousel-controls-row">
                    <button type="button" class="carousel-btn-text btn-prev">
                        <i class="hgi-stroke hgi-arrow-left-01" aria-hidden="true"></i> Previous
                    </button>

                    <div class="carousel-dots">
                        ${slideUrls
                            .map(
                                (_, i) =>
                                    `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
                            )
                            .join("")}
                    </div>

                    <button type="button" class="carousel-btn-text btn-next">
                        Next <i class="hgi-stroke hgi-arrow-right-01" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="carousel-thumbnails-tray">
                    ${slideUrls
                        .map(
                            (src, i) => `
                        <button type="button" class="carousel-thumb-btn${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}">
                            <img src="${src}" alt="Thumbnail ${i + 1}" loading="lazy" decoding="async" onerror="if(this.src.includes('cdn.jsdelivr.net')){this.src=this.src.replace('cdn.jsdelivr.net/gh','raw.githubusercontent.com');}">
                            <span class="carousel-thumb-num">${i + 1}</span>
                        </button>`
                        )
                        .join("")}
                </div>
            </div>
        </div>
    `;

    const carousel = container.querySelector(".slideshow-carousel");
    const stage = container.querySelector(".carousel-stage");
    const slideImg = container.querySelector(".carousel-slide-img");
    const prevBtn = container.querySelector(".carousel-nav-btn.prev");
    const nextBtn = container.querySelector(".carousel-nav-btn.next");
    const prevTextBtn = container.querySelector(".btn-prev");
    const nextTextBtn = container.querySelector(".btn-next");
    const dotsContainer = container.querySelector(".carousel-dots");
    const thumbnailsContainer = container.querySelector(".carousel-thumbnails-tray");

    // All slides in a slideshow share the exact same aspect ratio. Lock stage aspect-ratio on load.
    function applyAspectRatio() {
        if (slideImg.naturalWidth && slideImg.naturalHeight) {
            stage.style.aspectRatio = `${slideImg.naturalWidth} / ${slideImg.naturalHeight}`;
        }
    }
    if (slideImg.complete && slideImg.naturalWidth) {
        applyAspectRatio();
    } else {
        slideImg.addEventListener("load", applyAspectRatio, { once: true });
    }

    let currentIndex = 0;

    function preloadAdjacent(idx) {
        if (idx + 1 < slideUrls.length) {
            const nextImg = new Image();
            nextImg.src = slideUrls[idx + 1];
        }
        if (idx - 1 >= 0) {
            const prevImg = new Image();
            prevImg.src = slideUrls[idx - 1];
        }
    }

    function updateSlide(newIndex, smooth = true) {
        if (newIndex < 0 || newIndex >= slideUrls.length) return;
        currentIndex = newIndex;

        if (smooth) {
            slideImg.classList.remove("is-loaded");
            setTimeout(() => {
                slideImg.src = slideUrls[currentIndex];
                slideImg.alt = `Slide ${currentIndex + 1} of ${slideUrls.length}`;
                slideImg.classList.add("is-loaded");
            }, 100);
        } else {
            slideImg.src = slideUrls[currentIndex];
            slideImg.alt = `Slide ${currentIndex + 1} of ${slideUrls.length}`;
            slideImg.classList.add("is-loaded");
        }

        prevBtn.disabled = currentIndex === 0;
        prevTextBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === slideUrls.length - 1;
        nextTextBtn.disabled = currentIndex === slideUrls.length - 1;

        dotsContainer.querySelectorAll(".carousel-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === currentIndex);
        });

        thumbnailsContainer.querySelectorAll(".carousel-thumb-btn").forEach((thumb, i) => {
            const isActive = i === currentIndex;
            thumb.classList.toggle("active", isActive);
            if (isActive && smooth) {
                // Scroll only the horizontal thumbnail container, NEVER the window!
                const targetLeft = thumb.offsetLeft - (thumbnailsContainer.clientWidth - thumb.clientWidth) / 2;
                thumbnailsContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
            }
        });

        preloadAdjacent(currentIndex);
    }

    const prevSlide = () => updateSlide(currentIndex - 1);
    const nextSlide = () => updateSlide(currentIndex + 1);

    prevBtn.addEventListener("click", prevSlide);
    prevTextBtn.addEventListener("click", prevSlide);
    nextBtn.addEventListener("click", nextSlide);
    nextTextBtn.addEventListener("click", nextSlide);

    dotsContainer.querySelectorAll(".carousel-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
            const idx = parseInt(dot.dataset.index, 10);
            if (!isNaN(idx)) updateSlide(idx);
        });
    });

    thumbnailsContainer.querySelectorAll(".carousel-thumb-btn").forEach((thumb) => {
        thumb.addEventListener("click", () => {
            const idx = parseInt(thumb.dataset.index, 10);
            if (!isNaN(idx)) updateSlide(idx);
        });
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchStartY = 0;

    stage.addEventListener(
        "touchstart",
        (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        },
        { passive: true }
    );

    stage.addEventListener(
        "touchend",
        (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) nextSlide();
                else prevSlide();
            }
        },
        { passive: true }
    );

    carousel.addEventListener("mouseenter", () => { activeCarousel = carousel; });
    carousel.addEventListener("focusin", () => { activeCarousel = carousel; });

    carousel.addEventListener("keydown", (e) => {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevSlide();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            nextSlide();
        } else if (e.key === "Home") {
            e.preventDefault();
            updateSlide(0);
        } else if (e.key === "End") {
            e.preventDefault();
            updateSlide(slideUrls.length - 1);
        }
    });

    updateSlide(0, false);
    return { updateSlide, prevSlide, nextSlide };
}

// Global keyboard arrow listener
window.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const target = activeCarousel || document.querySelector(".slideshow-carousel");
    if (!target) return;

    if (e.key === "ArrowLeft") {
        target.querySelector(".carousel-nav-btn.prev")?.click();
    } else if (e.key === "ArrowRight") {
        target.querySelector(".carousel-nav-btn.next")?.click();
    }
});

function renderSlideshow(slideUrls, article) {
    createCarousel(els.content, slideUrls, {
        title: article?.title || "Cartoon Slideshow",
        id: "mainSlideshowCarousel",
    });
}

async function loadArticle(article) {
    showOnly("loading");

    if (article.contentType === "slideshow") {
        try {
            const slideUrls = await resolveSlideshowImages(article);
            els.readTime.textContent = `${slideUrls.length} slide${slideUrls.length === 1 ? "" : "s"}`;
            renderSlideshow(slideUrls, article);
            showOnly("ready");
        } catch (err) {
            console.error("Failed to load slideshow:", err);
            showOnly("error");
        }
        return;
    }

    fetch(article.markdownUrl)
        .then((res) => {
            if (!res.ok) throw new Error(`Request failed with ${res.status}`);
            return res.text();
        })
        .then((markdown) => {
            els.readTime.textContent = estimateReadTime(markdown);
            renderMarkdown(markdown, article);
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
