const entrance = document.querySelector(".entrance");
const seal = document.querySelector(".seal");
const site = document.querySelector(".site");
const photoWindow = document.querySelector(".photo-window");
const sourcePhotoCards = [...photoWindow.querySelectorAll(".photo-card")];
const photoCount = sourcePhotoCards.length;
const photoCards = [...sourcePhotoCards];
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");
const storyScroll = document.querySelector(".story-scroll");
const storyStage = document.querySelector(".story-stage");
const storyChapters = [...document.querySelectorAll(".story-chapter")];
const gallerySection = document.querySelector(".gallery-section");
const galleryStage = gallerySection.querySelector(".gallery-stage");
const galleryTrack = gallerySection.querySelector(".gallery-track");
const galleryCategories = [...galleryTrack.querySelectorAll(".gallery-category")];
const galleryPhotos = [...galleryTrack.querySelectorAll(".gallery-photo")];
const galleryProgress = gallerySection.querySelector(".gallery-progress-fill");
const galleryCurrentCategory = gallerySection.querySelector(
  ".gallery-current-category",
);
const lightbox = document.querySelector("#gallery-lightbox");
const lightboxImage = lightbox.querySelector(".lightbox-image");
const lightboxCategory = lightbox.querySelector(".lightbox-category");
const lightboxCounter = lightbox.querySelector(".lightbox-counter");
const lightboxClose = lightbox.querySelector(".lightbox-close");
const lightboxPrevious = lightbox.querySelector(".lightbox-previous");
const lightboxNext = lightbox.querySelector(".lightbox-next");
const lightboxViewer = lightbox.querySelector(".lightbox-viewer");
const lightboxImageWrap = lightbox.querySelector(".lightbox-image-wrap");
const scratchCard = document.querySelector(".scratch-card");
const scratchCanvas = document.querySelector(".scratch-surface");
const scratchInstructions = document.querySelector("#scratch-instructions");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const countdownValues = {
  days: document.querySelector('[data-countdown="days"]'),
  hours: document.querySelector('[data-countdown="hours"]'),
  minutes: document.querySelector('[data-countdown="minutes"]'),
  seconds: document.querySelector('[data-countdown="seconds"]'),
};
const footerCountdown = document.querySelector("[data-footer-countdown]");
const weddingTime = new Date("2027-02-13T10:00:00+01:00").getTime();

let sequenceCount = 1;
let storyUpdatePending = false;
let galleryUpdatePending = false;
let galleryScrollDistance = 0;
let lightboxIndex = -1;
let lightboxOpen = false;
let lightboxClosingTimer;
let lightboxRestoreState;
let lightboxPointerStart;
let scratchContext;
let scratchScale = 1;
let scratching = false;
let lastScratchPoint = null;
let heroOffset = 0;
let heroVelocity = 0;
let heroDragPointerId = null;
let heroLastPointerX = 0;
let heroDragSamples = [];
let heroPreviousFrame = 0;

function addPhotoSequence() {
  sourcePhotoCards.forEach((card) => {
    const duplicate = card.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.querySelector("img").alt = "";
    photoWindow.append(duplicate);
    photoCards.push(duplicate);
  });
  sequenceCount += 1;
}

let opening = false;
let galleryStarted = false;

