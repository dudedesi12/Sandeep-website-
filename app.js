/* ============================================
   LoanMate Finance — Main Application Script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initCalculator();
    initBorrowingCalc();
    initContactForm();
    initCounterAnimation();
    initCookieConsent();
});

/* ============================================
   Security Utilities
   ============================================ */

/**
 * Sanitize user input — strips HTML tags and trims whitespace.
 * Prevents XSS from form submissions stored in Firebase.
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Validate email format using a reasonable regex.
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Australian phone numbers (mobile or landline).
 */
function isValidAusPhone(phone) {
    const cleaned = phone.replace(/[\s\-().]/g, '');
    return /^(\+?61|0)[2-9]\d{8}$/.test(cleaned);
}

/**
 * Rate limiter — prevents rapid-fire form submissions.
 * Returns true if the action is allowed, false if rate-limited.
 */
const RateLimiter = (() => {
    const attempts = {};
    const MAX_ATTEMPTS = 3;       // max submissions
    const WINDOW_MS = 5 * 60 * 1000; // per 5-minute window

    return {
        isAllowed(key) {
            const now = Date.now();
            if (!attempts[key]) {
                attempts[key] = [];
            }
            // Remove expired entries
            attempts[key] = attempts[key].filter(t => now - t < WINDOW_MS);
            if (attempts[key].length >= MAX_ATTEMPTS) {
                return false;
            }
            attempts[key].push(now);
            return true;
        },
        getWaitTime(key) {
            if (!attempts[key] || attempts[key].length === 0) return 0;
            const oldest = attempts[key][0];
            const remaining = WINDOW_MS - (Date.now() - oldest);
            return Math.max(0, Math.ceil(remaining / 1000));
        }
    };
})();

/* --- Navigation --- */
function initNavigation() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    }, { passive: true });

    // Mobile toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = nav.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, parseInt(delay));
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

/* --- Counter Animation --- */
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

/* --- Mortgage Calculator --- */
function initCalculator() {
    const loanAmountSlider = document.getElementById('loanAmount');
    const interestRateSlider = document.getElementById('interestRate');
    const loanTermSlider = document.getElementById('loanTerm');
    const toggleButtons = document.querySelectorAll('.calc-toggle');

    let frequency = 'monthly';

    function updateSliderFill(slider) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const percentage = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, #0071E3 0%, #0071E3 ${percentage}%, #E8E8ED ${percentage}%, #E8E8ED 100%)`;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function calculate() {
        const principal = parseFloat(loanAmountSlider.value);
        const annualRate = parseFloat(interestRateSlider.value) / 100;
        const years = parseInt(loanTermSlider.value);

        // Monthly calculation
        const monthlyRate = annualRate / 12;
        const numPayments = years * 12;

        let monthlyPayment;
        if (monthlyRate === 0) {
            monthlyPayment = principal / numPayments;
        } else {
            monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                (Math.pow(1 + monthlyRate, numPayments) - 1);
        }

        const totalRepayments = monthlyPayment * numPayments;
        const totalInterest = totalRepayments - principal;

        let displayPayment;
        let freqLabel;

        switch (frequency) {
            case 'fortnightly':
                displayPayment = (monthlyPayment * 12) / 26;
                freqLabel = 'per fortnight';
                break;
            case 'weekly':
                displayPayment = (monthlyPayment * 12) / 52;
                freqLabel = 'per week';
                break;
            default:
                displayPayment = monthlyPayment;
                freqLabel = 'per month';
        }

        // Update displays
        document.getElementById('loanAmountDisplay').textContent = formatCurrency(principal);
        document.getElementById('interestRateDisplay').textContent = parseFloat(interestRateSlider.value).toFixed(2) + '%';
        document.getElementById('loanTermDisplay').textContent = years + (years === 1 ? ' year' : ' years');

        document.getElementById('repaymentAmount').textContent = formatCurrency(Math.round(displayPayment));
        document.getElementById('repaymentFreq').textContent = freqLabel;
        document.getElementById('totalRepayments').textContent = formatCurrency(Math.round(totalRepayments));
        document.getElementById('totalInterest').textContent = formatCurrency(Math.round(totalInterest));
        document.getElementById('principalAmount').textContent = formatCurrency(principal);

        // Update slider fills
        updateSliderFill(loanAmountSlider);
        updateSliderFill(interestRateSlider);
        updateSliderFill(loanTermSlider);

        // Draw donut chart
        drawDonutChart(principal, totalInterest);
    }

    // Draw donut chart on canvas
    function drawDonutChart(principal, interest) {
        const canvas = document.getElementById('calcChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const size = 220;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = 85;
        const lineWidth = 28;
        const total = principal + interest;
        const principalAngle = (principal / total) * 2 * Math.PI;

        ctx.clearRect(0, 0, size, size);

        // Interest arc (background)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#86B6F6';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Principal arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
        ctx.strokeStyle = '#0071E3';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Center text
        const percentage = Math.round((principal / total) * 100);
        ctx.fillStyle = '#1D1D1F';
        ctx.font = '700 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(percentage + '%', centerX, centerY - 8);

        ctx.fillStyle = '#86868B';
        ctx.font = '400 12px Inter, sans-serif';
        ctx.fillText('Principal', centerX, centerY + 14);
    }

    // Event listeners
    [loanAmountSlider, interestRateSlider, loanTermSlider].forEach(slider => {
        slider.addEventListener('input', calculate);
    });

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            frequency = btn.dataset.freq;
            calculate();
        });
    });

    // Initial calculation
    calculate();
}

