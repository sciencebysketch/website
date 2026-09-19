/* ============================================================
   Science by Sketch — Reusable Web Components Bundle
   Self-contained custom elements: <site-header>, <site-footer>,
   and <newsletter-subscribe>.
   Compatible with both HTTP(S) and local environments.
   ============================================================ */

/* ------------------------------------------------------------
   1. <site-header> Component
   ------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   2. <site-footer> Component
   ------------------------------------------------------------ */
class SiteFooter extends HTMLElement {
    connectedCallback() {
        if (this.querySelector('.site-footer')) return;

        const currentYear = new Date().getFullYear();

        this.innerHTML = `
            <footer class="site-footer">
                <div class="footer-top">
                    <div class="footer-brand">
                        <div class="footer-logo">Science by Sketch</div>
                        <p>Where science meets storytelling</p>
                    </div>

                    <div class="footer-col">
                        <h3>Explore</h3>
                        <a href="about.html">About</a>
                        <a href="articles.html">Articles</a>
                        <a href="newsletter.html">Newsletter</a>
                        <a href="members.html">Members</a>
                    </div>

                    <div class="footer-col">
                        <h3>Get Involved</h3>
                        <a href="index.html#volunteer">For Schools</a>
                        <a href="index.html#volunteer">Volunteer</a>
                        <a href="mailto:sciencebysketch@gmail.com">Contact</a>
                    </div>

                    <div class="footer-col">
                        <h3>Connect</h3>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">TikTok</a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
                    </div>
                </div>

                <div class="footer-bottom">
                    <p>&copy; ${currentYear} Science by Sketch</p>
                    <p>Have a question for us? Email us at <a href="mailto:sciencebysketch@gmail.com">sciencebysketch@gmail.com</a></p>
                </div>
            </footer>
        `;
    }
}

if (!customElements.get('site-footer')) {
    customElements.define('site-footer', SiteFooter);
}

/* ------------------------------------------------------------
   3. <newsletter-subscribe> Component
   ------------------------------------------------------------ */
const NEWSLETTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuMr-euA85296P77PGvsunCWWAMzwi50grnM2lwAGyoaZNIr-peMSxLx3rUnvn1jvN0w/exec';

class NewsletterSubscribe extends HTMLElement {
    connectedCallback() {
        if (this.querySelector('form')) {
            this.initBehavior();
            return;
        }

        const buttonText = this.getAttribute('button-text') || 'Subscribe';
        const placeholder = this.getAttribute('placeholder') || 'you@example.com';
        const helperText = this.getAttribute('helper-text') || 'One email per issue. Unsubscribe anytime.';
        const formId = this.getAttribute('form-id') || 'newsletterForm_' + Math.random().toString(36).substr(2, 6);

        this.innerHTML = `
            <form class="newsletter-form" id="${formId}" novalidate>
                <i class="hgi-stroke hgi-mail-01 newsletter-form-icon" aria-hidden="true"></i>
                <input type="email" class="newsletter-email-input" placeholder="${placeholder}" autocomplete="email" required aria-label="Email address">
                <button type="submit" class="newsletter-submit-btn">${buttonText}</button>
            </form>
            <div class="newsletter-status" role="status" aria-live="polite"></div>
            ${helperText ? `<p class="newsletter-fineprint">${helperText}</p>` : ''}
        `;

        this.initBehavior();
    }

    initBehavior() {
        const form = this.querySelector('form');
        const input = this.querySelector('.newsletter-email-input');
        const submitBtn = this.querySelector('.newsletter-submit-btn');
        const statusEl = this.querySelector('.newsletter-status');

        if (!form || !input || !submitBtn || !statusEl) return;

        let isSubmitting = false;

        const setStatus = (message, type) => {
            if (!message) {
                statusEl.innerHTML = '';
                statusEl.className = 'newsletter-status';
                return;
            }

            const icons = {
                success: 'hgi-tick-02',
                error: 'hgi-alert-02',
                info: 'hgi-information-circle'
            };
            const iconClass = icons[type] || icons.info;

            statusEl.innerHTML = `
                <i class="hgi-stroke ${iconClass}" aria-hidden="true"></i>
                <span>${message}</span>
            `;
            statusEl.className = `newsletter-status visible ${type || ''}`;
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) return;

            const email = (input.value || '').trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email || !emailRegex.test(email)) {
                setStatus('Please enter a valid email address.', 'error');
                input.focus();
                return;
            }

            isSubmitting = true;
            submitBtn.disabled = true;
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="hgi-stroke hgi-loading-03 spin" aria-hidden="true"></i> Subscribing…';
            setStatus('Subscribing to Drawn Conclusions…', 'info');

            try {
                const res = await fetch(NEWSLETTER_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ email })
                });

                if (!res.ok) throw new Error('Request failed with status ' + res.status);
                const data = await res.json();

                if (data.status === 'success') {
                    setStatus("You're on the list! Welcome to Drawn Conclusions.", 'success');
                    form.reset();
                    this.dispatchEvent(new CustomEvent('subscribed', { detail: { email }, bubbles: true }));
                } else if (data.status === 'duplicate') {
                    setStatus("You're already subscribed to Drawn Conclusions!", 'info');
                } else {
                    setStatus(data.message || 'Something went wrong. Please try again.', 'error');
                }
            } catch (err) {
                console.error('Subscription error:', err);
                setStatus('Could not connect to subscription service. Please try again.', 'error');
            } finally {
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        });
    }
}

if (!customElements.get('newsletter-subscribe')) {
    customElements.define('newsletter-subscribe', NewsletterSubscribe);
}
