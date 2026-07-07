// ============================================================
// SITUATIONS CAROUSEL — WHEEL GUARD + SMOOTH ENGINE
// Регистрируется ДО Lenis, перехватывает wheel первым.
// Единый _sitScrollTo используется dots, thumb и drag.
// ============================================================
(function() {
    let el      = null;   // carousel element (lazy)
    let target  = 0;      // целевая позиция
    let current = 0;      // текущая анимированная позиция
    let raf     = null;   // RAF handle

    function getEl() {
        if (!el) el = document.getElementById('sitCarousel');
        return el;
    }

    // Плавный скролл через lerp (используется всеми механизмами)
    function tick() {
        const c = getEl();
        if (!c) { raf = null; return; }

        const max = c.scrollWidth - c.clientWidth;
        target  = Math.max(0, Math.min(max, target));
        current = Math.max(0, Math.min(max, current));

        const diff = target - current;
        current += diff * 0.12;
        c.scrollLeft = current; 
        
        // Принудительная синхронизация ползунка и точек на каждом кадре
        if (typeof window._sitSync === 'function') window._sitSync();

        if (Math.abs(diff) > 0.5) {
            raf = requestAnimationFrame(tick);
        } else {
            c.scrollLeft = current = target;
            if (typeof window._sitSync === 'function') window._sitSync();
            raf = null;
        }
    }

    // Публичный API — используется из initSitCarousel
    window._sitScrollTo = function(pos) {
        const c = getEl();
        if (!c) return;
        // Если позиция сильно отличается от current (например, после drag) — синхронизируем
        if (Math.abs(current - c.scrollLeft) > 5) current = c.scrollLeft;
        target = pos;
        if (!raf) raf = requestAnimationFrame(tick);
    };

    // Wheel guard — должен быть раньше Lenis
    window.addEventListener('wheel', function(e) {
        const c = getEl();
        if (!c) return;
        
        // Проверяем, находится ли курсор над каруселью или элементами управления
        const isOverCarousel = c.contains(e.target) || e.target === c || e.target.closest('.sit-controls');
        if (!isOverCarousel) return;

        const max = c.scrollWidth - c.clientWidth;
        if (max <= 0) return;

        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

        // "Липкий" скролл: блокируем прокрутку страницы, если мы внутри карусели.
        // Пропускаем только если достигнут край и пользователь продолжает скроллить в ту же сторону.
        if (c.scrollLeft <= 0 && delta < 0) return;
        if (c.scrollLeft >= max - 1 && delta > 0) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        // Синхронизируем current перед началом анимации
        if (Math.abs(current - c.scrollLeft) > 5) current = c.scrollLeft;
        
        target = Math.max(0, Math.min(max, target + delta * 1.5));
        if (!raf) raf = requestAnimationFrame(tick);

    }, { passive: false, capture: true });
}());


