// =============== Data mock ===============
const locationsData = {
  pho24: {
    title: "Phở 24 Restaurant",
    description:
      "Traditional phở restaurant chain. Fast service, modern ambiance, disability-friendly.",
    services: [
      "Sign language support",
      "Guide dog area",
      "Disability-friendly delivery",
    ],
    mapUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Ph%E1%BB%9F+24,+H%C3%A0+N%E1%BB%99i,+Vi%E1%BB%87t+Nam",
  },
  vietduc: {
    title: "Việt Đức Hospital",
    description:
      "Leading surgical hospital with wide pathways, multi-floor elevators, serving large patient volumes.",
    services: [
      "Sign language interpreter",
      "Wheelchairs at entrance",
      "Priority for people with disabilities",
    ],
    mapUrl:
      "https://www.google.com/maps/dir/?api=1&destination=B%E1%BB%87nh+vi%E1%BB%87n+Vi%E1%BB%87t+%C4%90%E1%BB%A9c,+H%C3%A0+N%E1%BB%99i,+Vi%E1%BB%87t+Nam",
  },
};

// ==== Nav height → CSS var (so hero fills screen under nav)
const nav = document.querySelector('nav[role="navigation"]');
function updateNavHeight() {
  const h = Math.ceil(nav.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--nav-h", h + "px");
}
window.addEventListener("load", updateNavHeight);
window.addEventListener("resize", updateNavHeight);
window.addEventListener("orientationchange", updateNavHeight);
new ResizeObserver(updateNavHeight).observe(nav);

// Live region
const live = document.getElementById("sr-live");
const announce = (msg) => {
  live.textContent = msg;
};

// High Contrast
const contrastBtn = document.getElementById("btn-contrast");
contrastBtn.addEventListener("click", () => {
  const root = document.documentElement;
  const isContrast = root.getAttribute("data-theme") === "contrast";
  root.setAttribute("data-theme", isContrast ? "light" : "contrast");
  contrastBtn.setAttribute("aria-pressed", String(!isContrast));
  announce(
    isContrast ? "High contrast mode disabled" : "High contrast mode enabled"
  );
});

// Read page
document.getElementById("btn-read").addEventListener("click", () => {
  const content = document.querySelector("main").innerText;
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
  announce("Reading page content");
});

// Mobile nav toggle
const navToggle = document.querySelector(".nav__toggle");
const navList = document.getElementById("nav-list");
navToggle.addEventListener("click", () => {
  const isOpen = navList.classList.toggle("nav__list--open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  announce(isOpen ? "Menu opened" : "Menu closed");
});

// ===== Search form (guard if not present) =====
const heroForm = document.getElementById("hero-search");
if (heroForm) {
  heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    const cat = document.getElementById("filter-category").value;
    const dis = document.getElementById("filter-disability").value;
    announce(
      `Searching for: "${q}" • Category: ${cat || "any"} • Disability: ${
        dis || "any"
      }`
    );
  });
}

// Voice Recognition Setup
const recognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = "en-US";

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const activeElement = document.activeElement;
  if (activeElement.id === "search-input") {
    document.getElementById("search-input").value = transcript;
    announce(`Search input set to: ${transcript}`);
  } else if (activeElement.id === "comment") {
    document.getElementById("comment").value = transcript;
    announce(`Comment set to: ${transcript}`);
  }
  recognition.stop();
};

recognition.onerror = (event) => {
  announce(`Voice recognition error: ${event.error}`);
  recognition.stop();
};

// Voice Search Button
document.getElementById("voice-search").addEventListener("click", () => {
  recognition.start();
  announce("Voice search activated. Please speak now.");
});

// Voice Comment Button
document.getElementById("voice-comment").addEventListener("click", () => {
  recognition.start();
  announce("Voice comment activated. Please speak now.");
});

// ===== Modals (focus trap + ESC) =====
function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function handler(e) {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === "Escape") {
      if (modal.id === "detail-modal") closeDetailModal();
      if (modal.id === "review-modal") closeReviewModal();
    }
  }
  modal.addEventListener("keydown", handler);
  return () => modal.removeEventListener("keydown", handler);
}

