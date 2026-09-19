/* ============================================================
   Science by Sketch — <site-header> Component
   Reusable custom element for consistent site-wide navigation.
   ============================================================ */

class SiteHeader extends HTMLElement {
    connectedCallback() {
        if (this.querySelector('.site-header')) {
            this.initBehavior();
            return;
        }

        const currentAttr = (this.getAttribute('current') || '').toLowerCase();
        const currentPath = window.location.pathname.toLowerCase();

        // Determine active page
        const isHome = currentAttr === 'home' || currentPath.endsWith('/') || currentPath.endsWith('/index.html');
        const isAbout = currentAttr === 'about' || currentPath.includes('about');
        const isArticles = currentAttr === 'articles' || currentPath.includes('article');
        const isNewsletter = currentAttr === 'newsletter' || currentPath.includes('newsletter');
        const isMembers = currentAttr === 'members' || currentPath.includes('members');

        this.innerHTML = `
            <header class="site-header" id="siteHeader">
                <div class="site-header-inner">
                    <a href="index.html" class="site-logo" aria-label="Science by Sketch Home">Science by Sketch</a>
                    <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="siteNav">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <nav class="site-nav" id="siteNav" aria-label="Main Navigation">
                        <a href="about.html"${isAbout ? ' aria-current="page" class="active"' : ''}>About</a>
                        <a href="articles.html"${isArticles ? ' aria-current="page" class="active"' : ''}>Articles</a>
                        <a href="newsletter.html"${isNewsletter ? ' aria-current="page" class="active"' : ''}>Newsletter</a>
                        <a href="members.html"${isMembers ? ' aria-current="page" class="active"' : ''}>Members</a>
                    </nav>
                </div>
            </header>
        `;

        this.initBehavior(isHome);
    }

    initBehavior(isHome) {
        const header = this.querySelector('#siteHeader');
        const navToggle = this.querySelector('#navToggle');
        const siteNav = this.querySelector('#siteNav');

        if (!header) return;

        // Nav bar should always show across all pages
        header.classList.add('visible');

        // Mobile drawer toggle
        if (navToggle && siteNav) {
            const toggleMenu = (open) => {
                const isOpen = open !== undefined ? open : !siteNav.classList.contains('open');
                siteNav.classList.toggle('open', isOpen);
                navToggle.setAttribute('aria-expanded', String(isOpen));
            };

            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });

            siteNav.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', () => toggleMenu(false));
            });

            document.addEventListener('click', (e) => {
                if (siteNav.classList.contains('open') && !this.contains(e.target)) {
                    toggleMenu(false);
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && siteNav.classList.contains('open')) {
                    toggleMenu(false);
                }
            });
        }
    }
}

if (!customElements.get('site-header')) {
    customElements.define('site-header', SiteHeader);
}
