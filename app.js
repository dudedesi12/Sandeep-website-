/* ============================================
   LoanMate Finance — Main Application Script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initCalculator();
    initContactForm();
    initCounterAnimation();
});

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

/* --- Contact Form with Firebase --- */
function initContactForm() {
    const form = document.getElementById('contactForm');
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

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;

        // Collect form data
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            loanType: document.getElementById('loanType').value,
            message: document.getElementById('message').value.trim(),
            submittedAt: new Date().toISOString(),
            status: 'new'
        };

        try {
            // Use Firebase if available, otherwise use Firestore REST API
            if (window.firebaseDB) {
                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js');
                await addDoc(collection(window.firebaseDB, 'enquiries'), formData);
            } else {
                // Fallback: use Firestore REST API
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
                                submittedAt: { stringValue: formData.submittedAt },
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

        } catch (error) {
            console.error('Form submission error:', error);
            formError.style.display = 'flex';
        } finally {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}
