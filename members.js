const MEMBERS_URL = "https://sciencebysketch.github.io/members/members.json";

const statusEl = document.getElementById('membersStatus');
const gridEl = document.getElementById('membersGrid');

// Maps a role string to a color category. Falls back to a neutral
// "member" treatment for anything that doesn't match a known group.
function roleCategory(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('president')) return 'leadership';
    if (r.includes('secretary')) return 'secretary';
    if (r.includes('treasur')) return 'treasury';
    if (r.includes('social media') || r.includes('outreach') || r.includes('marketing')) return 'outreach';
    if (r.includes('editor')) return 'editorial';
    if (r.includes('instructor')) return 'instructor';
    return 'member';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

const AVATAR_EXTENSIONS = ['png', 'jpg', 'svg', 'jpeg'];

function initials(name) {
    return (name || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => (w[0] ? w[0].toUpperCase() : ''))
        .join('');
}

// Profile pictures live at members/<name_with_underscores>.<ext> and are
// always square. The extension isn't known ahead of time, so try each
// candidate in turn and fall back to an initials avatar if none load.
function buildAvatar(member) {
    const slug = (member.name || '').trim().toLowerCase().replace(/\s+/g, '_');
    const img = document.createElement('img');
    img.className = 'member-avatar smooth-image';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';

    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });

    let attempt = 0;
    const tryNext = () => {
        if (attempt >= AVATAR_EXTENSIONS.length) {
            const fallback = document.createElement('div');
            fallback.className = 'member-avatar member-avatar-fallback';
            fallback.textContent = initials(member.name);
            img.replaceWith(fallback);
            return;
        }
        img.src = `https://sciencebysketch.github.io/members/${slug}.${AVATAR_EXTENSIONS[attempt]}`;
        attempt += 1;
    };

    img.addEventListener('error', tryNext);
    tryNext();
    return img;
}

function buildCard(member) {
    const profileUrl = `member.html?name=${encodeURIComponent(member.name)}`;

    const card = document.createElement('a');
    card.className = 'member-card';
    card.href = profileUrl;

    const category = roleCategory(member.role);

    const metaParts = [];
    if (member.academy) metaParts.push(member.academy);
    if (member.grade !== undefined && member.grade !== null && member.grade !== '') {
        metaParts.push(`Grade ${member.grade}`);
    }

    const inner = document.createElement('div');
    inner.className = 'member-card-inner';

    const header = document.createElement('div');
    header.className = 'member-card-header';
    header.appendChild(buildAvatar(member));
    header.insertAdjacentHTML('beforeend', `
        <h3 class="member-name">${escapeHTML(member.name)}</h3>
        <span class="member-role role-${category}">${escapeHTML(member.role)}</span>
        <p class="member-meta">${escapeHTML(metaParts.join(' \u00b7 '))}</p>
    `);
    inner.appendChild(header);

    inner.insertAdjacentHTML('beforeend', `
        <div class="member-hint">
            <i class="hgi-stroke hgi-cursor-02" aria-hidden="true"></i>
            <span>Click to learn more</span>
        </div>
    `);

    card.appendChild(inner);
    card.setAttribute('aria-label', `${member.name}, ${member.role}. Click to view profile.`);

    return card;
}

async function loadMembers() {
    try {
        const res = await fetch(MEMBERS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const members = await res.json();

        if (!Array.isArray(members) || members.length === 0) {
            throw new Error('No members found');
        }

        const fragment = document.createDocumentFragment();
        members.forEach((member) => fragment.appendChild(buildCard(member)));

        gridEl.appendChild(fragment);
        gridEl.hidden = false;
        statusEl.hidden = true;
    } catch (err) {
        statusEl.classList.add('error');
        statusEl.innerHTML = `<i class="hgi-stroke hgi-alert-02" aria-hidden="true"></i><span>Couldn't load members right now. Please try again later.</span>`;
    }
}

loadMembers();