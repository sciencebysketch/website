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

function isSingleColumnLayout() {
    return window.matchMedia('(max-width: 480px)').matches;
}

function collapseCard(card) {
    const inner = card.querySelector('.member-card-inner');
    if (!card.classList.contains('expanded')) return;

    if (isSingleColumnLayout()) {
        // Mobile grows downward via a plain CSS rule (see stylesheet) —
        // no inline pixel sizing needed, just toggle the class.
        card.classList.remove('expanded', 'expand-left');
        card.setAttribute('aria-expanded', 'false');
        return;
    }

    // Animate back down to the resting square size, then once the
    // transition finishes, drop the inline styles so the card returns
    // to filling its grid cell normally (and stays responsive to resize).
    const squareSize = card.getBoundingClientRect().width;
    inner.style.width = squareSize + 'px';
    inner.style.height = squareSize + 'px';

    const onDone = (e) => {
        if (e.target !== inner || (e.propertyName !== 'width' && e.propertyName !== 'height')) return;
        inner.removeEventListener('transitionend', onDone);
        card.classList.remove('expanded', 'expand-left');
        inner.style.width = '';
        inner.style.height = '';
        inner.style.left = '';
        inner.style.right = '';
    };
    inner.addEventListener('transitionend', onDone);

    card.setAttribute('aria-expanded', 'false');
}

function expandCard(card) {
    const inner = card.querySelector('.member-card-inner');
    const startRect = inner.getBoundingClientRect();

    card.setAttribute('aria-expanded', 'true');

    if (isSingleColumnLayout()) {
        // Mobile grows downward via a plain CSS rule — just toggle the class.
        card.classList.add('expanded');
        return;
    }

    // Figure out whether there's room to grow to the right (spanning into
    // the next column) or whether we need to grow to the left instead,
    // e.g. when this card is in the last column of the grid.
    const gapStr = getComputedStyle(gridEl).columnGap || getComputedStyle(gridEl).gap || '18px';
    const gap = parseFloat(gapStr) || 18;
    const gridRect = gridEl.getBoundingClientRect();
    const spaceRight = gridRect.right - startRect.right;
    const targetWidth = startRect.width * 2 + gap;
    const targetHeight = targetWidth / 2;
    const growLeft = spaceRight < targetWidth - startRect.width - 1;

    // Lock the current on-screen size as concrete pixels (instead of the
    // resting state's implicit inset:0 sizing) so the transition has a
    // real numeric starting point to animate from.
    inner.style.width = startRect.width + 'px';
    inner.style.height = startRect.height + 'px';
    inner.style.left = growLeft ? 'auto' : '0';
    inner.style.right = growLeft ? '0' : 'auto';

    card.classList.toggle('expand-left', growLeft);
    card.classList.add('expanded');

    // Force layout so the browser registers the starting size above
    // before we change it — otherwise the two writes get batched and
    // there's nothing to transition from.
    void inner.offsetWidth;

    requestAnimationFrame(() => {
        inner.style.width = targetWidth + 'px';
        inner.style.height = targetHeight + 'px';
    });
}

function collapseAll(except) {
    document.querySelectorAll('.member-card.expanded').forEach((el) => {
        if (el !== except) collapseCard(el);
    });
}

function toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');
    collapseAll(card);
    if (isExpanded) {
        collapseCard(card);
    } else {
        expandCard(card);
    }
}

function buildCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';

    const category = roleCategory(member.role);
    const bio = (member.bio && member.bio.trim()) ? member.bio.trim() : '';

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

    card.appendChild(inner);

    // Only members with a real bio are interactive — there's nothing to
    // reveal for the rest, so they stay static squares.
    if (!bio) return card;

    inner.insertAdjacentHTML('beforeend', `
        <p class="member-bio">${escapeHTML(bio)}</p>
        <div class="member-hint">
            <i class="hgi-stroke hgi-cursor-02" aria-hidden="true"></i>
            <span>Click for bio</span>
        </div>
    `);

    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', `${member.name}, ${member.role}. Activate for full bio.`);

    card.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCard(card);
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCard(card);
        } else if (e.key === 'Escape') {
            collapseCard(card);
        }
    });

    return card;
}

async function loadMembers() {
    try {
        const res = await fetch(MEMBERS_URL);
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

// Clicking anywhere outside a card, or pressing Escape, collapses whichever
// card is currently expanded.
document.addEventListener('click', () => collapseAll());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') collapseAll();
});

loadMembers();