/* --- Borrowing Power Calculator --- */
function initBorrowingCalc() {
    const incomeSlider = document.getElementById('borrowIncome');
    const partnerSlider = document.getElementById('borrowPartner');
    const expensesSlider = document.getElementById('borrowExpenses');
    const debtsSlider = document.getElementById('borrowDebts');
    const dependantsSlider = document.getElementById('borrowDependants');
    const empButtons = document.querySelectorAll('.borrow-emp');

    if (!incomeSlider) return;

    let employmentType = 'payg';

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function updateSliderFill(slider) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const percentage = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, #0071E3 0%, #0071E3 ${percentage}%, #E8E8ED ${percentage}%, #E8E8ED 100%)`;
    }

    function calculateBorrowing() {
        const grossIncome = parseFloat(incomeSlider.value);
        const partnerIncome = parseFloat(partnerSlider.value);
        const monthlyExpenses = parseFloat(expensesSlider.value);
        const monthlyDebts = parseFloat(debtsSlider.value);
        const dependants = parseInt(dependantsSlider.value);

        // Update displays
        document.getElementById('borrowIncomeDisplay').textContent = formatCurrency(grossIncome);
        document.getElementById('borrowPartnerDisplay').textContent = formatCurrency(partnerIncome);
        document.getElementById('borrowExpensesDisplay').textContent = formatCurrency(monthlyExpenses);
        document.getElementById('borrowDebtsDisplay').textContent = formatCurrency(monthlyDebts);
        document.getElementById('borrowDependantsDisplay').textContent = dependants;

        // Update slider fills
        [incomeSlider, partnerSlider, expensesSlider, debtsSlider, dependantsSlider].forEach(updateSliderFill);

        // --- Calculation logic ---
        // Total gross annual income
        const totalGross = grossIncome + partnerIncome;

        // Tax estimate (simplified Australian brackets)
        function estimateTax(income) {
            if (income <= 18200) return 0;
            if (income <= 45000) return (income - 18200) * 0.19;
            if (income <= 120000) return 5092 + (income - 45000) * 0.325;
            if (income <= 180000) return 29467 + (income - 120000) * 0.37;
            return 51667 + (income - 180000) * 0.45;
        }

        const taxPrimary = estimateTax(grossIncome);
        const taxPartner = estimateTax(partnerIncome);
        const totalNet = totalGross - taxPrimary - taxPartner;
        const monthlyNet = totalNet / 12;

        // Dependant cost (HEM-style estimate: ~$400/month per dependant)
        const dependantCost = dependants * 400;

        // Total monthly commitments
        const totalMonthlyExpenses = monthlyExpenses + monthlyDebts + dependantCost;

        // Available for repayments
        const available = Math.max(0, monthlyNet - totalMonthlyExpenses);

        // Lenders typically use 30% of gross monthly income as a cap
        const grossMonthlyLimit = (totalGross / 12) * 0.30;

        // Use the lower of: available income or 30% gross cap
        const serviceability = Math.min(available, grossMonthlyLimit);

        // Assessment rate (buffer above current rates)
        const assessmentRate = 0.085; // 8.5% p.a.
        const monthlyAssessRate = assessmentRate / 12;
        const loanTermMonths = 30 * 12; // 30-year term

        // Self-employed gets ~80% of PAYG capacity (lenders apply stricter criteria)
        const empMultiplier = employmentType === 'self' ? 0.80 : 1.0;

        // Reverse mortgage formula: PV = PMT * [(1 - (1+r)^-n) / r]
        let borrowingPower = 0;
        if (monthlyAssessRate > 0 && serviceability > 0) {
            borrowingPower = serviceability *
                ((1 - Math.pow(1 + monthlyAssessRate, -loanTermMonths)) / monthlyAssessRate);
            borrowingPower *= empMultiplier;
        }

        // Cap at reasonable maximum
        borrowingPower = Math.max(0, Math.min(borrowingPower, 3000000));

        // Update result display
        document.getElementById('borrowResult').textContent = formatCurrency(Math.round(borrowingPower));
        document.getElementById('borrowNetIncome').textContent = formatCurrency(Math.round(monthlyNet));
        document.getElementById('borrowTotalExpenses').textContent = formatCurrency(Math.round(totalMonthlyExpenses));
        document.getElementById('borrowAvailable').textContent = formatCurrency(Math.round(serviceability));
        document.getElementById('borrowAssessRate').textContent = '8.50%';

        // Update meter
        const meterMax = 2000000;
        const meterPercent = Math.min((borrowingPower / meterMax) * 100, 100);
        const meterFill = document.getElementById('borrowMeterFill');
        const meterMarker = document.getElementById('borrowMeterMarker');
        if (meterFill) meterFill.style.width = meterPercent + '%';
        if (meterMarker) meterMarker.style.left = meterPercent + '%';
    }

    // Slider event listeners
    [incomeSlider, partnerSlider, expensesSlider, debtsSlider, dependantsSlider].forEach(slider => {
        slider.addEventListener('input', calculateBorrowing);
    });

    // Employment type toggle
    empButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            empButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            employmentType = btn.dataset.emp;
            calculateBorrowing();
        });
    });

    // Initial calculation
    calculateBorrowing();
}

