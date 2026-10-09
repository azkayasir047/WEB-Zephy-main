// =========================================================
// HALAMAN ARTIKEL PUBLIK (artikel/art.html)
// ---------------------------------------------------------
// Mengambil artikel yang sudah Publish dari database
// (GET /api/articles) lalu menampilkannya sebagai kartu,
// lengkap dengan filter kategori dan pagination.
// =========================================================

(function () {

    const MAX_ITEMS = 6; // artikel per halaman

    const grid = document.getElementById("articleGrid");
    const pagination = document.getElementById("pagination");
    const pageNumbers = document.getElementById("pageNumbers");
    const prevBtn = pagination.querySelector(".prev-btn");
    const nextBtn = pagination.querySelector(".next-btn");
    const filterButtons = document.querySelectorAll("#articleFilter .filter-btn");

    let articles = [];
    let filter = "all";
    let currentPage = 1;

    const FALLBACK_IMAGE = "../assets/img/logo1.png";

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatTanggal(value) {
        if (!value) return "";
        return new Date(value).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function cardHtml(a) {

        const img = a.thumbnail || FALLBACK_IMAGE;

        return `
            <a href="baca.html?slug=${encodeURIComponent(a.slug)}" class="article-card">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(a.title)}" loading="lazy"
                     onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}'; this.style.objectFit='contain';">
                <div class="card-content">
                    <span class="article-category">${escapeHtml(a.category)}</span>
                    <h2>${escapeHtml(a.title)}</h2>
                    <p>${escapeHtml(a.excerpt)}</p>
                    <div class="article-meta">
                        <span><i class="fas fa-calendar"></i> ${formatTanggal(a.published_at)}</span>
                        <span><i class="fas fa-clock"></i> ${a.read_minutes || 1} menit baca</span>
                    </div>
                </div>
            </a>`;

    }

    function visibleArticles() {
        return filter === "all"
            ? articles
            : articles.filter((a) => a.category === filter);
    }

    function totalPages() {
        return Math.max(1, Math.ceil(visibleArticles().length / MAX_ITEMS));
    }

    function render(scroll = false) {

        const items = visibleArticles();

        if (items.length === 0) {

            grid.innerHTML = `
                <p class="article-state">
                    <i class="fas fa-newspaper"></i>
                    ${articles.length === 0
                        ? "Belum ada artikel yang dipublikasikan."
                        : "Belum ada artikel di kategori ini."}
                </p>`;

            pagination.hidden = true;
            return;

        }

        const start = (currentPage - 1) * MAX_ITEMS;

        grid.innerHTML = items.slice(start, start + MAX_ITEMS).map(cardHtml).join("");

        renderPagination();

        if (scroll) {
            document.querySelector(".article-hero").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

    }

    function renderPagination() {

        const pages = totalPages();

        pagination.hidden = pages <= 1;
        pageNumbers.innerHTML = "";

        for (let i = 1; i <= pages; i++) {

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "page-number-btn" + (i === currentPage ? " active" : "");
            btn.textContent = i;
            btn.addEventListener("click", () => goTo(i));

            pageNumbers.appendChild(btn);

        }

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === pages;

    }

    function goTo(page) {
        currentPage = Math.min(Math.max(1, page), totalPages());
        render(true);
    }

    prevBtn.addEventListener("click", () => goTo(currentPage - 1));
    nextBtn.addEventListener("click", () => goTo(currentPage + 1));

    filterButtons.forEach((btn) => {

        btn.addEventListener("click", () => {

            filterButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            filter = btn.dataset.filter;
            currentPage = 1;
            render();

        });

    });

    async function load() {

        try {

            const response = await fetch("/api/articles", { cache: "no-store" });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            articles = result.data || [];
            render();

        } catch (err) {

            console.error(err);

            grid.innerHTML = `
                <p class="article-state">
                    <i class="fas fa-circle-exclamation"></i>
                    Artikel belum bisa dimuat. Pastikan website dibuka lewat server
                    (npm start → http://localhost:3000), bukan dibuka langsung sebagai file.
                </p>`;

        }

    }

    load();

})();