// Review Modal
const reviewModal = document.getElementById("review-modal");
let untrapReview = null;
function openReviewModal(place) {
  reviewModal.setAttribute("aria-hidden", "false");
  const where = document.getElementById("where");
  where.value = place || "";
  reviewModal.style.display = "grid";
  document.body.style.overflow = "hidden";
  untrapReview = trapFocus(reviewModal);
  document.getElementById("review-title").focus({ preventScroll: true });
  announce(`Opened review form for ${place}`);
}
function closeReviewModal() {
  reviewModal.setAttribute("aria-hidden", "true");
  reviewModal.style.display = "none";
  document.body.style.overflow = "";
  if (untrapReview) untrapReview();
  announce("Closed review form");
}
document
  .querySelector('[data-close="review"]')
  .addEventListener("click", closeReviewModal);

// Detail Modal
const detailModal = document.getElementById("detail-modal");
let untrapDetail = null;

// Build/ensure the ratings container exists in the modal
function ensureDetailRatingsContainer() {
  let container = document.getElementById("detail-ratings");
  if (!container) {
    const desc = document.getElementById("detail-description");
    const heading = document.createElement("h3");
    heading.textContent = "Accessibility by Disability";
    container = document.createElement("div");
    container.id = "detail-ratings";
    container.className = "ratings-grid";
    // insert after description
    desc.insertAdjacentElement("afterend", container);
    container.insertAdjacentElement("beforebegin", heading);
  }
  return container;
}

function openDetailModal(key, ratings = { blind: 0, hearing: 0, mobility: 0 }) {
  const data = locationsData[key];
  if (!data) return;

  // Title/desc/services
  document.getElementById("detail-title").textContent = data.title;
  document.getElementById("detail-description").textContent = data.description;

  const ul = document.getElementById("detail-services");
  ul.innerHTML = "";
  data.services.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    ul.appendChild(li);
  });
  document.getElementById("detail-map-link").href = data.mapUrl;

  // Disability ratings
  const container = ensureDetailRatingsContainer();
  const row = (label, value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return `
        <div class="rating-line" role="group" aria-label="${label} ${v}%">
          <span class="rating-label">${label}</span>
          <span class="progress" role="progressbar"
                aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"
                aria-label="${v}% accessibility for ${label.toLowerCase()}">
            <span class="progress__bar" style="width:${v}%"></span>
          </span>
          <span class="rating-num">${v}</span>
        </div>`;
  };
  container.innerHTML =
    row("Blind", ratings.blind) +
    row("Hearing", ratings.hearing) +
    row("Mobility", ratings.mobility);

  // Open modal
  detailModal.setAttribute("aria-hidden", "false");
  detailModal.style.display = "grid";
  document.body.style.overflow = "hidden";
  untrapDetail = trapFocus(detailModal);
  document.getElementById("detail-title").focus({ preventScroll: true });
  announce(`Opened details for ${data.title}`);
}
function closeDetailModal() {
  detailModal.setAttribute("aria-hidden", "true");
  detailModal.style.display = "none";
  document.body.style.overflow = "";
  if (untrapDetail) untrapDetail();
  announce("Closed details page");
}
document
  .querySelector('[data-close="detail"]')
  .addEventListener("click", closeDetailModal);

// Open handlers (delegated) — now passes disability ratings from the card
document.addEventListener("click", (e) => {
  const btnDetail = e.target.closest("[data-detail]");
  const btnReview = e.target.closest("[data-review]");
  if (btnDetail) {
    const key = btnDetail.getAttribute("data-detail");
    const card = btnDetail.closest(".card");
    const ratings = {
      blind: Number(card?.dataset.blind || 0),
      hearing: Number(card?.dataset.hearing || 0),
      mobility: Number(card?.dataset.mobility || 0),
    };
    openDetailModal(key, ratings);
  }
  if (btnReview) {
    openReviewModal(btnReview.getAttribute("data-review"));
  }
});

// Backdrop click to close
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      if (modal.id === "detail-modal") closeDetailModal();
      if (modal.id === "review-modal") closeReviewModal();
    }
  });
});

