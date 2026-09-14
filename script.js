/* ============================================================
   Science by Sketch — site interactions
   ------------------------------------------------------------
   IMPORTANT: paste your deployed Google Apps Script Web App URL
   (the one ending in /exec) into SCRIPT_URL below.
   ============================================================ */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuMr-euA85296P77PGvsunCWWAMzwi50grnM2lwAGyoaZNIr-peMSxLx3rUnvn1jvN0w/exec';

/* ---------- helpers ---------- */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sent as text/plain on purpose: a JSON content-type triggers a CORS
// preflight (OPTIONS) request, which Apps Script Web Apps don't handle,
// so the request just fails. text/plain skips the preflight, and
// Apps Script still reads the raw JSON fine via e.postData.contents.
async function subscribeEmail(email) {
    const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error('Request failed with status ' + res.status);
    return res.json();
}

/* ---------- header show/hide on scroll ---------- */

const header = document.getElementById('siteHeader');
if (header) {
    const updateHeader = () => {
        header.classList.toggle('visible', window.scrollY > 80);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
}

/* ---------- mobile nav toggle ---------- */

const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            siteNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

/* ---------- reveal-on-scroll ---------- */

const revealEls = document.querySelectorAll('.reveal');

if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealEls.forEach((el) => observer.observe(el));
}

/* ---------- inline newsletter form (Drawn Conclusions section) ---------- */

const newsletterForm = document.getElementById('newsletterForm');
const newsletterEmail = document.getElementById('newsletterEmail');
const newsletterSubmit = document.getElementById('newsletterSubmit');
const newsletterStatus = document.getElementById('newsletterStatus');

const STATUS_ICONS = {
    success: 'hgi-tick-02',
    error: 'hgi-alert-02',
    info: 'hgi-information-circle'
};

function renderStatus(el, message, type) {
    if (!el) return;
    if (!message) {
        el.innerHTML = '';
        el.classList.remove('error', 'info', 'success', 'visible');
        return;
    }
    const icon = STATUS_ICONS[type] || STATUS_ICONS.info;
    const iconEl = document.createElement('i');
    iconEl.className = `hgi-stroke ${icon}`;
    iconEl.setAttribute('aria-hidden', 'true');
    const textEl = document.createElement('span');
    textEl.textContent = message;

    el.innerHTML = '';
    el.appendChild(iconEl);
    el.appendChild(textEl);
    el.classList.remove('error', 'info', 'success');
    if (type) el.classList.add(type);
    el.classList.add('visible');
}

function setNewsletterStatus(message, type) {
    renderStatus(newsletterStatus, message, type);
}

let newsletterSubmitting = false;

if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // stops the page reload

        // Guards against a second submit firing before the first finishes —
        // e.g. pressing Enter in the field submits the form directly and
        // ignores the submit button's disabled state.
        if (newsletterSubmitting) return;

        const email = (newsletterEmail.value || '').trim();

        if (!isValidEmail(email)) {
            setNewsletterStatus('Please enter a valid email address.', 'error');
            return;
        }

        newsletterSubmitting = true;
        newsletterSubmit.disabled = true;
        setNewsletterStatus('Sending…', 'info');

        try {
            const data = await subscribeEmail(email);

            if (data.status === 'success') {
                setNewsletterStatus("Success! We've sent an email to your inbox.", 'success');
                newsletterForm.reset();
            } else if (data.status === 'duplicate') {
                setNewsletterStatus("You're already on the list!", 'info');
            } else {
                setNewsletterStatus(data.message || 'Something went wrong. Please try again.', 'error');
            }
        } catch (err) {
            setNewsletterStatus('Something went wrong. Please try again.', 'error');
        } finally {
            newsletterSubmitting = false;
            newsletterSubmit.disabled = false;
        }
    });
}

/* ---------- modal (popup subscribe form) ---------- */

const openModalBtn = document.getElementById('openModalBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const emailInput = document.getElementById('emailInput');
const cancelBtn = document.getElementById('cancelBtn');
const submitBtn = document.getElementById('submitBtn');
const modalStatus = document.getElementById('modalStatus');
const successEmail = document.getElementById('successEmail');
const doneBtn = document.getElementById('doneBtn');

function setModalStatus(message, type) {
    renderStatus(modalStatus, message, type);
}

function openModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('open');
    modal.classList.remove('success');
    setModalStatus('', null);
    if (emailInput) {
        emailInput.value = '';
        emailInput.focus();
    }
}

function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
}

if (openModalBtn) openModalBtn.addEventListener('click', openModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
if (doneBtn) doneBtn.addEventListener('click', closeModal);

if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('open')) {
        closeModal();
    }
});

let modalSubmitting = false;

if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        if (modalSubmitting) return;

        const email = (emailInput.value || '').trim();

        if (!isValidEmail(email)) {
            setModalStatus('Please enter a valid email address.', 'error');
            return;
        }

        modalSubmitting = true;
        submitBtn.disabled = true;
        setModalStatus('Sending…', 'info');

        try {
            const data = await subscribeEmail(email);

            if (data.status === 'success') {
                if (successEmail) successEmail.textContent = email;
                modal.classList.add('success');
                setModalStatus('', null);
            } else if (data.status === 'duplicate') {
                setModalStatus("You're already on the list!", 'info');
            } else {
                setModalStatus(data.message || 'Something went wrong. Please try again.', 'error');
            }
        } catch (err) {
            setModalStatus('Something went wrong. Please try again.', 'error');
        } finally {
            modalSubmitting = false;
            submitBtn.disabled = false;
        }
    });
}