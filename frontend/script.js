document.addEventListener("DOMContentLoaded", () => {
    initVenuesPage();
    initHomeImageAnimations();
    checkAuthErrors();
});

function initVenuesPage() {
    const dateInput = document.getElementById("venue-date-filter");
    if (!dateInput) return;

    refreshVenuesCalendarState();
    setInterval(refreshVenuesCalendarState, 60000);

    dateInput.addEventListener("change", () => loadVenuesTable());

    const searchInput = document.getElementById("venue-search");
    const venueFilter = document.getElementById("venue-name-filter");
    const statusFilter = document.getElementById("venue-status-filter");
    if (searchInput) searchInput.addEventListener("input", () => loadVenuesTable());
    if (venueFilter) venueFilter.addEventListener("change", () => loadVenuesTable());
    if (statusFilter) statusFilter.addEventListener("change", () => loadVenuesTable());
}

let venuesMonthKey = null;

function formatISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentMonthBounds() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return {
        year,
        month,
        min: formatISODate(now),
        max: formatISODate(new Date(year, month, lastDay)),
        today: formatISODate(now),
        monthKey: `${year}-${month}`,
    };
}

function isDateInCurrentMonth(dateStr, bounds) {
    if (!dateStr) return false;
    const [year, month] = dateStr.split("-").map(Number);
    return year === bounds.year && month === bounds.month + 1;
}

function refreshVenuesCalendarState() {
    const bounds = getCurrentMonthBounds();
    const headingEl = document.getElementById("venues-month-year");
    const dateInput = document.getElementById("venue-date-filter");

    if (headingEl) {
        headingEl.textContent = "Upcoming Bookings";
    }

    if (!dateInput) return;

    dateInput.min = bounds.min;
    dateInput.max = ""; // Allow any future date

    if (dateInput.value && dateInput.value < bounds.min) {
        dateInput.value = bounds.today;
    }
    
    if (venuesMonthKey === null) {
        venuesMonthKey = "initialized";
        loadVenuesTable();
    }
}

