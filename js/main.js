/* ============================================================
   Payne Detailing Group — main.js
   Nav behavior, scroll reveals, parallax panorama layers.
   Requires GSAP + ScrollTrigger (loaded via CDN in each page).
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  /* ---- garage door entrance: click-to-enter ----
     The door sits fixed over the whole viewport until the Enter button is
     clicked. On click it lifts (2.4s) and is then hidden/disabled so it
     doesn't block anything underneath. No scroll-linking, no auto-open
     timer, no localStorage persistence — every fresh page load shows it,
     on every screen size, and stays put until the visitor taps Enter. */
  const garageEnter = document.getElementById('garageEnter');
  const garageBtn = document.getElementById('garageBtn');

  function openGarage() {
    garageEnter.classList.add('lifted');
    setTimeout(() => {
      garageEnter.classList.add('closed');
    }, 2400); // matches the 2.4s CSS lift transition
  }

  if (garageBtn) {
    garageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openGarage();
    });
  }

  /* ---- sticky header shrink ---- */
  const header = document.getElementById('siteHeader');
  ScrollTrigger.create({
    start: 40,
    end: 99999,
    onUpdate: (self) => {
      header.classList.toggle('scrolled', self.scroll() > 40);
    }
  });

  /* ---- mobile menu: top dropdown + scrim ---- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavScrim = document.getElementById('mobileNavScrim');
  function closeMobileNav() {
    mobileNav.classList.remove('open');
    mobileNavScrim.classList.remove('open');
    menuToggle.classList.remove('open');
  }
  function toggleMobileNav() {
    const isOpen = mobileNav.classList.toggle('open');
    mobileNavScrim.classList.toggle('open', isOpen);
    menuToggle.classList.toggle('open', isOpen);
  }
  if (menuToggle && mobileNav && mobileNavScrim) {
    menuToggle.addEventListener('click', toggleMobileNav);
    mobileNavScrim.addEventListener('click', closeMobileNav);
    mobileNav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', closeMobileNav)
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });
  }

  /* ---- mobile-specific background video ----
     Swaps in vertically-shot clips (framed for the car, not cropped from a
     landscape source) on the hero and first panorama band when the viewport
     is phone-width. Checked once at load — orientation flips mid-session are
     rare enough not to warrant a resize listener here.
     On mobile these play as a rotation (data-mobile-playlist, comma-
     separated) rather than one clip on native <video loop> — a single 4s
     clip looping forever reads as broken/repetitive on a phone. Desktop is
     unaffected: a single-item list just plays through its native `loop`
     attribute exactly as before. */
  document.querySelectorAll('[data-desktop-src]').forEach((vid) => {
    const desktopSrc = vid.getAttribute('data-desktop-src') || vid.getAttribute('src');
    const mobilePlaylist = (vid.getAttribute('data-mobile-playlist') || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const playlist = (window.innerWidth <= 760 && mobilePlaylist.length) ? mobilePlaylist : [desktopSrc];
    let index = 0;

    function playClip(i) {
      index = i % playlist.length;
      vid.querySelector('source')?.remove();
      vid.setAttribute('src', playlist[index]);
      vid.load();
      /* Explicit .play() needed here — mobile Safari honors the autoplay
         attribute on a video's original src at page load, but once a
         script calls .load() to swap the src, autoplay alone no longer
         restarts playback, so it sits paused on the first frame. */
      vid.play().catch(() => {});
    }

    if (playlist.length > 1) {
      vid.loop = false; // native loop would swallow 'ended' and stop rotation from ever advancing
      vid.addEventListener('ended', () => playClip(index + 1));
    }
    playClip(0);
  });

  /* ---- footer year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- scroll reveals ---- */
  gsap.utils.toArray('.reveal').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      delay: (i % 3) * 0.06,
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  /* ---- panorama parallax layers ---- */
  gsap.utils.toArray('.panorama').forEach((pano) => {
    const layers = pano.querySelectorAll('.layer');
    layers.forEach((layer, i) => {
      const speed = (i + 1) * 18; // px of travel
      gsap.fromTo(layer,
        { yPercent: -speed / 4 },
        {
          yPercent: speed / 4,
          ease: 'none',
          scrollTrigger: {
            trigger: pano,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });
    const caption = pano.querySelector('.panorama-caption');
    if (caption) {
      gsap.fromTo(caption, { opacity: 0, y: 60 }, {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: pano, start: 'top 70%', toggleActions: 'play none none reverse' }
      });
    }
  });

  /* ---- bento card stagger ---- */
  gsap.utils.toArray('.bento').forEach((grid) => {
    gsap.from(grid.children, {
      opacity: 0, y: 40, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: grid, start: 'top 85%' }
    });
  });

  /* ---- timeline stagger (about page) ---- */
  gsap.utils.toArray('.timeline').forEach((tl) => {
    gsap.from(tl.children, {
      opacity: 0, x: -30, duration: 0.7, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: tl, start: 'top 85%' }
    });
  });

  /* ---- hero fade-in on load ---- */
  gsap.from('.hero-inner > *', {
    opacity: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.2
  });

  /* ---- background videos (panorama bands + reel): only play while visible ---- */
  const bgVideos = document.querySelectorAll('.pano-video, .reel-video');
  if (bgVideos.length) {
    const vidObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const vid = entry.target;
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      });
    }, { threshold: 0.25 });
    bgVideos.forEach((vid) => vidObserver.observe(vid));
  }

  /* ---- interactive video reel (homepage "Recent Work") ----
     Hidden on phones (see the mobile CSS breakpoint) to keep the landing
     page from feeling busy, so skip setting it up there entirely — no point
     wiring vehicle buttons/dots or fetching its first clip for a section
     nobody on mobile will ever see. */
  const reel = document.getElementById('reel');
  if (reel && window.innerWidth > 760) {
    const VEHICLES = [
      { name: 'Cadillac Escalade', clips: [
        { file: 'escalade_02_grille.mp4', title: 'Grille Detail' },
        { file: 'escalade_03_foamwash.mp4', title: 'Foam Wash' },
        { file: 'escalade_04_process.mp4', title: 'Process' }
      ] },
      { name: 'Porsche Cayman GT4', clips: [
        { file: 'cayman_gt4_01.mp4', title: 'Angle 1' },
        { file: 'cayman_gt4_02.mp4', title: 'Angle 2' },
        { file: 'cayman_gt4_03.mp4', title: 'Angle 3' },
        { file: 'cayman_gt4_04.mp4', title: 'Angle 4' },
        { file: 'cayman_gt4_05.mp4', title: 'Angle 5' },
        { file: 'cayman_gt4_06.mp4', title: 'Angle 6' }
      ] },
      { name: 'Audi RS5', clips: [
        { file: 'rs5_01.mp4', title: 'Angle 1' },
        { file: 'rs5_02.mp4', title: 'Angle 2' },
        { file: 'rs5_03.mp4', title: 'Angle 3' }
      ] },
      { name: 'Lamborghini Gallardo', clips: [
        { file: 'gallardo_01.mp4', title: 'Angle 1' },
        { file: 'gallardo_02.mp4', title: 'Angle 2' },
        { file: 'gallardo_03.mp4', title: 'Angle 3' },
        { file: 'gallardo_04.mp4', title: 'Angle 4' },
        { file: 'gallardo_05.mp4', title: 'Angle 5' }
      ] },
      { name: 'Mercedes-Benz 560 SL', clips: [
        { file: 'mercedes_560sl_01.mp4', title: 'Angle 1' },
        { file: 'mercedes_560sl_02.mp4', title: 'Angle 2' },
        { file: 'mercedes_560sl_03.mp4', title: 'Angle 3' },
        { file: 'mercedes_560sl_04.mp4', title: 'Angle 4' },
        { file: 'mercedes_560sl_05.mp4', title: 'Angle 5' }
      ] }
    ];

    const videoEl = document.getElementById('reelVideo');
    const titleEl = document.getElementById('reelClipTitle');
    const vehEl = document.getElementById('reelClipVeh');
    const vehiclesEl = document.getElementById('reelVehicles');
    const dotsEl = document.getElementById('reelDots');
    const prevBtn = document.getElementById('reelPrev');
    const nextBtn = document.getElementById('reelNext');

    let vIndex = 1; // start on Cayman (matches initial video src in HTML)
    let cIndex = 0;

    function renderVehicleButtons() {
      vehiclesEl.innerHTML = '';
      VEHICLES.forEach((v, i) => {
        const btn = document.createElement('button');
        btn.className = 'reel-veh-btn' + (i === vIndex ? ' active' : '');
        btn.textContent = v.name;
        btn.addEventListener('click', () => { vIndex = i; cIndex = 0; update(true); });
        vehiclesEl.appendChild(btn);
      });
    }

    function renderDots() {
      dotsEl.innerHTML = '';
      VEHICLES[vIndex].clips.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'reel-dot' + (i === cIndex ? ' active' : '');
        dot.setAttribute('aria-label', 'Angle ' + (i + 1));
        dot.addEventListener('click', () => { cIndex = i; update(true); });
        dotsEl.appendChild(dot);
      });
    }

    /* Each clip now plays to its own natural end before the reel advances —
       previously a flat 7s timer cut every clip at the same point regardless
       of its actual length, which meant anything happening after 7s into a
       longer clip (e.g. the 560 SL seat-wipe clips, several of which run
       17-29s) never got seen before the reel jumped to the next angle.
       A generous fallback timer is kept only as a safety net in case a clip
       fails to fire 'ended' (e.g. autoplay blocked, load error). */
    let fallbackTimer = null;
    function armFallback() {
      clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(nextClip, 40000);
    }
    function disarmFallback() {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    function update(userInitiated) {
      const vehicle = VEHICLES[vIndex];
      const clip = vehicle.clips[cIndex];
      videoEl.style.opacity = 0;
      setTimeout(() => {
        videoEl.src = 'assets/video/' + clip.file;
        videoEl.play().catch(() => {});
        videoEl.style.opacity = 1;
      }, 220);
      titleEl.textContent = clip.title;
      vehEl.textContent = vehicle.name;
      renderVehicleButtons();
      renderDots();
      armFallback();
    }

    function nextClip() {
      cIndex = (cIndex + 1) % VEHICLES[vIndex].clips.length;
      update(false);
    }
    function prevClip() {
      cIndex = (cIndex - 1 + VEHICLES[vIndex].clips.length) % VEHICLES[vIndex].clips.length;
      update(true);
    }

    // advance only once the current clip actually finishes playing
    videoEl.addEventListener('ended', () => {
      disarmFallback();
      nextClip();
    });

    nextBtn.addEventListener('click', () => { cIndex = (cIndex + 1) % VEHICLES[vIndex].clips.length; update(true); });
    prevBtn.addEventListener('click', prevClip);

    renderVehicleButtons();
    renderDots();
    armFallback();

    // pause playback (and the fallback timer) while the reel isn't on screen;
    // resume from the same clip when it scrolls back into view
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          disarmFallback();
        } else {
          videoEl.play().catch(() => {});
          armFallback();
        }
      });
    }, { threshold: 0.2 }).observe(reel);
  }
});
