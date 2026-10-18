/* ============================================================
   Science by Sketch — Member profile page logic
   ------------------------------------------------------------
   Reads ?name= from the URL, fetches the member from
   members.json (live), renders their profile, then loads
   their articles from articles-data.js (also live).
   ============================================================ */

const MEMBERS_JSON_URL = "https://sciencebysketch.github.io/members/members.json";

const AVATAR_EXTENSIONS = ["png", "jpg", "svg", "jpeg"];

/* ---------- DOM refs ---------- */

const memberEls = {
    loading: document.getElementById("memberLoading"),
    notFound: document.getElementById("memberNotFound"),
    profile: document.getElementById("memberProfile"),
    avatar: document.getElementById("memberAvatar"),
    name: document.getElementById("memberName"),
    role: document.getElementById("memberRole"),
    meta: document.getElementById("memberMeta"),
    description: document.getElementById("memberDescription"),
    articlesLoading: document.getElementById("memberArticlesLoading"),
    articlesGrid: document.getElementById("memberArticlesGrid"),
    articlesEmpty: document.getElementById("memberArticlesEmpty"),
};

/* ---------- helpers ---------- */

function memberShowState(state) {
    memberEls.loading.hidden = state !== "loading";
    memberEls.notFound.hidden = state !== "not-found";
    memberEls.profile.hidden = state !== "ready";
}

function memberInitials(name) {
    return (name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => (w[0] ? w[0].toUpperCase() : ""))
        .join("");
}

function memberEscapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

function memberRoleCategory(role) {
    const r = (role || "").toLowerCase();
    if (r.includes("president")) return "leadership";
    if (r.includes("secretary")) return "secretary";
    if (r.includes("treasur")) return "treasury";
    if (r.includes("social media") || r.includes("outreach") || r.includes("marketing")) return "outreach";
    if (r.includes("editor")) return "editorial";
    if (r.includes("instructor")) return "instructor";
    return "member";
}

/* ---------- avatar ---------- */

function buildProfileAvatar(member) {
    const slug = (member.name || "").trim().toLowerCase().replace(/\s+/g, "_");
    const container = memberEls.avatar;

    const img = document.createElement("img");
    img.alt = member.name || "";
    img.loading = "eager";

    let attempt = 0;
    const tryNext = () => {
        if (attempt >= AVATAR_EXTENSIONS.length) {
            // Fallback to initials
            const fallback = document.createElement("div");
            fallback.className = "avatar-initials";
            fallback.textContent = memberInitials(member.name);
            container.innerHTML = "";
            container.appendChild(fallback);
            return;
        }
        img.src = `https://sciencebysketch.github.io/members/${slug}.${AVATAR_EXTENSIONS[attempt]}`;
        attempt += 1;
    };

    img.addEventListener("error", tryNext);
    img.addEventListener("load", () => {
        container.innerHTML = "";
        container.appendChild(img);
    }, { once: true });
    tryNext();
}

/* ---------- render profile ---------- */

function renderProfile(member) {
    document.title = `${member.name} — Science by Sketch`;

    memberEls.name.textContent = member.name;

    const category = memberRoleCategory(member.role);
    memberEls.role.textContent = member.role;
    memberEls.role.className = `member-profile-role role-${category}`;

    const metaParts = [];
    if (member.academy) metaParts.push(member.academy);
    if (member.grade !== undefined && member.grade !== null && member.grade !== "") {
        metaParts.push(`Grade ${member.grade}`);
    }
    memberEls.meta.textContent = metaParts.join(" \u00b7 ");

    memberEls.description.textContent = (member.description && member.description.trim()) ? member.description.trim() : "";

    buildProfileAvatar(member);
}

/* ---------- render articles ---------- */

function memberCardTemplate(article) {
    const tagsHtml = article.tags
        .slice(0, 4)
        .map((tag) => `<span>${memberEscapeHtml(tag)}</span>`)
        .join("");

    const coverHtml = article.cover
        ? `<img src="${article.cover}" data-fallback="${article.coverFallback || ""}" onerror="handleCoverError(this)" onload="this.classList.add('is-loaded')" class="smooth-image" alt="" loading="lazy" decoding="async">`
        : "";

    const categoryColor = getCategoryColor(article.category);
    const typeColor = getTypeColor(article.type);
    const typeHtml = article.type
        ? `<span class="card-type" style="${badgeStyle(typeColor)}">${memberEscapeHtml(article.type)}</span>`
        : "";

    const formatBadgeHtml = article.contentType === "slideshow"
        ? `<span class="card-format-badge"><i class="hgi-stroke hgi-presentation-online" aria-hidden="true"></i> Slideshow</span>`
        : "";

    const slideCountInfo = (article.contentType === "slideshow" && article.slides && article.slides.length)
        ? `<span class="card-slide-count">${article.slides.length} slides</span><span class="meta-dot" aria-hidden="true">&middot;</span>`
        : "";

    return `
    <a class="article-card" href="${article.viewUrl}">
        <div class="card-media">${coverHtml}${formatBadgeHtml}</div>
        <div class="card-body">
            <div class="card-badges">
                <span class="card-category" style="${badgeStyle(categoryColor)}">${memberEscapeHtml(article.category)}</span>
                ${typeHtml}
            </div>
            <h2 class="card-title">${memberEscapeHtml(article.title)}</h2>
            <p class="card-description">${memberEscapeHtml(article.description)}</p>
            <div class="card-tags">${tagsHtml}</div>
            <div class="card-meta">
                <span class="card-author">
                    <span class="card-author-avatar">${memberEscapeHtml(initials(article.author))}</span>
                    <span class="card-author-name">${memberEscapeHtml(article.author)}</span>
                </span>
                <span class="card-date">${slideCountInfo}${formatDate(article.published)}</span>
            </div>
        </div>
    </a>`;
}

function renderMemberArticles(memberName) {
    articlesReady.then((articles) => {
        const memberArticles = articles
            .filter((a) => a.author && a.author.trim().toLowerCase() === memberName.trim().toLowerCase())
            .sort((a, b) => new Date(b.published) - new Date(a.published));

        memberEls.articlesLoading.hidden = true;

        if (memberArticles.length === 0) {
            memberEls.articlesEmpty.hidden = false;
            memberEls.articlesGrid.hidden = true;
            return;
        }

        memberEls.articlesGrid.innerHTML = memberArticles.map(memberCardTemplate).join("");
        memberEls.articlesGrid.hidden = false;
        memberEls.articlesEmpty.hidden = true;
    }).catch(() => {
        memberEls.articlesLoading.hidden = true;
        memberEls.articlesEmpty.hidden = false;
    });
}

/* ---------- init ---------- */

async function initMemberProfile() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");

    if (!name) {
        memberShowState("not-found");
        return;
    }

    memberShowState("loading");

    try {
        const res = await fetch(MEMBERS_JSON_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const members = await res.json();

        const member = members.find(
            (m) => m.name && m.name.trim().toLowerCase() === name.trim().toLowerCase()
        );

        if (!member) {
            memberShowState("not-found");
            return;
        }

        renderProfile(member);
        memberShowState("ready");
        renderMemberArticles(member.name);
    } catch (err) {
        console.error("Failed to load member profile:", err);
        memberShowState("not-found");
    }
}

initMemberProfile();