// Hydrate summary numbers on cards (overall/service/facility)
function hydrateCards() {
  document.querySelectorAll(".card--shop").forEach((card) => {
    const b = +card.dataset.blind || 0;
    const h = +card.dataset.hearing || 0;
    const m = +card.dataset.mobility || 0;
    const s = +card.dataset.service || 0;
    const f = +card.dataset.facility || 0;

    const overall = Math.round((b + h + m) / 3);
    const outOverall = card.querySelector(".js-overall");
    const outService = card.querySelector(".js-service");
    const outFacility = card.querySelector(".js-facility");

    if (outOverall) {
      outOverall.textContent = overall;
      outOverall.parentElement.setAttribute(
        "aria-label",
        `Overall accessibility ${overall} out of 100`
      );
    }
    if (outService) outService.textContent = s + "%";
    if (outFacility) outFacility.textContent = f + "%";
  });
}

// Run after DOM is ready
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", hydrateCards)
  : hydrateCards();

// Photo upload toggle
const photoInput = document.getElementById("photo");
const photoSection = document.querySelectorAll("#photo-upload-section")[0];
photoInput.addEventListener("change", () => {
  photoSection.style.display = photoInput.files.length > 0 ? "block" : "none";
});

// Form submission (mock)
document.getElementById("review-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const location = formData.get("where");
  const service = formData.get("service");
  const facility = formData.get("facility");
  const comment = formData.get("comment") || "No additional feedback";
  const photoAlt = formData.get("photo-alt");

  if (
    (photoInput.files.length > 0 && !photoAlt) ||
    !location ||
    !service ||
    !facility
  ) {
    announce("Please fill all required fields.");
    return;
  }

  announce(`Review submitted for ${location}. Thank you!`);
  closeReviewModal();
});

// nav bar drop down
// Dropdown Toggle
document.querySelectorAll('.dropdown__toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = toggle.nextElementSibling;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';

    // Close all other dropdowns
    document.querySelectorAll('.dropdown__menu').forEach(m => {
      m.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.dropdown__toggle').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
    });

    // Toggle current
    if (!expanded) {
      menu.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
});
// Keep arrow state when the menu is opened via the hamburger toggle
document.querySelectorAll('.nav__link--dropdown').forEach(toggle => {
  toggle.addEventListener('click', e => {
    // On mobile the whole list is hidden/shown by .nav__list--open
    const list = document.getElementById('nav-list');
    if (list.classList.contains('nav__list--open')) {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
    }
  });
});

// log in page
// Sign In Page Logic
if (document.querySelector('.signin-form')) {
  const form = document.querySelector('.signin-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
  });

  // Simple client-side validation
  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    // Email
    if (!email.value.includes('@') || !email.value.includes('.')) {
      document.getElementById('email-error').textContent = 'Please enter a valid email.';
      valid = false;
    } else {
      document.getElementById('email-error').textContent = '';
    }

    // Password
    if (password.value.length < 8) {
      document.getElementById('password-error').textContent = 'Password must be at least 8 characters.';
      valid = false;
    } else {
      document.getElementById('password-error').textContent = '';
    }

    if (valid) {
      alert('Signed in successfully! (Demo)');
      // window.location.href = 'dashboard.html';
    }
  });
}

// ========== VIEW MORE FUNCTIONALITY ==========
document.addEventListener("DOMContentLoaded", function () {
  const cards = document.querySelectorAll("#results .card");
  const btnMore = document.getElementById("btn-more");
  const cardsPerPage = 3;
  let currentIndex = 3; // 3 card đầu đã hiển thị

  // Ẩn các card từ thứ 4 trở đi
  cards.forEach((card, i) => {
    if (i >= 3) card.classList.add("hidden");
  });

  if (btnMore) {
    btnMore.addEventListener("click", function () {
      let count = 0;
      for (let i = currentIndex; i < cards.length && count < cardsPerPage; i++) {
        cards[i].classList.remove("hidden");
        currentIndex++;
        count++;
      }

      // Nếu đã hiện hết → ẩn nút
      if (currentIndex >= cards.length) {
        btnMore.style.display = "none";
        // Thông báo cho screen reader
        document.getElementById("sr-live").textContent = "All locations have been loaded.";
      } else {
        document.getElementById("sr-live").textContent = `${count} more locations loaded.`;
      }
    });
  }
});