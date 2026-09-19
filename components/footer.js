/* ============================================================
   Science by Sketch — <site-footer> Component
   Reusable custom element for the site-wide footer.
   ============================================================ */

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
