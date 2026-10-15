/* ============================================================
   YXY · Yields Xanadu Yore — 交互脚本
   落雪粒子 / 星野 / 滚动渐显 / 导航状态 / 远山视差
   原生 JS，无依赖
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  /* ---------- 全局落雪 ---------- */
  function initSnow() {
    var canvas = document.getElementById('snow');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, flakes = [], raf = null;

    function makeFlake(anywhere) {
      var r = Math.random() * 1.8 + 0.4;
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -10,
        r: r,
        vy: r * 0.35 + Math.random() * 0.25,   // 大的落得快
        sway: Math.random() * 0.6 + 0.2,       // 摆动幅度
        phase: Math.random() * Math.PI * 2,    // 摆动相位
        alpha: Math.random() * 0.5 + 0.25
      };
    }

    function build() {
      // 按屏幕面积控制密度，移动端更少
      var count = W < 640 ? 70 : Math.min(150, Math.floor(W * H / 12000));
      flakes = [];
      for (var i = 0; i < count; i++) flakes.push(makeFlake(true));
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function drawStatic() {
      // 动效减弱偏好：画一层静态薄雪
      ctx.clearRect(0, 0, W, H);
      flakes.forEach(function (f) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226, 242, 251, ' + (f.alpha * 0.7).toFixed(2) + ')';
        ctx.fill();
      });
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      var time = t / 1000;
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy;
        f.x += Math.sin(time * 0.6 + f.phase) * f.sway * 0.4;
        if (f.y > H + 8) {
          flakes[i] = makeFlake(false);
          continue;
        }
        if (f.x < -8) f.x = W + 8;
        else if (f.x > W + 8) f.x = -8;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226, 242, 251, ' + f.alpha.toFixed(2) + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', debounce(function () {
      resize();
      if (reduced) drawStatic();
    }, 200));

    // 标签页隐藏时暂停渲染，回来再继续
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (!raf && !reduced) {
        raf = requestAnimationFrame(frame);
      }
    });

    if (reduced) drawStatic();
    else raf = requestAnimationFrame(frame);
  }

  /* ---------- 首屏星野 ---------- */
  function initStars() {
    var box = document.getElementById('stars');
    if (!box) return;
    var count = window.innerWidth < 640 ? 50 : 90;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('i');
      var size = Math.random() < 0.12 ? 2.4 : (Math.random() < 0.5 ? 1.4 : 1);
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 62).toFixed(2) + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.animationDuration = (2 + Math.random() * 4).toFixed(1) + 's';
      s.style.animationDelay = (Math.random() * 5).toFixed(1) + 's';
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  /* ---------- 滚动渐显 ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 导航：滚动态 / 移动端菜单 / 当前章节高亮 ---------- */
  function initNav() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (!nav || !toggle || !links) return;

    function closeMenu() {
      links.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开菜单');
    }
    function openMenu() {
      links.classList.add('open');
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '关闭菜单');
    }

    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 32); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (links.classList.contains('open')) closeMenu();
      else openMenu();
    });
    // 点击菜单项后收起
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
    // 点击空白处收起
    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !nav.contains(e.target)) closeMenu();
    });

    // 当前章节高亮
    var navAs = links.querySelectorAll('a');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            navAs.forEach(function (a) {
              a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
            });
          }
        });
      }, { rootMargin: '-38% 0px -55% 0px', threshold: 0 });
      document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------- 首屏视差：文字与远山按不同速度 lag ---------- */
  function initParallax() {
    if (reduced) return;
    var hero = document.querySelector('.hero');
    var inner = document.querySelector('.hero-inner');
    var clouds = document.querySelector('.clouds');
    var ranges = document.querySelectorAll('.range');
    if (!hero || !inner) return;

    var ticking = false;
    function update() {
      var y = window.scrollY;
      var h = hero.offsetHeight;
      if (y <= h * 1.2) {
        var p = Math.min(y / h, 1);
        inner.style.transform = 'translateY(' + (y * 0.32).toFixed(1) + 'px)';
        inner.style.opacity = String(Math.max(1 - p * 1.25, 0).toFixed(3));
        if (clouds) clouds.style.transform = 'translateY(' + (y * 0.14).toFixed(1) + 'px)';
        if (ranges[0]) ranges[0].style.transform = 'translateY(' + (y * 0.10).toFixed(1) + 'px)';
        if (ranges[1]) ranges[1].style.transform = 'translateY(' + (y * 0.18).toFixed(1) + 'px)';
        if (ranges[2]) ranges[2].style.transform = 'translateY(' + (y * 0.26).toFixed(1) + 'px)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  }

  /* ---------- 页脚年份 ---------- */
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function init() {
    initSnow();
    initStars();
    initReveal();
    initNav();
    initParallax();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
