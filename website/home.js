
(() => {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');

      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute(
        'aria-label',
        open ? 'Close navigation' : 'Open navigation'
      );

      menuToggle.textContent = open ? '×' : '☰';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation');
        menuToggle.textContent = '☰';
      });
    });
  }

  // Reveal sections as they enter the viewport.
  const revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('visible'));
  }

  // Highlight the barrier currently passing through the viewport.
  const barriers = [...document.querySelectorAll('.barrier-item')];

  if (barriers.length && 'IntersectionObserver' in window && !reduceMotion) {
    const barrierObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          barriers.forEach(item => {
            item.classList.toggle('active', item === entry.target);
          });
        }
      });
    }, {
      rootMargin: '-35% 0px -35% 0px',
      threshold: 0
    });

    barriers.forEach(item => barrierObserver.observe(item));
  }

  // Animated starfield.
  const canvas = document.getElementById('starfield');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  let width = 0;
  let height = 0;
  let stars = [];
  let raf = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(
      220,
      Math.floor(width * height / 5200)
    );

    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.15 + 0.25,
      alpha: Math.random() * 0.62 + 0.18,
      speed: Math.random() * 0.12 + 0.025,
      phase: Math.random() * Math.PI * 2
    }));

    draw(0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      const twinkle = reduceMotion
        ? 1
        : 0.72 + Math.sin(time * 0.0008 + star.phase) * 0.28;

      ctx.beginPath();
      ctx.fillStyle = `rgba(199,225,255,${star.alpha * twinkle})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();

      if (!reduceMotion) {
        star.y -= star.speed * 0.12;

        if (star.y < -2) {
          star.y = height + 2;
          star.x = Math.random() * width;
        }
      }
    }

    if (!reduceMotion) {
      raf = requestAnimationFrame(draw);
    }
  }

  const resizeObserver = new ResizeObserver(resize);

  resizeObserver.observe(canvas);
  resize();

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
  }, { once: true });
})();