document.addEventListener('DOMContentLoaded', () => {
    // --- Smooth Scrolling (Lenis) ---
    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({
            duration: 1.6, 
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
            smoothWheel: true,
            wheelMultiplier: 1.1, 
            touchMultiplier: 2,
            smoothTouch: false,
        });
        window.lenis = lenis;

        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    // --- Burger Menu Logic ---
    const burger = document.getElementById('burger');
    const navLinks = document.querySelector('.nav-links');

    if (burger && navLinks) {
        burger.addEventListener('click', (e) => {
            e.stopPropagation();
            const navbar = document.querySelector('.navbar');
            navLinks.classList.toggle('nav-active');
            burger.classList.toggle('open');
            if (navbar) navbar.classList.toggle('menu-open');
            
            if (navLinks.classList.contains('nav-active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('nav-active') && !navLinks.contains(e.target) && !burger.contains(e.target)) {
                navLinks.classList.remove('nav-active');
                burger.classList.remove('open');
                const navbar = document.querySelector('.navbar');
                if (navbar) navbar.classList.remove('menu-open');
                document.body.style.overflow = '';
            }
        });
    }

    // --- Hero GSAP Animation ---
    function initHeroAnimation() {
        gsap.set([".hero-image-wrapper", ".hero-title", ".hero-subtitle", ".title-word", ".hero-btn"], { autoAlpha: 1 });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(".hero-image-wrapper", { y: 100, rotateX: 15, autoAlpha: 0, scale: 0.8, duration: 1.5 })
            .from(".hero-image", { scale: 1.4, duration: 1.5 }, "<")
            .from(".hero-btn", { y: 40, autoAlpha: 0, duration: 1.2, ease: "back.out(1.5)" }, "-=0.8");
    }
    initHeroAnimation();
    
    // --- About staggered text animation ---
    function initAboutAnimation() {
        const title = document.querySelector('.stagger-text');
        if (!title) return;
        gsap.from(title, {
            scrollTrigger: {
                trigger: title,
                start: "top 85%",
                toggleActions: "play none none none"
            },
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out"
        });
    }
    initAboutAnimation();

    // --- Smooth Scroll Stacking Accordion GSAP ---
    function initStackingAccordion() {
        const section = document.querySelector('#projects');
        const container = section ? section.querySelector('.container') : null;
        const grid = document.querySelector('.stacking-accordion');
        const cards = gsap.utils.toArray('.stacking-accordion .strict-card');
        const texts = gsap.utils.toArray('.stacking-accordion .card-collapse-content');

        if (!cards.length || !grid || !texts.length || !container) return;

        let mm = gsap.matchMedia();
        mm.add("(min-width: 901px)", () => {
            const totalScrollDistance = window.innerHeight * 2.5; 
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: "top 70px",
                    end: `+=${totalScrollDistance}`,
                    pin: container,
                    pinSpacing: true,
                    scrub: 1.2,
                    invalidateOnRefresh: true
                }
            });
            texts.forEach((text, i) => {
                const card = cards[i];
                if (i === texts.length - 1) tl.to({}, { duration: 2 }); 
                tl.to(text, { height: 0, opacity: 0, duration: 1, ease: "power2.inOut" })
                  .to(card, { opacity: 0.7, scale: 0.98, marginTop: -10, duration: 0.6, ease: "none" }, "<"); 
                tl.to({}, { duration: 0.2 }); 
            });
        });
        mm.add("(max-width: 900px)", () => {
            gsap.set(cards, { clearProps: "all" });
            gsap.set(texts, { clearProps: "all" });
        });
        ScrollTrigger.refresh();
    }
    setTimeout(initStackingAccordion, 300);

    // --- Smooth Scroll for anchors ---
    const navAnchors = document.querySelectorAll('.nav-btn, .dot-btn, .logo, .dot-nav a, .hero-btn');
    navAnchors.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href) return;
            e.preventDefault();
            const isHome = href === '#' || href === '#hero';
            const targetId = isHome ? '#hero' : href;
            const targetElement = document.querySelector(targetId);

            if (navLinks && navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                const b = document.getElementById('burger');
                if (b) b.classList.remove('open');
                const n = document.querySelector('.navbar');
                if (n) n.classList.remove('menu-open');
                document.body.style.overflow = '';
            }

            if (!targetElement) return;
            setTimeout(() => {
                if (window.ScrollTrigger) ScrollTrigger.refresh();
                let yPos = 0;
                if (!isHome) {
                    const navHeight = document.querySelector('.navbar')?.offsetHeight || 70;
                    yPos = targetElement.getBoundingClientRect().top + window.scrollY - navHeight;
                }
                if (window.lenis) {
                    window.lenis.scrollTo(yPos, { duration: 0.9, ease: (t) => 1 - Math.pow(1 - t, 3) });
                } else {
                    window.scrollTo({ top: yPos, behavior: 'smooth' });
                }
            }, 150);
        });
    });

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const animateCounters = () => {
        counters.forEach(counter => {
            const animate = () => {
                const targetValue = +counter.getAttribute('data-target');
                const hasPlus = counter.getAttribute('data-plus') === 'true';
                const prefix = counter.getAttribute('data-prefix') || '';
                const suffix = counter.getAttribute('data-suffix') || '';
                const countString = counter.innerText.replace(/[^\d]/g, '');
                const count = +countString || 0;
                const inc = Math.max(targetValue / 100, 1);

                if (count < targetValue) {
                    const nextCount = Math.min(count + inc, targetValue);
                    let displayValue = Math.ceil(nextCount);
                    counter.innerText = prefix + displayValue + (hasPlus ? '+' : '') + suffix;
                    setTimeout(animate, 30);
                } else {
                    counter.innerText = prefix + targetValue + (hasPlus ? '+' : '') + suffix;
                }
            }
            animate();
        });
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                counters.forEach(c => c.innerText = '0');
                animateCounters();
            }
        });
    }, { threshold: 0.2 });
    const statsStrip = document.querySelector('.stats-strip');
    if (statsStrip) observer.observe(statsStrip);

    // --- GSAP Scroll Logic ---
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
        const sections = document.querySelectorAll('section, footer#contact');
        const dotBtns = document.querySelectorAll('.dot-btn');
        const updateDot = (index) => {
            dotBtns.forEach((btn, i) => btn.classList.toggle('active', i === index));
        };

        sections.forEach((section, index) => {
            if (section.id !== 'hero') {
                section.navTrigger = ScrollTrigger.create({
                    trigger: section,
                    start: "top 70px"
                });
            }
            const isNormalStacking = ['contact', 'director'].includes(section.id);
            gsap.set(section, {
                position: 'relative',
                zIndex: isNormalStacking ? 'auto' : (sections.length - index),
                opacity: 1
            });

            if (section.id === 'code') {
                const list = section.querySelector('.code-list');
                const sidebar = section.querySelector('.code-sidebar');
                if (list && sidebar) {
                    let mm = gsap.matchMedia();
                    mm.add("(min-width: 1321px)", () => {
                        let scrollDistance = 0;
                        const tl = gsap.timeline({
                            scrollTrigger: {
                                trigger: section,
                                start: "top top",
                                end: () => `+=${scrollDistance}`,
                                pin: true,
                                scrub: 1,
                                onRefresh: () => {
                                    scrollDistance = Math.max(0, list.scrollHeight - list.parentElement.offsetHeight);
                                },
                                onUpdate: (self) => {
                                    if (scrollDistance > 0) gsap.set(list, { y: -scrollDistance * self.progress, force3D: true });
                                }
                            }
                        });
                        ScrollTrigger.create({ trigger: section, start: "top 50%", end: () => `+=${scrollDistance}`, onEnter: () => updateDot(index), onEnterBack: () => updateDot(index) });
                    });
                    return;
                }
            }

            ScrollTrigger.create({ trigger: section, start: "top 50%", end: "bottom 50%", onEnter: () => updateDot(index), onEnterBack: () => updateDot(index) });
        });
    }

    // --- Contact Form ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const btn = this.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'ОТПРАВЛЕНО';
            btn.style.backgroundColor = '#28a745';
            btn.disabled = true;
            alert('Спасибо! Ваш запрос успешно отправлен.');
            this.reset();
            setTimeout(() => { btn.innerText = originalText; btn.style.backgroundColor = ''; btn.disabled = false; }, 3000);
        });
    }

    // --- Modal Logic ---
    const modal = document.getElementById('policyModal');
    const policyLink = document.getElementById('policyLink');
    const closeBtn = document.querySelector('.close-modal');
    if (modal && policyLink && closeBtn) {
        policyLink.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('active'); document.body.style.overflow = 'hidden'; });
        closeBtn.addEventListener('click', () => { modal.classList.remove('active'); document.body.style.overflow = ''; });
        window.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } });
    }

    // --- FAQ Toggle ---
    document.querySelectorAll('details').forEach(detail => {
        detail.addEventListener('toggle', () => {
            setTimeout(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 100);
        });
    });

    // --- Navbar Logic ---
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('navbar-scrolled');
            else navbar.classList.remove('navbar-scrolled');
        });
    }

    // --- Situations Carousel ---
    (function initSitCarousel() {
        const carousel = document.getElementById('sitCarousel');
        const thumb    = document.getElementById('sitScrollThumb');
        const track    = thumb ? thumb.parentElement : null;
        const dots     = Array.from(document.querySelectorAll('.sit-dot'));
        const cards    = carousel ? Array.from(carousel.querySelectorAll('.sit-card')) : [];
        if (!carousel || !thumb || !track || !cards.length) return;

        carousel.setAttribute('data-lenis-prevent', '');
        carousel.style.scrollBehavior = 'auto';

        function sync() {
            const sL  = carousel.scrollLeft;
            const max = carousel.scrollWidth - carousel.clientWidth;
            const ratio = max > 0 ? sL / max : 0;
            if (track && thumb) {
                const tW = Math.max(40, track.clientWidth * (carousel.clientWidth / carousel.scrollWidth));
                thumb.style.width = tW + 'px';
                thumb.style.left  = (ratio * (track.clientWidth - tW)) + 'px';
            }
            let closest = 0, minDist = Infinity;
            cards.forEach((card, i) => {
                const dist = Math.abs(card.offsetLeft - sL);
                if (dist < minDist) { minDist = dist; closest = i; }
            });
            dots.forEach((d, i) => d.classList.toggle('active', i === Math.min(closest, dots.length - 1)));
        }
        window._sitSync = sync;
        carousel.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('load', sync);
        setTimeout(sync, 400);

        dots.forEach((dot, idx) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window._sitScrollTo(cards[idx].offsetLeft);
            });
        });

        track.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const ratio = Math.max(0, Math.min(1, (e.clientX - track.getBoundingClientRect().left) / track.clientWidth));
            window._sitScrollTo(ratio * (carousel.scrollWidth - carousel.clientWidth));
        });

        let tDrag = false, tStartX = 0, tStartL = 0;
        thumb.addEventListener('mousedown', (e) => {
            tDrag = true; tStartX = e.clientX; tStartL = parseFloat(thumb.style.left) || 0;
            e.preventDefault(); e.stopPropagation();
        });

        let cDrag = false, cStartX = 0, cStartL = 0;
        carousel.addEventListener('mousedown', (e) => {
            if (e.target === thumb || e.target === track) return;
            cDrag = true; cStartX = e.clientX; cStartL = carousel.scrollLeft;
            carousel.classList.add('is-dragging'); e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (tDrag) {
                const maxL = track.clientWidth - thumb.offsetWidth;
                const newL = Math.max(0, Math.min(maxL, tStartL + e.clientX - tStartX));
                window._sitScrollTo((newL / maxL) * (carousel.scrollWidth - carousel.clientWidth));
            } else if (cDrag) {
                window._sitScrollTo(cStartL - (e.clientX - cStartX));
            }
        });

        document.addEventListener('mouseup', () => { tDrag = cDrag = false; carousel.classList.remove('is-dragging'); });
    })();
});