/* --- Contact Form with Firebase + Security --- */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset states
        formSuccess.style.display = 'none';
        formError.style.display = 'none';

        // --- SECURITY: Honeypot check ---
        const honeypot = document.getElementById('website');
        if (honeypot && honeypot.value.length > 0) {
            // Bot detected — silently pretend success
            formSuccess.style.display = 'flex';
            form.reset();
            return;
        }

        // --- SECURITY: Rate limiting ---
        if (!RateLimiter.isAllowed('contactForm')) {
            const wait = RateLimiter.getWaitTime('contactForm');
            formError.querySelector('p').textContent =
                `Too many submissions. Please wait ${Math.ceil(wait / 60)} minute(s) and try again.`;
            formError.style.display = 'flex';
            return;
        }

        // --- SECURITY: Privacy consent check ---
        const consentBox = document.getElementById('privacyConsent');
        if (consentBox && !consentBox.checked) {
            formError.querySelector('p').textContent =
                'Please agree to the Privacy Policy before submitting.';
            formError.style.display = 'flex';
            return;
        }

        // --- VALIDATION ---
        const firstName = sanitizeInput(document.getElementById('firstName').value);
        const lastName = sanitizeInput(document.getElementById('lastName').value);
        const email = sanitizeInput(document.getElementById('email').value);
        const phone = sanitizeInput(document.getElementById('phone').value);
        const loanType = sanitizeInput(document.getElementById('loanType').value);
        const message = sanitizeInput(document.getElementById('message').value);

        if (!firstName || !lastName) {
            formError.querySelector('p').textContent = 'Please enter your full name.';
            formError.style.display = 'flex';
            return;
        }

        if (!isValidEmail(email)) {
            formError.querySelector('p').textContent = 'Please enter a valid email address.';
            formError.style.display = 'flex';
            return;
        }

        if (!isValidAusPhone(phone)) {
            formError.querySelector('p').textContent = 'Please enter a valid Australian phone number.';
            formError.style.display = 'flex';
            return;
        }

        if (!loanType) {
            formError.querySelector('p').textContent = 'Please select a loan type.';
            formError.style.display = 'flex';
            return;
        }

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;

        // Collect sanitized form data
        const formData = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            loanType: loanType,
            message: message,
            privacyConsent: true,
            submittedAt: new Date().toISOString(),
            source: 'website-contact-form',
            status: 'new'
        };

        try {
            // Use Firebase if available, otherwise use Firestore REST API
            if (window.firebaseDB) {
                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js');
                await addDoc(collection(window.firebaseDB, 'enquiries'), formData);
            } else {
                const projectId = 'sandeepweb-21c9f';
                const response = await fetch(
                    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/enquiries`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fields: {
                                firstName: { stringValue: formData.firstName },
                                lastName: { stringValue: formData.lastName },
                                email: { stringValue: formData.email },
                                phone: { stringValue: formData.phone },
                                loanType: { stringValue: formData.loanType },
                                message: { stringValue: formData.message },
                                privacyConsent: { booleanValue: true },
                                submittedAt: { stringValue: formData.submittedAt },
                                source: { stringValue: formData.source },
                                status: { stringValue: formData.status }
                            }
                        })
                    }
                );
                if (!response.ok) throw new Error('Failed to submit');
            }

            // Success
            formSuccess.style.display = 'flex';
            form.reset();

            // Reset error message back to default
            formError.querySelector('p').innerHTML =
                'Something went wrong. Please call us at <a href="tel:0410867001">0410 867 001</a>.';

        } catch (error) {
            console.error('Form submission error:', error);
            formError.querySelector('p').innerHTML =
                'Something went wrong. Please call us at <a href="tel:0410867001">0410 867 001</a>.';
            formError.style.display = 'flex';
        } finally {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

/* --- Cookie Consent --- */
function initCookieConsent() {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    const acceptBtn = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');

    // Check if user already made a choice
    const consent = localStorage.getItem('lm_cookie_consent');
    if (consent !== null) {
        // Already decided — don't show banner
        if (consent === 'accepted') {
            enableAnalytics();
        }
        return;
    }

    // Show banner after a short delay (less intrusive)
    setTimeout(() => {
        banner.classList.add('visible');
    }, 1500);

    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('lm_cookie_consent', 'accepted');
        banner.classList.remove('visible');
        enableAnalytics();
    });

    declineBtn.addEventListener('click', () => {
        localStorage.setItem('lm_cookie_consent', 'declined');
        banner.classList.remove('visible');
        disableAnalytics();
    });
}

function enableAnalytics() {
    // Google Analytics is loaded via firebase-config.js
    // This ensures it's allowed to run
    window['ga-disable-G-C9X9RY7Y7C'] = false;
}

function disableAnalytics() {
    // Disable Google Analytics tracking
    window['ga-disable-G-C9X9RY7Y7C'] = true;
}