function formatDisplayDate(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatTimeToAMPM(timeStr) {
    if (!timeStr) return "—";
    const parts = String(timeStr).split(":");
    if (parts.length < 2) return timeStr;
    const hours = parts[0];
    const minutes = parts[1];
    let h = parseInt(hours, 10);
    const m = minutes || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12; 
    return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

let dropdownsPopulated = false;

async function loadVenuesTable() {
    const tbody = document.getElementById("venues-table-body");
    if (!tbody) return;

    const colCount = 7;
    const bounds = getCurrentMonthBounds();
    const dateInput = document.getElementById("venue-date-filter");
    let selectedDate = dateInput?.value || "";

    if (selectedDate && selectedDate < bounds.min) {
        selectedDate = bounds.today;
        if (dateInput) dateInput.value = bounds.today;
    }

    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 20px;">Loading...</td></tr>`;

    if (typeof fetchBookings === "undefined") {
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Error: supabase.js not loaded</td></tr>`;
        return;
    }

    const bookings = await fetchBookings();
    tbody.innerHTML = "";

    if (bookings.error && bookings.length === undefined) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No bookings found.</td></tr>`;
        return;
    }

    populateFilterDropdowns(bookings);

    const searchVal = (document.getElementById("venue-search")?.value || "").toLowerCase();
    const venueVal  = document.getElementById("venue-name-filter")?.value || "";
    const statusVal = document.getElementById("venue-status-filter")?.value || "";

    let filtered = bookings.filter((b) => b.Date >= bounds.min);
    if (selectedDate) {
        filtered = filtered.filter((b) => b.Date === selectedDate);
    }
    if (venueVal)  filtered = filtered.filter((b) => b.Venue === venueVal);
    if (statusVal) filtered = filtered.filter((b) => (b.Status || "") === statusVal);
    if (searchVal) filtered = filtered.filter((b) =>
        [b.Function_Name, b.Department_Name, b.Coordinator, String(b.contact_no || ""), b.Venue]
            .some((f) => (f || "").toLowerCase().includes(searchVal))
    );

    if (filtered.length === 0) {
        const dateText = selectedDate ? formatDisplayDate(selectedDate) : "upcoming dates";
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 20px;">No booked venues for ${dateText}.</td></tr>`;
        return;
    }

    filtered.forEach((b, index) => {
        const tr = document.createElement("tr");
        tr.className = "row-booked";
        tr.innerHTML = `
            <td class="row-index">${String(index + 1).padStart(2, "0")}</td>
            <td class="venue-name-cell">${b.Venue || "—"}</td>
            <td>${b.Department_Name || "—"}</td>
            <td>${b.Function_Name || "—"}</td>
            <td>${b.Date ? b.Date.split('-').reverse().join('-') : "—"}</td>
            <td>${formatTimeToAMPM(b['Time(from)'])}</td>
            <td>${formatTimeToAMPM(b['Time(to)'])}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateFilterDropdowns(bookings) {
    if (dropdownsPopulated) return;
    const venueSelect  = document.getElementById("venue-name-filter");
    const statusSelect = document.getElementById("venue-status-filter");
    if (venueSelect) {
        [...new Set(bookings.map((b) => b.Venue).filter(Boolean))].sort().forEach((v) => {
            if (!Array.from(venueSelect.options).some(opt => opt.value === v)) {
                const opt = document.createElement("option");
                opt.value = v; opt.textContent = v;
                venueSelect.appendChild(opt);
            }
        });
    }
    if (statusSelect) {
        [...new Set(bookings.map((b) => b.Status).filter(Boolean))].sort().forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s; opt.textContent = s;
            statusSelect.appendChild(opt);
        });
    }
    dropdownsPopulated = true;
}

function clearVenueFilters() {
    const bounds = getCurrentMonthBounds();
    const searchInput  = document.getElementById("venue-search");
    const venueFilter  = document.getElementById("venue-name-filter");
    const dateInput    = document.getElementById("venue-date-filter");
    const statusFilter = document.getElementById("venue-status-filter");
    if (searchInput)  searchInput.value  = "";
    if (venueFilter)  venueFilter.value  = "";
    if (dateInput)    dateInput.value    = "";
    if (statusFilter) statusFilter.value = "";
    loadVenuesTable();
}

function initHomeImageAnimations() {
    if (!document.querySelector(".facilities-showcase-container")) return;

    const loadedUrls = new Map();

    function preloadImage(url) {
        if (loadedUrls.has(url)) return loadedUrls.get(url);

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve(url);
            img.onerror = reject;
            img.src = url;
        });

        loadedUrls.set(url, promise);
        return promise;
    }

    function stashBackgroundUrl(el) {
        const url = getBackgroundUrl(el);
        if (url) {
            el.dataset.bg = url;
            el.style.backgroundImage = "none";
        }
        return url;
    }

    function revealFrame(canvas, frame, url) {
        frame.style.backgroundImage = `url("${url}")`;
        canvas.classList.remove("image-slide-pending");
        requestAnimationFrame(() => {
            canvas.classList.add("image-slide-in");
        });
    }

    const heroCanvas = document.querySelector(".hero-frame-section .hero-image-canvas");
    if (heroCanvas) {
        heroCanvas.classList.add("image-launch-pending");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                heroCanvas.classList.remove("image-launch-pending");
                heroCanvas.classList.add("image-launch-in");
            });
        });
    }

    const heroLogo = document.querySelector(".hero-inserted-logo");
    if (heroLogo) {
        heroLogo.classList.add("logo-launch-in");
    }

    const lazyCanvases = document.querySelectorAll(
        ".facilities-showcase-container .hero-image-canvas"
    );

    lazyCanvases.forEach((canvas) => {
        const frame = canvas.querySelector(".clean-image-frame");
        if (!frame) return;

        const url = stashBackgroundUrl(frame);
        if (!url) return;

        canvas.classList.add(
            "image-slide-pending",
            canvas.classList.contains("canvas-left") ? "slide-from-left" : "slide-from-right"
        );
    });

    if (lazyCanvases.length === 0 || !("IntersectionObserver" in window)) return;

    const scrollObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const canvas = entry.target;
                scrollObserver.unobserve(canvas);

                const frame = canvas.querySelector(".clean-image-frame");
                const url = frame?.dataset.bg;
                if (!frame || !url) return;

                preloadImage(url)
                    .then(() => revealFrame(canvas, frame, url))
                    .catch(() => {
                        frame.style.backgroundImage = `url("${url}")`;
                        canvas.classList.remove("image-slide-pending");
                        canvas.classList.add("image-slide-in");
                    });
            });
        },
        { rootMargin: "60px", threshold: 0.15 }
    );

    lazyCanvases.forEach((canvas) => scrollObserver.observe(canvas));
}

function getBackgroundUrl(el) {
    if (el.dataset.bg) return el.dataset.bg;

    const inline = el.style.backgroundImage;
    if (inline && inline !== "none") {
        const match = inline.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) return match[1];
    }

    return null;
}

function checkAuthErrors() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');
    
    if (errorDesc && (errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid'))) {
        showAuthErrorModal();
        // Clean up the URL so it doesn't show again on refresh
        window.history.replaceState(null, null, window.location.pathname);
    }
}

function showAuthErrorModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#ffffff';
    modalContent.style.padding = '40px';
    modalContent.style.borderRadius = '12px';
    modalContent.style.maxWidth = '400px';
    modalContent.style.textAlign = 'center';
    modalContent.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    modalContent.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    modalContent.style.transform = 'translateY(20px)';
    modalContent.style.transition = 'transform 0.3s ease';
    
    const icon = document.createElement('div');
    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    icon.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Link Expired';
    title.style.marginTop = '0';
    title.style.marginBottom = '15px';
    title.style.color = '#2d3748';
    title.style.fontSize = '24px';
    
    const message = document.createElement('p');
    message.textContent = 'Your password reset link has expired or is invalid. Please request a new one from the login page.';
    message.style.color = '#718096';
    message.style.lineHeight = '1.5';
    message.style.marginBottom = '30px';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '15px';
    buttonContainer.style.justifyContent = 'center';
    
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Go to Login';
    loginBtn.className = 'btn-primary-blue';
    loginBtn.style.padding = '10px 20px';
    loginBtn.style.border = 'none';
    loginBtn.style.borderRadius = '6px';
    loginBtn.style.cursor = 'pointer';
    loginBtn.style.fontWeight = '600';
    loginBtn.style.backgroundColor = '#1d4ed8'; // standard primary blue
    loginBtn.style.color = 'white';
    loginBtn.onclick = () => {
        const inSubfolder = window.location.pathname.includes('/venues/');
        window.location.href = inSubfolder ? '../login/login.html' : 'login/login.html';
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.backgroundColor = '#e2e8f0';
    closeBtn.style.color = '#4a5568';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = '600';
    closeBtn.onclick = () => {
        modal.style.opacity = '0';
        modalContent.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    };
    
    buttonContainer.appendChild(closeBtn);
    buttonContainer.appendChild(loginBtn);
    
    modalContent.appendChild(icon);
    modalContent.appendChild(title);
    modalContent.appendChild(message);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Trigger animation
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'translateY(0)';
    });
}
