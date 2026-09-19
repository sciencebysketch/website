/* ============================================================
   Science by Sketch — <newsletter-subscribe> Component
   Reusable subscription form component with live validation,
   loading indicators, and Google Apps Script integration.
   ============================================================ */

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