function updateCountdown() {
  const remaining = Math.max(0, weddingTime - Date.now());
  const seconds = Math.floor(remaining / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainderSeconds = seconds % 60;

  countdownValues.days.textContent = String(days).padStart(2, "0");
  countdownValues.hours.textContent = String(hours).padStart(2, "0");
  countdownValues.minutes.textContent = String(minutes).padStart(2, "0");
  countdownValues.seconds.textContent = String(remainderSeconds).padStart(2, "0");
  footerCountdown.textContent = String(days);

  if (remaining === 0) {
    window.clearInterval(countdownInterval);
  }
}

function updateStoryReveal() {
  storyUpdatePending = false;

  const sectionBounds = storyScroll.getBoundingClientRect();
  const scrollDistance = storyScroll.offsetHeight - site.clientHeight;
  const progress =
    scrollDistance > 0
      ? Math.max(0, Math.min(1, -sectionBounds.top / scrollDistance))
      : 0;
  const transitionCount = storyChapters.length - 1;
  const transitionPosition = progress * transitionCount;
  const transitionIndex = Math.min(
    Math.floor(transitionPosition),
    transitionCount - 1,
  );
  const transitionProgress =
    progress >= 1 ? 1 : transitionPosition - transitionIndex;
  const visibleChapterIndex =
    progress >= 1 || transitionProgress >= 0.5
      ? transitionIndex + 1
      : transitionIndex;
  const stageWidth = storyStage.clientWidth;
  const stageHeight = storyStage.clientHeight;

  storyChapters.forEach((chapter, index) => {
    chapter.style.zIndex = String(index);

    if (index === 0) {
      chapter.setAttribute("aria-hidden", String(visibleChapterIndex !== index));
      chapter.inert = visibleChapterIndex !== index;
      return;
    }

    const mobileStory = window.matchMedia("(max-width: 760px)").matches;
    const portraitBounds = storyChapters[index - 1]
      .querySelector(".story-portrait")
      .getBoundingClientRect();
    const portraitWidth = mobileStory
      ? Math.min(window.innerWidth * 0.34, 190)
      : portraitBounds.width;
    const portraitHeight = mobileStory
      ? Math.min(window.innerHeight * 0.42, 350)
      : portraitBounds.height;
    const centerX = mobileStory
      ? stageWidth * 0.94 - portraitWidth / 2
      : portraitBounds.left + portraitBounds.width / 2;
    const centerY = mobileStory
      ? stageHeight * 0.27 + portraitHeight / 2
      : portraitBounds.top + portraitBounds.height / 2;
    const farthestCorner = Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(stageWidth - centerX, centerY),
      Math.hypot(centerX, stageHeight - centerY),
      Math.hypot(stageWidth - centerX, stageHeight - centerY),
    );
    const startingRadius = Math.max(14, portraitWidth * 0.06);
    const chapterProgress =
      index < transitionIndex + 1
        ? 1
        : index === transitionIndex + 1
          ? transitionProgress
          : 0;
    const radius =
      startingRadius + (farthestCorner - startingRadius) * chapterProgress;

    chapter.style.setProperty("--story-reveal-x", `${centerX}px`);
    chapter.style.setProperty("--story-reveal-y", `${centerY}px`);
    chapter.style.setProperty("--story-reveal-radius", `${radius}px`);
    chapter.setAttribute("aria-hidden", String(visibleChapterIndex !== index));
    chapter.inert = visibleChapterIndex !== index;
  });
}

function updateGallery() {
  galleryUpdatePending = false;

  const sectionTop = gallerySection.getBoundingClientRect().top;
  const progress =
    galleryScrollDistance > 0
      ? Math.max(0, Math.min(1, -sectionTop / galleryScrollDistance))
      : 0;
  const translateX = galleryScrollDistance * progress;
  const activeCategory =
    galleryCategories.find(
      (category) => translateX < category.offsetLeft + category.offsetWidth,
    ) ?? galleryCategories.at(-1);

  galleryTrack.style.transform = `translate3d(${-translateX}px, 0, 0)`;
  galleryProgress.style.transform = `scaleX(${progress})`;
  galleryCurrentCategory.textContent = activeCategory.dataset.galleryLabel;
}

function requestGalleryUpdate() {
  if (galleryUpdatePending) {
    return;
  }

  galleryUpdatePending = true;
  requestAnimationFrame(updateGallery);
}

function configureGallery() {
  gallerySection.style.height = `${site.clientHeight}px`;
  galleryScrollDistance = Math.max(
    0,
    galleryTrack.scrollWidth - galleryStage.clientWidth,
  );
  gallerySection.style.height = `${
    site.clientHeight + galleryScrollDistance
  }px`;
  requestGalleryUpdate();
}

