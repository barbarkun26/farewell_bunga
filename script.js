(function () {
  "use strict";

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const topbar = document.getElementById("topbar");
  const progressBar = document.querySelector(".scroll-progress span");
  const timeline = document.getElementById("timeline");
  const timelineFill = document.querySelector(".timeline-fill");
  const chapterLinks = Array.from(document.querySelectorAll(".chapter-nav a"));
  const chapterSections = Array.from(document.querySelectorAll("[data-chapter-section]"));

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  let ticking = false;

  function updateScrollState() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? clamp(scrollTop / maxScroll, 0, 1) : 0;

    if (progressBar) {
      progressBar.style.transform = "scaleX(" + progress + ")";
    }

    if (topbar) {
      topbar.classList.toggle("is-scrolled", scrollTop > 24);
    }

    if (timeline && timelineFill) {
      const rect = timeline.getBoundingClientRect();
      const lineProgress = clamp((window.innerHeight * 0.72 - rect.top) / rect.height, 0, 1);
      timelineFill.style.transform = "scaleY(" + lineProgress + ")";

      const chapters = timeline.querySelectorAll(".chapter");
      chapters.forEach(function (ch) {
        const cRect = ch.getBoundingClientRect();
        const mark = ch.querySelector(".chapter-mark");
        if (mark) {
          mark.classList.toggle("is-reached", cRect.top < window.innerHeight * 0.75);
        }
      });
    }

    ticking = false;
  }

  function requestScrollUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollState);
    }
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  updateScrollState();

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -9% 0px",
      threshold: 0.12
    });

    document.querySelectorAll("[data-reveal]").forEach(function (element) {
      const delay = element.getAttribute("data-delay");
      if (delay) {
        element.style.setProperty("--reveal-delay", delay + "ms");
      }
      revealObserver.observe(element);
    });

    const chapterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        chapterLinks.forEach(function (link) {
          const isCurrent = link.getAttribute("data-chapter") === id;
          link.classList.toggle("is-active", isCurrent);
          if (isCurrent) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    }, {
      rootMargin: "-38% 0px -54% 0px",
      threshold: 0
    });

    chapterSections.forEach(function (section) {
      chapterObserver.observe(section);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (element) {
      element.classList.add("is-visible");
    });
  }

  function animateCounter(element) {
    const target = Number(element.getAttribute("data-count"));
    const usePadding = element.getAttribute("data-pad") === "2";
    const duration = 1500;
    const start = performance.now();

    function frame(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const value = Math.round(target * eased);
      element.textContent = usePadding ? String(value).padStart(2, "0") : String(value);
      if (elapsed < 1) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  const stats = document.querySelector(".honor-stats");
  if (stats && "IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        stats.querySelectorAll("[data-count]").forEach(animateCounter);
        counterObserver.disconnect();
      });
    }, { threshold: 0.35 });
    counterObserver.observe(stats);
  }

  function createPetals(field) {
    if (!field || reduceMotion) return;
    const amount = Number(field.getAttribute("data-petals")) || 8;
    const colors = ["#d6a441", "#efd4d6", "#f4e3b2", "#c97c87", "#fbf6ec"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < amount; index += 1) {
      const petal = document.createElement("span");
      petal.className = "petal";
      petal.style.setProperty("--left", (Math.random() * 96 + 2).toFixed(2) + "%");
      petal.style.setProperty("--size", (5 + Math.random() * 7).toFixed(1) + "px");
      petal.style.setProperty("--duration", (9 + Math.random() * 11).toFixed(2) + "s");
      petal.style.setProperty("--delay", (-Math.random() * 14).toFixed(2) + "s");
      petal.style.setProperty("--drift", (Math.random() * 150 - 75).toFixed(0) + "px");
      petal.style.setProperty("--color", colors[index % colors.length]);
      fragment.appendChild(petal);
    }

    field.appendChild(fragment);
  }

  document.querySelectorAll("[data-petals]").forEach(createPetals);

  const confettiCanvas = document.getElementById("confetti");
  const confettiContext = confettiCanvas ? confettiCanvas.getContext("2d") : null;
  let confettiParticles = [];
  let confettiRunning = false;
  const confettiColors = ["#d9a441", "#f1d18d", "#00a39d", "#f7f0e3", "#c97c87", "#ffffff"];

  function resizeConfetti() {
    if (!confettiCanvas || !confettiContext) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = Math.floor(window.innerWidth * ratio);
    confettiCanvas.height = Math.floor(window.innerHeight * ratio);
    confettiContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawConfetti() {
    if (!confettiContext) return;
    confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

    confettiParticles = confettiParticles.filter(function (particle) {
      return particle.life > 0 && particle.y < window.innerHeight + 40;
    });

    confettiParticles.forEach(function (particle) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.11;
      particle.vx *= 0.994;
      particle.vy *= 0.996;
      particle.rotation += particle.spin;
      particle.life -= 1;

      confettiContext.save();
      confettiContext.globalAlpha = Math.max(0, Math.min(1, particle.life / 55));
      confettiContext.translate(particle.x, particle.y);
      confettiContext.rotate(particle.rotation);
      confettiContext.fillStyle = particle.color;

      if (particle.shape === "circle") {
        confettiContext.beginPath();
        confettiContext.arc(0, 0, particle.size * 0.45, 0, Math.PI * 2);
        confettiContext.fill();
      } else if (particle.shape === "star") {
        confettiContext.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const radius = point % 2 === 0 ? particle.size * 0.8 : particle.size * 0.24;
          const angle = (Math.PI / 4) * point;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) confettiContext.moveTo(x, y);
          else confettiContext.lineTo(x, y);
        }
        confettiContext.closePath();
        confettiContext.fill();
      } else {
        confettiContext.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size * 0.5);
      }

      confettiContext.restore();
    });

    if (confettiParticles.length > 0) {
      window.requestAnimationFrame(drawConfetti);
    } else {
      confettiRunning = false;
      confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function launchConfetti(x, y, amount, spread) {
    if (!confettiCanvas || !confettiContext || reduceMotion) return;
    resizeConfetti();

    for (let index = 0; index < amount; index += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const speed = 3 + Math.random() * 9;
      const shapeRoll = Math.random();
      confettiParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2.4,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 9,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.22,
        life: 150 + Math.random() * 100,
        shape: shapeRoll < 0.16 ? "circle" : shapeRoll < 0.27 ? "star" : "rect"
      });
    }

    if (!confettiRunning) {
      confettiRunning = true;
      window.requestAnimationFrame(drawConfetti);
    }
  }

  if (confettiCanvas) {
    resizeConfetti();
    window.addEventListener("resize", function () {
      if (!confettiRunning) resizeConfetti();
    });

  }

  const closing = document.getElementById("closing");
  if (closing && "IntersectionObserver" in window && !reduceMotion) {
    let celebrated = false;
    const closingObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || celebrated) return;
        celebrated = true;
        window.setTimeout(function () {
          launchConfetti(window.innerWidth * 0.12, window.innerHeight * 0.74, 60, 1.4);
          launchConfetti(window.innerWidth * 0.88, window.innerHeight * 0.74, 60, 1.4);
        }, 420);
        closingObserver.disconnect();
      });
    }, { threshold: 0.4 });
    closingObserver.observe(closing);
  }

  /* --- 1. Web Audio API Synthesizer (Melodi Kenangan & SFX) --- */
  let audioCtx = null;
  let audioPlaying = false;
  let melodyTimer = null;
  let melodyStep = 0;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // Warm, gentle pentatonic arpeggio notes (frequencies in Hz)
  const melodyNotes = [
    261.63, 329.63, 392.00, 440.00, 523.25, 392.00, 329.63, 440.00,
    523.25, 587.33, 659.25, 523.25, 440.00, 392.00, 329.63, 261.63
  ];

  function playTone(freq, duration, type, volume) {
    if (!audioCtx || reduceMotion) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume || 0.08, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playSFX(type) {
    if (reduceMotion) return;
    initAudio();
    if (!audioCtx) return;

    if (type === "crack") {
      playTone(180, 0.15, "triangle", 0.18);
      playTone(320, 0.12, "sine", 0.1);
    } else if (type === "paper") {
      playTone(520, 0.08, "sine", 0.06);
      window.setTimeout(function () { playTone(680, 0.09, "sine", 0.04); }, 40);
    } else if (type === "bell") {
      playTone(1046.5, 0.6, "sine", 0.12);
      playTone(1318.5, 0.8, "triangle", 0.08);
    } else if (type === "chime") {
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (f, i) {
        window.setTimeout(function () { playTone(f, 0.7, "sine", 0.1); }, i * 80);
      });
    }
  }

  function stepMelody() {
    if (!audioPlaying) return;
    const note = melodyNotes[melodyStep % melodyNotes.length];
    playTone(note, 1.4, "sine", 0.06);
    if (melodyStep % 4 === 0) {
      playTone(note / 2, 1.8, "triangle", 0.04);
    }
    melodyStep++;
    melodyTimer = window.setTimeout(stepMelody, 420);
  }

  const audioToggle = document.getElementById("audio-toggle");
  if (audioToggle) {
    audioToggle.addEventListener("click", function () {
      initAudio();
      audioPlaying = !audioPlaying;
      audioToggle.classList.toggle("is-active", audioPlaying);
      const textSpan = audioToggle.querySelector(".audio-pill-text");
      if (audioPlaying) {
        if (textSpan) textSpan.textContent = "Melodi Aktif ♫";
        stepMelody();
      } else {
        if (textSpan) textSpan.textContent = "Melodi Kenangan";
        if (melodyTimer) clearTimeout(melodyTimer);
      }
    });
  }

  /* --- 2. Interactive Envelope & 3D Wax Seal Mechanics --- */
  const envelopeWrap = document.getElementById("envelope-wrap");
  const waxSealBtn = document.getElementById("wax-seal-btn");
  const envelopePocket = document.getElementById("envelope-pocket");
  const envelopeToggleBtn = document.getElementById("envelope-toggle-btn");
  const letterFoldBtn = document.getElementById("letter-fold-btn");
  const letterFoldBottomBtn = document.getElementById("letter-fold-bottom-btn");

  function openEnvelope() {
    if (!envelopeWrap || envelopeWrap.classList.contains("is-opened")) return;
    initAudio();
    playSFX("crack");
    window.setTimeout(function () { playSFX("paper"); }, 120);

    envelopeWrap.classList.remove("is-sealed");
    envelopeWrap.classList.add("is-opened");

    if (waxSealBtn) {
      const rect = waxSealBtn.getBoundingClientRect();
      launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 45, 1.4);
    }

    if (envelopeToggleBtn) {
      const txt = envelopeToggleBtn.querySelector(".env-text");
      if (txt) txt.textContent = "Lipat Amplop Kembali";
      envelopeToggleBtn.setAttribute("aria-expanded", "true");
    }
  }

  function sealEnvelope() {
    if (!envelopeWrap || envelopeWrap.classList.contains("is-sealed")) return;
    initAudio();
    playSFX("paper");
    window.setTimeout(function () { playSFX("bell"); }, 320);

    envelopeWrap.classList.remove("is-opened");
    envelopeWrap.classList.add("is-sealed");

    // Scroll smoothly to keep envelope in frame if user was reading lower down
    const letterSection = document.getElementById("letter");
    if (letterSection) {
      const topOffset = letterSection.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }

    if (envelopeToggleBtn) {
      const txt = envelopeToggleBtn.querySelector(".env-text");
      if (txt) txt.textContent = "Buka Amplop Surat";
      envelopeToggleBtn.setAttribute("aria-expanded", "false");
    }
  }

  function toggleEnvelope() {
    if (!envelopeWrap) return;
    if (envelopeWrap.classList.contains("is-opened")) {
      sealEnvelope();
    } else {
      openEnvelope();
    }
  }

  if (waxSealBtn) {
    waxSealBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openEnvelope();
    });
  }

  if (envelopePocket) {
    envelopePocket.addEventListener("click", function (e) {
      if (envelopeWrap && envelopeWrap.classList.contains("is-sealed")) {
        e.stopPropagation();
        openEnvelope();
      }
    });
  }

  if (envelopeToggleBtn) {
    envelopeToggleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleEnvelope();
    });
  }

  if (letterFoldBtn) {
    letterFoldBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      sealEnvelope();
    });
  }

  if (letterFoldBottomBtn) {
    letterFoldBottomBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      sealEnvelope();
    });
  }

  if (envelopeWrap) {
    envelopeWrap.addEventListener("click", function (e) {
      if (envelopeWrap.classList.contains("is-sealed")) {
        // Any click on the sealed envelope opens it!
        openEnvelope();
      }
    });
  }

  // Hero button: scrolls smoothly to #letter, highlights the seal with glowing spotlight
  const heroLetterBtn = document.querySelector(".hero-actions a[href='#letter']");
  if (heroLetterBtn) {
    heroLetterBtn.addEventListener("click", function () {
      if (waxSealBtn) {
        waxSealBtn.classList.add("is-spotlight");
        window.setTimeout(function () {
          waxSealBtn.classList.remove("is-spotlight");
        }, 2600);
      }
    });
  }

  /* --- 3. 3D Tilt & Holographic Specular Foil on Certificate --- */
  const certCard = document.getElementById("certificate-card");
  if (certCard && !reduceMotion) {
    certCard.addEventListener("mousemove", function (e) {
      const rect = certCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      certCard.style.setProperty("--foil-x", (x * 100).toFixed(1) + "%");
      certCard.style.setProperty("--foil-y", (y * 100).toFixed(1) + "%");
      const rotX = (0.5 - y) * 12;
      const rotY = (x - 0.5) * 14;
      certCard.style.transform = "perspective(1000px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg) scale(1.015)";
    });

    certCard.addEventListener("mouseleave", function () {
      certCard.style.transform = "";
    });
  }

  /* --- 4. Certificate High-Res Modal --- */
  const certModal = document.getElementById("cert-modal");
  const openCertModalBtn = document.getElementById("open-cert-modal");
  const closeCertModalBtn = document.getElementById("cert-modal-close");
  const certPrintBtn = document.getElementById("cert-print-btn");

  if (certModal && openCertModalBtn) {
    openCertModalBtn.addEventListener("click", function () {
      playSFX("bell");
      if (typeof certModal.showModal === "function") {
        certModal.showModal();
      } else {
        certModal.setAttribute("open", "");
      }
      document.body.style.overflow = "hidden";
    });

    function closeCertModal() {
      if (typeof certModal.close === "function") certModal.close();
      else certModal.removeAttribute("open");
      document.body.style.overflow = "";
    }

    if (closeCertModalBtn) closeCertModalBtn.addEventListener("click", closeCertModal);

    certModal.addEventListener("click", function (e) {
      if (e.target === certModal) closeCertModal();
    });

    if (certPrintBtn) {
      certPrintBtn.addEventListener("click", function () {
        window.print();
      });
    }
  }

  /* --- 5. Wishes Wall Studio & Persistent Storage --- */
  const wishModal = document.getElementById("wish-modal");
  const openWishModalBtn = document.getElementById("open-wish-modal");
  const closeWishModalBtn = document.getElementById("wish-modal-close");
  const cancelWishModalBtn = document.getElementById("wish-modal-cancel");
  const wishForm = document.getElementById("wish-form");
  const wishMessage = document.getElementById("wish-message");
  const wishCharCount = document.getElementById("wish-char-count");
  const noteWall = document.getElementById("note-wall");

  if (openWishModalBtn && wishModal) {
    openWishModalBtn.addEventListener("click", function () {
      playSFX("paper");
      if (typeof wishModal.showModal === "function") wishModal.showModal();
      else wishModal.setAttribute("open", "");
      document.body.style.overflow = "hidden";
    });

    function closeWishModal() {
      if (typeof wishModal.close === "function") wishModal.close();
      else wishModal.removeAttribute("open");
      document.body.style.overflow = "";
    }

    if (closeWishModalBtn) closeWishModalBtn.addEventListener("click", closeWishModal);
    if (cancelWishModalBtn) cancelWishModalBtn.addEventListener("click", closeWishModal);

    wishModal.addEventListener("click", function (e) {
      if (e.target === wishModal) closeWishModal();
    });

    if (wishMessage && wishCharCount) {
      wishMessage.addEventListener("input", function () {
        wishCharCount.textContent = wishMessage.value.length + " / 280";
      });
    }

    document.querySelectorAll(".color-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        document.querySelectorAll(".color-option").forEach(function (o) { o.classList.remove("is-active"); });
        opt.classList.add("is-active");
      });
    });

    document.querySelectorAll(".sticker-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        document.querySelectorAll(".sticker-option").forEach(function (o) { o.classList.remove("is-active"); });
        opt.classList.add("is-active");
      });
    });

    function escapeHTML(str) {
      const p = document.createElement("p");
      p.textContent = str || "";
      return p.innerHTML;
    }

    function appendNoteToWall(noteData, isNew) {
      if (!noteWall) return;
      const article = document.createElement("article");
      article.className = "note note--" + (noteData.color || "cream") + (isNew ? " is-new-pin" : "");
      article.setAttribute("data-note-id", noteData.id);

      article.innerHTML =
        '<span class="note-tape" aria-hidden="true"></span>' +
        '<span class="note-sticker" aria-hidden="true">' + (noteData.sticker || "🌸") + '</span>' +
        '<p class="note-quote">' + escapeHTML(noteData.quote) + '</p>' +
        '<div class="note-foot">' +
          '<footer>— ' + escapeHTML(noteData.name) + (noteData.role ? ' <small>(' + escapeHTML(noteData.role) + ')</small>' : '') + '</footer>' +
          '<button class="note-like" type="button" aria-label="Beri cinta"><span class="like-icon">🤍</span> <span class="like-num">' + (noteData.likes || 1) + '</span></button>' +
        '</div>';

      attachLikeListener(article.querySelector(".note-like"));
      noteWall.prepend(article);
    }

    try {
      const savedWishes = JSON.parse(localStorage.getItem("ratu_wishes_custom") || "[]");
      savedWishes.forEach(function (w) { appendNoteToWall(w, false); });
    } catch (e) {}

    if (wishForm) {
      wishForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const nameVal = (document.getElementById("wish-name").value || "").trim();
        const roleVal = (document.getElementById("wish-role").value || "").trim();
        const messageVal = (wishMessage.value || "").trim();
        const selectedColorOpt = document.querySelector(".color-option.is-active input");
        const colorVal = selectedColorOpt ? selectedColorOpt.value : "cream";
        const selectedStickerOpt = document.querySelector(".sticker-option.is-active input");
        const stickerVal = selectedStickerOpt ? selectedStickerOpt.value : "🌸";

        if (!nameVal || !messageVal) return;

        const newWish = {
          id: Date.now(),
          name: nameVal,
          role: roleVal,
          color: colorVal,
          sticker: stickerVal,
          quote: messageVal,
          likes: 1
        };

        try {
          const currentList = JSON.parse(localStorage.getItem("ratu_wishes_custom") || "[]");
          currentList.push(newWish);
          localStorage.setItem("ratu_wishes_custom", JSON.stringify(currentList));
        } catch (err) {}

        appendNoteToWall(newWish, true);
        playSFX("paper");
        playSFX("bell");
        launchConfetti(window.innerWidth * 0.5, window.innerHeight * 0.5, 45, 1.5);

        closeWishModal();
        wishForm.reset();
        if (wishCharCount) wishCharCount.textContent = "0 / 280";
      });
    }
  }

  function spawnFloatingHeart(x, y) {
    const heart = document.createElement("span");
    heart.className = "like-fly-heart";
    heart.textContent = "💖";
    heart.style.left = x + "px";
    heart.style.top = y + "px";
    document.body.appendChild(heart);
    window.setTimeout(function () { heart.remove(); }, 1050);
  }

  function attachLikeListener(btn) {
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      playSFX("bell");
      const isLiked = btn.classList.contains("is-liked");
      const numSpan = btn.querySelector(".like-num");
      const iconSpan = btn.querySelector(".like-icon");
      let count = parseInt(numSpan ? numSpan.textContent : "0", 10) || 0;

      if (!isLiked) {
        btn.classList.add("is-liked");
        count += 1;
        if (iconSpan) iconSpan.textContent = "❤️";
        spawnFloatingHeart(e.clientX - 10, e.clientY - 20);
      } else {
        btn.classList.remove("is-liked");
        count = Math.max(0, count - 1);
        if (iconSpan) iconSpan.textContent = "🤍";
      }
      if (numSpan) numSpan.textContent = count;
    });
  }

  document.querySelectorAll(".note-like").forEach(attachLikeListener);

  /* --- 6. 3D Polaroid Flip Card in Gallery --- */
  document.querySelectorAll(".flip-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      playSFX("paper");
      const card = btn.closest(".polaroid-card");
      if (card) {
        card.classList.toggle("is-flipped");
      }
    });
  });

  /* --- 7. Enhanced Lightbox (Next/Prev/Counter & Keyboard) --- */
  const galleryItems = [
    { src: "Assets/asset1.jpeg", caption: "Great Honor Ceremony — Cinta Ratu Bunga Permatahati bersama pimpinan dan seluruh keluarga besar PPG." },
    { src: "Assets/asset3.jpeg", caption: "Senyum kebahagiaan Cinta Ratu Bunga Permatahati dengan buket bunga di depan landmark Gedung BSI Thamrin." },
    { src: "Assets/asset4.jpeg", caption: "Avenger of Policy — Superhero kebanggaan PPG yang siap menaklukkan setiap tantangan kebijakan dengan senyum dan kecerdasan." },
    { src: "Assets/asset2.jpeg", caption: "Kebersamaan hangat keluarga besar PPG bersama Bunga — kenangan yang akan selalu hidup di hati kita semua." }
  ];
  let currentPhotoIndex = 0;

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxCounter = document.getElementById("lightbox-counter");

  function setLightboxPhoto(index) {
    currentPhotoIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentPhotoIndex];
    if (lightboxImage) {
      lightboxImage.src = item.src;
      lightboxImage.alt = item.caption;
    }
    if (lightboxCaption) lightboxCaption.textContent = item.caption;
    if (lightboxCounter) lightboxCounter.textContent = String(currentPhotoIndex + 1).padStart(2, "0") + " / " + String(galleryItems.length).padStart(2, "0");
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (typeof lightbox.close === "function") lightbox.close();
    else lightbox.removeAttribute("open");
    document.body.style.overflow = "";
    if (lightboxImage) lightboxImage.src = "";
  }

  if (lightbox && lightboxImage && lightboxCaption) {
    document.querySelectorAll(".photo-button").forEach(function (button, idx) {
      button.addEventListener("click", function () {
        playSFX("bell");
        setLightboxPhoto(idx);
        document.body.style.overflow = "hidden";
        if (typeof lightbox.showModal === "function") lightbox.showModal();
        else lightbox.setAttribute("open", "");
      });
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", function () { setLightboxPhoto(currentPhotoIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener("click", function () { setLightboxPhoto(currentPhotoIndex + 1); });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener("close", function () {
      document.body.style.overflow = "";
      if (lightboxImage) lightboxImage.src = "";
    });

    window.addEventListener("keydown", function (e) {
      if (lightbox && lightbox.hasAttribute("open")) {
        if (e.key === "ArrowLeft") setLightboxPhoto(currentPhotoIndex - 1);
        else if (e.key === "ArrowRight") setLightboxPhoto(currentPhotoIndex + 1);
        else if (e.key === "Escape") closeLightbox();
      }
    });
  }

  /* --- Video Reel Play/Pause Controls --- */
  const videoEl = document.getElementById("memory-reel-video");
  const videoToggleBtn = document.getElementById("memory-video-toggle");
  const videoOverlay = document.querySelector(".video-controls-overlay");

  if (videoEl && videoToggleBtn) {
    function toggleVideoPlay() {
      if (videoEl.paused) {
        videoEl.play().then(function () {
          if (videoOverlay) videoOverlay.classList.add("is-playing");
          const playIcon = videoToggleBtn.querySelector(".play-icon");
          const pauseIcon = videoToggleBtn.querySelector(".pause-icon");
          if (playIcon) playIcon.style.display = "none";
          if (pauseIcon) pauseIcon.style.display = "block";
          const statusText = document.querySelector(".video-status-text");
          if (statusText) statusText.textContent = "Sentuh untuk Jeda Reel";
        }).catch(function (err) {
          console.warn("Video play error:", err);
        });
      } else {
        videoEl.pause();
        if (videoOverlay) videoOverlay.classList.remove("is-playing");
        const playIcon = videoToggleBtn.querySelector(".play-icon");
        const pauseIcon = videoToggleBtn.querySelector(".pause-icon");
        if (playIcon) playIcon.style.display = "block";
        if (pauseIcon) pauseIcon.style.display = "none";
        const statusText = document.querySelector(".video-status-text");
        if (statusText) statusText.textContent = "Sentuh untuk Putar Reel";
      }
    }

    videoToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleVideoPlay();
    });

    if (videoOverlay) {
      videoOverlay.addEventListener("click", function () {
        toggleVideoPlay();
      });
    }

    videoEl.addEventListener("ended", function () {
      if (videoOverlay) videoOverlay.classList.remove("is-playing");
      const playIcon = videoToggleBtn.querySelector(".play-icon");
      const pauseIcon = videoToggleBtn.querySelector(".pause-icon");
      if (playIcon) playIcon.style.display = "block";
      if (pauseIcon) pauseIcon.style.display = "none";
    });
  }

  /* --- Memory Cards Like Buttons --- */
  document.querySelectorAll(".memory-like-btn").forEach(function (btn) {
    const memoryId = btn.getAttribute("data-memory-id") || "mem_default";
    const savedState = localStorage.getItem("memory_like_" + memoryId);
    const countEl = btn.querySelector(".like-count");
    const heartEl = btn.querySelector(".like-heart");

    if (savedState === "liked") {
      btn.classList.add("is-liked");
      if (heartEl) heartEl.textContent = "❤️";
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      playSFX("bell");
      const isLiked = btn.classList.contains("is-liked");
      let currentVal = parseInt(countEl ? countEl.textContent : "0", 10) || 0;

      if (!isLiked) {
        btn.classList.add("is-liked");
        currentVal += 1;
        if (heartEl) heartEl.textContent = "❤️";
        localStorage.setItem("memory_like_" + memoryId, "liked");
        spawnFloatingHeart(e.clientX - 10, e.clientY - 20);
      } else {
        btn.classList.remove("is-liked");
        currentVal = Math.max(0, currentVal - 1);
        if (heartEl) heartEl.textContent = "🤍";
        localStorage.removeItem("memory_like_" + memoryId);
      }

      if (countEl) countEl.textContent = currentVal;
    });
  });

  /* --- 8. Floating Reaction Dock & Drifting Emojis --- */
  const reactionDock = document.getElementById("reaction-dock");
  const reactionParticles = document.getElementById("reaction-particles");
  const reactionTotalNum = document.querySelector(".rx-count-num");
  let totalReactions = parseInt(localStorage.getItem("ratu_rx_total") || "142", 10);
  if (reactionTotalNum) reactionTotalNum.textContent = totalReactions;

  function spawnDriftingEmoji(emoji, originX) {
    if (!reactionParticles || reduceMotion) return;
    const el = document.createElement("span");
    el.className = "floating-rx-emoji";
    el.textContent = emoji;
    const x = originX + (Math.random() * 60 - 30);
    const y = window.innerHeight - 70;
    const size = 20 + Math.random() * 18;
    const rot = (Math.random() * 60 - 30).toFixed(0) + "deg";

    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.fontSize = size + "px";
    el.style.setProperty("--rx-rot", rot);

    reactionParticles.appendChild(el);
    window.setTimeout(function () { el.remove(); }, 2250);
  }

  document.querySelectorAll(".reaction-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      playSFX("bell");
      const emoji = btn.getAttribute("data-reaction") || "💖";
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;

      for (let i = 0; i < 6; i++) {
        window.setTimeout(function () {
          spawnDriftingEmoji(emoji, x);
        }, i * 90);
      }

      totalReactions += 1;
      if (reactionTotalNum) reactionTotalNum.textContent = totalReactions;
      try { localStorage.setItem("ratu_rx_total", String(totalReactions)); } catch (e) {}
    });
  });

  /* --- 9. Mega Celebration Cannon & Banner --- */
  const celebrateButton = document.getElementById("celebrate");
  const celebrateBanner = document.getElementById("celebrate-banner");
  const bannerClose = document.getElementById("banner-close");

  if (celebrateButton) {
    celebrateButton.addEventListener("click", function () {
      playSFX("chime");

      launchConfetti(window.innerWidth * 0.5, window.innerHeight * 0.6, 140, 2.4);
      window.setTimeout(function () {
        launchConfetti(window.innerWidth * 0.15, window.innerHeight * 0.72, 70, 1.6);
        launchConfetti(window.innerWidth * 0.85, window.innerHeight * 0.72, 70, 1.6);
      }, 240);
      window.setTimeout(function () {
        launchConfetti(window.innerWidth * 0.5, window.innerHeight * 0.4, 90, 2.8);
      }, 520);

      if (celebrateBanner) {
        celebrateBanner.classList.add("is-active");
        window.setTimeout(function () {
          celebrateBanner.classList.remove("is-active");
        }, 8500);
      }
    });
  }

  if (bannerClose && celebrateBanner) {
    bannerClose.addEventListener("click", function () {
      celebrateBanner.classList.remove("is-active");
    });
  }

  /* --- 10. Cursor Stardust & Petal Trail --- */
  const cursorCanvas = document.getElementById("cursor-canvas");
  const cursorCtx = cursorCanvas ? cursorCanvas.getContext("2d") : null;
  let cursorParticles = [];
  let cursorRunning = false;
  let lastMouseTime = 0;

  function resizeCursorCanvas() {
    if (!cursorCanvas || !cursorCtx) return;
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
  }

  function drawCursorTrail() {
    if (!cursorCtx) return;
    cursorCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    cursorParticles = cursorParticles.filter(function (p) {
      return p.life > 0;
    });

    cursorParticles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.rotation += p.spin;
      p.life -= 1;

      cursorCtx.save();
      cursorCtx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.65;
      cursorCtx.translate(p.x, p.y);
      cursorCtx.rotate(p.rotation);
      cursorCtx.fillStyle = p.color;

      if (p.isPetal) {
        cursorCtx.beginPath();
        cursorCtx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        cursorCtx.fill();
      } else {
        cursorCtx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i;
          const outer = p.size;
          const inner = p.size * 0.22;
          cursorCtx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          const midAngle = angle + Math.PI / 4;
          cursorCtx.lineTo(Math.cos(midAngle) * inner, Math.sin(midAngle) * inner);
        }
        cursorCtx.closePath();
        cursorCtx.fill();
      }

      cursorCtx.restore();
    });

    if (cursorParticles.length > 0) {
      window.requestAnimationFrame(drawCursorTrail);
    } else {
      cursorRunning = false;
    }
  }

  if (cursorCanvas && !reduceMotion) {
    resizeCursorCanvas();
    window.addEventListener("resize", resizeCursorCanvas);

    const sparkColors = ["#ffd972", "#d9a441", "#f7f0e3", "#efd4d6", "#ffffff"];
    window.addEventListener("mousemove", function (e) {
      const now = performance.now();
      if (now - lastMouseTime < 24) return;
      lastMouseTime = now;

      for (let i = 0; i < 2; i++) {
        cursorParticles.push({
          x: e.clientX + (Math.random() * 10 - 5),
          y: e.clientY + (Math.random() * 10 - 5),
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * -1.2,
          size: 2.5 + Math.random() * 4,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.15,
          life: 45 + Math.random() * 25,
          maxLife: 70,
          isPetal: Math.random() < 0.35
        });
      }

      if (!cursorRunning) {
        cursorRunning = true;
        window.requestAnimationFrame(drawCursorTrail);
      }
    });
  }

  /* --- 11. Copy and Share Utilities --- */
  const copyButton = document.getElementById("copy");
  if (copyButton) {
    copyButton.setAttribute("aria-live", "polite");
    copyButton.addEventListener("click", function () {
      const url = window.location.href.split("#")[0];
      const original = copyButton.textContent;

      function showCopied() {
        copyButton.textContent = "Tautan tersalin";
        window.setTimeout(function () {
          copyButton.textContent = original;
        }, 2200);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(showCopied).catch(function () {
          copyButton.textContent = "Salin manual: " + url;
        });
      } else {
        const helper = document.createElement("textarea");
        helper.value = url;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        try {
          document.execCommand("copy");
          showCopied();
        } catch (error) {
          copyButton.textContent = "Salin manual: " + url;
        }
        helper.remove();
      }
    });
  }

  const shareButton = document.getElementById("share");
  if (shareButton) {
    const cleanUrl = window.location.href.split("#")[0];
    const shareText = "Terima kasih Ratu, great honor untuk perjalananmu di PPG — buka kenangannya: " + cleanUrl;
    shareButton.href = "https://wa.me/?text=" + encodeURIComponent(shareText);

    shareButton.addEventListener("click", function (event) {
      if (navigator.share) {
        event.preventDefault();
        navigator.share({
          title: "Cinta Ratu Bunga Permatahati — Great Honor",
          text: "Terima kasih Ratu, great honor untuk perjalananmu di PPG.",
          url: cleanUrl
        }).catch(function () {
          window.open(shareButton.href, "_blank", "noopener,noreferrer");
        });
      }
    });
  }
})();