function updateLightboxPhoto() {
  const photoLink = galleryPhotos[lightboxIndex];
  const photo = photoLink.querySelector("img");
  const category = photoLink.closest(".gallery-category");
  const categoryTitle = category.querySelector(".gallery-category-title");

  lightboxImage.src = photo.currentSrc || photoLink.href;
  lightboxImage.alt = photo.alt;
  lightboxCategory.textContent = categoryTitle.textContent
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  lightboxCounter.textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(galleryPhotos.length).padStart(2, "0")}`;
  lightboxPrevious.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === galleryPhotos.length - 1;
}

function openLightbox(index, opener) {
  if (lightboxOpen || index < 0 || index >= galleryPhotos.length) {
    return;
  }

  lightboxOpen = true;
  lightboxIndex = index;
  lightboxRestoreState = {
    activeElement: opener,
    ariaHidden: site.getAttribute("aria-hidden"),
    inert: site.inert,
    overflowY: site.style.overflowY,
    scrollTop: site.scrollTop,
  };
  updateLightboxPhoto();
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.getBoundingClientRect();
  lightbox.classList.add("is-open");
  requestAnimationFrame(() => {
    site.inert = true;
    site.setAttribute("aria-hidden", "true");
    requestAnimationFrame(() => {
      lightboxClose.focus({ preventScroll: true });
    });
    requestGalleryUpdate();
  });
}

function closeLightbox() {
  if (!lightboxOpen) {
    return;
  }

  lightboxOpen = false;
  lightboxPointerStart = null;
  lightbox.classList.remove("is-open");
  window.clearTimeout(lightboxClosingTimer);
  lightboxClosingTimer = window.setTimeout(() => {
    const restoreState = lightboxRestoreState;
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    site.inert = restoreState.inert;
    if (restoreState.ariaHidden === null) {
      site.removeAttribute("aria-hidden");
    } else {
      site.setAttribute("aria-hidden", restoreState.ariaHidden);
    }
    site.style.overflowY = restoreState.overflowY;
    site.scrollTop = restoreState.scrollTop;
    restoreState.activeElement.focus({ preventScroll: true });
    lightboxRestoreState = null;
  }, reducedMotion.matches ? 20 : 280);
}

function moveLightbox(direction) {
  if (!lightboxOpen) {
    return;
  }

  const nextIndex = lightboxIndex + direction;
  if (nextIndex < 0 || nextIndex >= galleryPhotos.length) {
    return;
  }

  lightboxIndex = nextIndex;
  updateLightboxPhoto();
}

galleryTrack.addEventListener("click", (event) => {
  const photoLink = event.target.closest(".gallery-photo");
  if (!photoLink) {
    return;
  }

  event.preventDefault();
  openLightbox(galleryPhotos.indexOf(photoLink), photoLink);
});

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrevious.addEventListener("click", () => moveLightbox(-1));
lightboxNext.addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", (event) => {
  if (
    event.target === lightbox ||
    event.target === lightboxViewer ||
    event.target === lightboxImageWrap
  ) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (!lightboxOpen) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeLightbox();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveLightbox(-1);
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveLightbox(1);
    return;
  }
  if (event.key === "Tab") {
    const focusableControls = [
      lightboxClose,
      lightboxPrevious,
      lightboxNext,
    ].filter((control) => !control.disabled);
    const firstControl = focusableControls[0];
    const lastControl = focusableControls.at(-1);

    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault();
      firstControl.focus();
    }
  }
});

lightboxViewer.addEventListener("pointerdown", (event) => {
  if (
    !lightboxOpen ||
    event.pointerType === "mouse" ||
    event.target.closest("button")
  ) {
    return;
  }

  lightboxPointerStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
});

document.addEventListener("pointerup", (event) => {
  if (!lightboxPointerStart || event.pointerId !== lightboxPointerStart.id) {
    return;
  }

  const deltaX = event.clientX - lightboxPointerStart.x;
  const deltaY = event.clientY - lightboxPointerStart.y;
  lightboxPointerStart = null;

  if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
    moveLightbox(deltaX < 0 ? 1 : -1);
  }
});

document.addEventListener("pointercancel", () => {
  lightboxPointerStart = null;
});

function requestStoryRevealUpdate() {
  if (storyUpdatePending) {
    return;
  }

  storyUpdatePending = true;
  requestAnimationFrame(updateStoryReveal);
}

function drawTrackedText(context, text, centerX, y, letterSpacing) {
  const width = [...text].reduce(
    (total, character) => total + context.measureText(character).width + letterSpacing,
    -letterSpacing,
  );
  let x = centerX - width / 2;

  [...text].forEach((character) => {
    context.fillText(character, x, y);
    x += context.measureText(character).width + letterSpacing;
  });
}

function paintScratchSurface() {
  const bounds = scratchCard.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return;
  }

  scratchScale = Math.min(window.devicePixelRatio || 1, 2);
  scratchCanvas.width = Math.round(bounds.width * scratchScale);
  scratchCanvas.height = Math.round(bounds.height * scratchScale);
  scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
  scratchContext.scale(scratchScale, scratchScale);

  const gradient = scratchContext.createLinearGradient(0, 0, bounds.width, bounds.height);
  gradient.addColorStop(0, "#f5dbe1");
  gradient.addColorStop(0.42, "#efc2cf");
  gradient.addColorStop(0.58, "#f7d8df");
  gradient.addColorStop(1, "#eebdca");
  scratchContext.fillStyle = gradient;
  scratchContext.fillRect(0, 0, bounds.width, bounds.height);

  const highlight = scratchContext.createLinearGradient(
    bounds.width * 0.28,
    0,
    bounds.width * 0.78,
    bounds.height,
  );
  highlight.addColorStop(0, "rgba(255,255,255,0)");
  highlight.addColorStop(0.48, "rgba(255,255,255,0.22)");
  highlight.addColorStop(0.62, "rgba(255,255,255,0)");
  scratchContext.fillStyle = highlight;
  scratchContext.fillRect(0, 0, bounds.width, bounds.height);

  let seed = 2027;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = 0; index < bounds.width * bounds.height * 0.055; index += 1) {
    const alpha = 0.08 + random() * 0.15;
    scratchContext.fillStyle = `rgba(255,255,255,${alpha})`;
    scratchContext.fillRect(random() * bounds.width, random() * bounds.height, 1, 1);
  }

  scratchContext.strokeStyle = "rgba(126, 48, 69, 0.34)";
  scratchContext.lineWidth = 1;
  scratchContext.strokeRect(9.5, 9.5, bounds.width - 19, bounds.height - 19);

  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  scratchContext.textAlign = "left";
  scratchContext.textBaseline = "middle";
  scratchContext.fillStyle = "#68233a";
  scratchContext.font = "600 11px Arial, sans-serif";
  drawTrackedText(scratchContext, "SCRATCH HERE", centerX, centerY - 34, 3.2);
  scratchContext.textAlign = "center";
  scratchContext.font = "32px 'Times New Roman', serif";
  scratchContext.fillText("✦", centerX - 76, centerY + 1);
  scratchContext.fillText("V&B", centerX, centerY + 1);
  scratchContext.fillText("✦", centerX + 76, centerY + 1);
  scratchContext.fillStyle = "#7b3b50";
  scratchContext.font = "10px Arial, sans-serif";
  scratchContext.fillText("to reveal our wedding date", centerX, centerY + 34);
}

function scratchAt(event) {
  const bounds = scratchCanvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;

  scratchContext.save();
  scratchContext.globalCompositeOperation = "destination-out";
  if (lastScratchPoint) {
    scratchContext.beginPath();
    scratchContext.moveTo(lastScratchPoint.x, lastScratchPoint.y);
    scratchContext.lineTo(x, y);
    scratchContext.lineWidth = 44;
    scratchContext.lineCap = "round";
    scratchContext.lineJoin = "round";
    scratchContext.stroke();
  }
  scratchContext.beginPath();
  scratchContext.arc(x, y, 22, 0, Math.PI * 2);
  scratchContext.fill();
  scratchContext.restore();
  lastScratchPoint = { x, y };
}

function revealScratchCard() {
  scratchContext.clearRect(
    0,
    0,
    scratchCanvas.width / scratchScale,
    scratchCanvas.height / scratchScale,
  );
  scratchCard.classList.add("is-revealed");
  scratchCard.setAttribute(
    "aria-label",
    "Wedding date revealed: Saturday, 13 February 2027, 10AM Prompt, Lagos",
  );
  scratchInstructions.textContent = "See you there ♥";
  scratching = false;
}

function checkScratchProgress() {
  const pixels = scratchContext.getImageData(
    0,
    0,
    scratchCanvas.width,
    scratchCanvas.height,
  ).data;
  let checked = 0;
  let cleared = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    checked += 1;
    if (pixels[index] < 16) {
      cleared += 1;
    }
  }

  if (cleared / checked >= 0.45) {
    revealScratchCard();
  }
}

scratchCard.addEventListener("pointerdown", (event) => {
  if (scratchCard.classList.contains("is-revealed")) {
    return;
  }

  scratching = true;
  lastScratchPoint = null;
  scratchCard.setPointerCapture(event.pointerId);
  scratchAt(event);
});

scratchCard.addEventListener("pointermove", (event) => {
  if (scratching) {
    scratchAt(event);
  }
});

scratchCard.addEventListener("pointerup", () => {
  if (scratching) {
    scratching = false;
    lastScratchPoint = null;
    checkScratchProgress();
  }
});

scratchCard.addEventListener("pointercancel", () => {
  scratching = false;
  lastScratchPoint = null;
});

scratchCard.addEventListener("keydown", (event) => {
  if (
    (event.key === "Enter" || event.key === " ") &&
    !scratchCard.classList.contains("is-revealed")
  ) {
    event.preventDefault();
    revealScratchCard();
  }
});

paintScratchSurface();
window.addEventListener("resize", () => {
  if (!scratchCard.classList.contains("is-revealed")) {
    paintScratchSurface();
  }
});

const countdownInterval = window.setInterval(updateCountdown, 1000);
updateCountdown();
updateStoryReveal();
configureGallery();
site.addEventListener("scroll", requestStoryRevealUpdate, { passive: true });
site.addEventListener("scroll", requestGalleryUpdate, { passive: true });
window.addEventListener("resize", requestStoryRevealUpdate);
window.addEventListener("resize", configureGallery);
window.addEventListener("orientationchange", configureGallery);
galleryPhotos.forEach((photoLink) => {
  const image = photoLink.querySelector("img");
  if (!image.complete) {
    image.addEventListener("load", configureGallery, { once: true });
  }
});

if ("ResizeObserver" in window) {
  const galleryResizeObserver = new ResizeObserver(configureGallery);
  galleryResizeObserver.observe(galleryStage);
  galleryResizeObserver.observe(galleryTrack);
}

function positionPhotos(timestamp) {
  const elapsed = heroPreviousFrame
    ? Math.min((timestamp - heroPreviousFrame) / 1000, 0.05)
    : 0;
  heroPreviousFrame = timestamp;

  const viewportWidth = document.documentElement.clientWidth;
  const mobile = window.innerWidth <= 760;
  const cylinderRadius = viewportWidth * (mobile ? 0.82 : 0.48);

  if (heroDragPointerId === null) {
    if (!reducedMotion.matches) {
      heroOffset += 0.22 * elapsed;
    }
    if (Math.abs(heroVelocity) > 0.001) {
      heroOffset += heroVelocity * elapsed;
      heroVelocity *= Math.exp(-3.2 * elapsed);
    } else {
      heroVelocity = 0;
    }
  }

  const angleStep = (Math.PI * 2) / photoCount;
  const normalizedRotation = ((heroOffset % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const cardTop = mobile ? 92 : 112;

  photoCards.forEach((card, index) => {
    let angle = index * angleStep - normalizedRotation;
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));
    const x = cylinderRadius * Math.sin(angle);
    const z = cylinderRadius * (Math.cos(angle) - 1);
    const y = cardTop;
    const facing = (angle * 180) / Math.PI;

    card.style.transform =
      `translate3d(calc(50vw - 50% + ${x}px), ${y}px, ${z}px) rotateY(${facing}deg)`;
    card.style.zIndex = String(Math.round((Math.cos(angle) + 1) * 100));
  });

  if (!reducedMotion.matches || heroDragPointerId !== null || heroVelocity !== 0) {
    requestAnimationFrame(positionPhotos);
  }
}

function startGallery() {
  if (galleryStarted) {
    return;
  }

  galleryStarted = true;
  requestAnimationFrame(positionPhotos);
}

photoWindow.addEventListener("pointerdown", (event) => {
  if (
    heroDragPointerId !== null ||
    (event.pointerType === "mouse" && event.button !== 0) ||
    !(event.target instanceof Element) ||
    !event.target.closest(".photo-card")
  ) {
    return;
  }

  event.preventDefault();
  heroDragPointerId = event.pointerId;
  heroLastPointerX = event.clientX;
  heroVelocity = 0;
  heroDragSamples = [{ time: event.timeStamp, offset: heroOffset }];
  photoWindow.classList.add("is-dragging");
  photoWindow.setPointerCapture(event.pointerId);
  if (reducedMotion.matches) {
    requestAnimationFrame(positionPhotos);
  }
});

photoWindow.addEventListener("pointermove", (event) => {
  if (event.pointerId !== heroDragPointerId) {
    return;
  }

  const deltaX = event.clientX - heroLastPointerX;
  heroLastPointerX = event.clientX;
  const cylinderRadius = document.documentElement.clientWidth * (window.innerWidth <= 760 ? 0.82 : 0.48);\n  heroOffset -= deltaX / cylinderRadius;

  const sampleTime = event.timeStamp;
  heroDragSamples.push({ time: sampleTime, offset: heroOffset });
  while (
    heroDragSamples.length > 2 &&
    sampleTime - heroDragSamples[0].time > 100
  ) {
    heroDragSamples.shift();
  }
});

function finishHeroDrag(event) {
  if (event.pointerId !== heroDragPointerId) {
    return;
  }

  const firstSample = heroDragSamples[0];
  const lastSample = heroDragSamples.at(-1);
  const elapsed = lastSample.time - firstSample.time;
  if (elapsed > 0) {
    heroVelocity = Math.max(
      -1800,
      Math.min(
        1800,
        ((lastSample.offset - firstSample.offset) / elapsed) * 1000,
      ),
    );
  }

  const pointerId = heroDragPointerId;
  heroDragPointerId = null;
  heroDragSamples = [];
  photoWindow.classList.remove("is-dragging");
  if (photoWindow.hasPointerCapture(pointerId)) {
    photoWindow.releasePointerCapture(pointerId);
  }
}

photoWindow.addEventListener("pointerup", finishHeroDrag);
photoWindow.addEventListener("pointercancel", finishHeroDrag);
photoWindow.addEventListener("lostpointercapture", finishHeroDrag);
photoWindow.addEventListener("dragstart", (event) => event.preventDefault());

seal.addEventListener("click", () => {
  if (opening) {
    return;
  }

  opening = true;
  seal.disabled = true;
  seal.setAttribute("aria-label", "Opening our invitation");
  entrance.classList.add("is-opening");
  site.classList.add("is-visible");
  startGallery();

  window.setTimeout(
    () => {
      entrance.hidden = true;
      site.removeAttribute("inert");
      site.setAttribute("aria-hidden", "false");
    },
    reducedMotion.matches ? 60 : 1500,
  );
});

function setMenuOpen(isOpen) {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu",
  );
  navigation.classList.toggle("is-open", isOpen);
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

let smoothScrollFrame = 0;

function cancelSmoothScroll() {
  if (smoothScrollFrame) {
    cancelAnimationFrame(smoothScrollFrame);
    smoothScrollFrame = 0;
  }
}

function scrollToSection(target) {
  cancelSmoothScroll();
  const targetTop =
    site.scrollTop +
    target.getBoundingClientRect().top -
    site.getBoundingClientRect().top;

  if (reducedMotion.matches) {
    site.scrollTop = targetTop;
    return;
  }

  const startTop = site.scrollTop;
  const distance = targetTop - startTop;
  const duration = Math.min(1400, Math.max(700, Math.abs(distance) / 18));
  let startTime;

  function animateScroll(timestamp) {
    startTime ??= timestamp;
    const progress = Math.min(1, (timestamp - startTime) / duration);
    const easedProgress = 0.5 - Math.cos(Math.PI * progress) / 2;
    site.scrollTop = startTop + distance * easedProgress;

    if (progress < 1) {
      smoothScrollFrame = requestAnimationFrame(animateScroll);
    } else {
      smoothScrollFrame = 0;
    }
  }

  smoothScrollFrame = requestAnimationFrame(animateScroll);
}

document
  .querySelectorAll('.site a[href="#rsvp"], .invitation-cta[href="#invitation"]')
  .forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.hash);
      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToSection(target);
      history.replaceState(null, "", link.hash);
    });
  });

document
  .querySelectorAll(".footer-explore a, .footer-monogram, .footer-hashtag, .footer-back-top")
  .forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.hash);
      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToSection(target);
      history.replaceState(null, "", link.hash);
    });
  });

site.addEventListener("wheel", cancelSmoothScroll, { passive: true });
site.addEventListener("touchstart", cancelSmoothScroll, { passive: true });

navigation.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) {
    return;
  }

  cancelSmoothScroll();
  setMenuOpen(false);

  const target = document.querySelector(link.hash);
  if (!target) {
    return;
  }

  event.preventDefault();
  target.scrollIntoView({
    behavior: reducedMotion.matches ? "auto" : "smooth",
    block: "start",
  });
  history.replaceState(null, "", link.hash);
  menuToggle.focus({ preventScroll: true });
});

document.addEventListener("click", (event) => {
  if (
    menuToggle.getAttribute("aria-expanded") === "true" &&
    !navigation.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    setMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuToggle.getAttribute("aria-expanded") === "true"
  ) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) {
    setMenuOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (galleryStarted && reducedMotion.matches) {
    positionPhotos(performance.now());
  }
});

const rsvpCopyStatus = document.querySelector(".rsvp-copy-status");
let rsvpCopyResetTimer;

document.querySelectorAll(".rsvp-copy").forEach((button) => {
  button.addEventListener("click", () => {
    const number = button.dataset.copyNumber;

    const showCopied = () => {
      rsvpCopyStatus.textContent = `${number} copied to clipboard.`;
      button.textContent = "Copied";
      window.clearTimeout(rsvpCopyResetTimer);
      rsvpCopyResetTimer = window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1800);
    };

    const fallbackCopy = () => {
      const input = document.createElement("textarea");
      input.value = number;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();

      if (copied) {
        showCopied();
      } else {
        rsvpCopyStatus.textContent = "Could not copy the number. Please copy it manually.";
      }
    };

    rsvpCopyStatus.textContent = "";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(number).then(showCopied, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });
});

const registryCopyStatus = document.querySelector(".registry-copy-status");
const registryCopyTimers = new WeakMap();

document.querySelectorAll(".registry-copy").forEach((button) => {
  button.addEventListener("click", async () => {
    const accountNumber = button.dataset.registryCopy;

    const fallbackCopy = () => {
      const input = document.createElement("textarea");
      input.value = accountNumber;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.focus();
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      return copied;
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(accountNumber);
        } catch {
          if (!fallbackCopy()) {
            throw new Error("Clipboard copy command was unsuccessful.");
          }
        }
      } else if (!fallbackCopy()) {
        throw new Error("Clipboard copy command was unsuccessful.");
      }

      button.textContent = "Copied";
      button.classList.add("is-copied");
      registryCopyStatus.textContent = `${accountNumber} copied to clipboard.`;

      window.clearTimeout(registryCopyTimers.get(button));
      registryCopyTimers.set(
        button,
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1800),
      );
    } catch (error) {
      registryCopyStatus.textContent =
        "Could not copy the account number. Please copy it manually.";
      console.error("Could not copy registry account number.", error);
    }
  });
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const panel = document.getElementById(button.getAttribute("aria-controls"));

    button.setAttribute("aria-expanded", String(!expanded));
    panel.setAttribute("aria-hidden", String(expanded));
    panel.inert = expanded;
    panel.classList.toggle("is-open", !expanded);
  });
});
