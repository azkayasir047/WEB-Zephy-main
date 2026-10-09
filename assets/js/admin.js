// =========================================================
// ZEPHYRUS ADMIN — DAFTAR ARTIKEL (dashboard.html)
// ---------------------------------------------------------
// Data diambil dari database lewat GET /api/articles?scope=admin
// Edit  → form-artikel.html?id=...
// Hapus → DELETE /api/articles/:id (langsung hilang dari halaman Artikel)
// =========================================================

const list = {
    articles: [],
    status: "all",
    keyword: "",
    highlightId: null,
    pendingDelete: null
};

const tbody = document.getElementById("articleTableBody");
const searchInput = document.getElementById("searchInput");
const filterTabs = document.querySelectorAll(".filter-tab");

const deleteModal = document.getElementById("deleteModal");
const deleteName = document.getElementById("deleteName");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");


// =========================================================
// SAPAAN ADMIN
// =========================================================

async function loadAdmin() {

    try {

        const res = await fetch("/me", { credentials: "include", cache: "no-store" });
        const data = await res.json();

        const welcome = document.getElementById("welcomeAdmin");

        if (data.loggedIn && welcome) {
            welcome.textContent =
                `Halo, ${data.username}! Kelola seluruh artikel WEB-Zephy di sini.`;
        }

    } catch (err) {
        console.error(err);
    }

}


// =========================================================
// AMBIL ARTIKEL
// =========================================================

async function loadArticles() {

    try {

        const { data } = await api("/api/articles?scope=admin");

        list.articles = data;

        renderStats();
        renderTable();

    } catch (err) {

        console.error(err);

        if (err.status === 401) {
            window.location.href = "/login";
            return;
        }

        tbody.innerHTML = `
            <tr class="table-state">
                <td colspan="6">
                    <i class="fas fa-circle-exclamation"></i>
                    ${escapeHtml(err.message)}
                    <br>
                    <button type="button" class="btn-secondary" id="retryLoad" style="margin-top:14px">
                        <i class="fas fa-rotate-right"></i> Coba lagi
                    </button>
                </td>
            </tr>`;

        document.getElementById("retryLoad").addEventListener("click", loadArticles);

    }

}


// =========================================================
// STATISTIK + ANGKA DI TAB FILTER
// =========================================================

function renderStats() {

    const total = list.articles.length;
    const publish = list.articles.filter((a) => a.status === "publish").length;
    const draft = total - publish;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statPublish").textContent = publish;
    document.getElementById("statDraft").textContent = draft;

    const counts = { all: total, publish, draft };

    filterTabs.forEach((tab) => {

        let badge = tab.querySelector(".count");

        if (!badge) {
            badge = document.createElement("span");
            badge.className = "count";
            tab.appendChild(badge);
        }

        badge.textContent = counts[tab.dataset.status];

    });

}


// =========================================================
// TABEL
// =========================================================

function filteredArticles() {

    const keyword = list.keyword;

    return list.articles.filter((a) => {

        if (list.status !== "all" && a.status !== list.status) {
            return false;
        }

        if (!keyword) return true;

        return [a.title, a.category, a.author, a.excerpt]
            .join(" ")
            .toLowerCase()
            .includes(keyword);

    });

}

function rowHtml(a) {

    const published = a.status === "publish";

    const thumb = a.thumbnail
        ? `<img src="${escapeHtml(a.thumbnail)}" alt=""
               onerror="this.parentElement.classList.add('no-image'); this.remove();">`
        : "";

    const dateLabel = published ? "Tayang" : "Diubah";
    const dateValue = published ? (a.published_at || a.updated_at) : a.updated_at;

    return `
        <tr data-id="${a.id}">

            <td>
                <div class="thumbnail-box ${a.thumbnail ? "" : "no-image"}">
                    ${thumb}
                    <i class="fas fa-image thumbnail-placeholder"></i>
                </div>
            </td>

            <td class="artikel-judul">
                <a href="form-artikel.html?id=${a.id}" title="Edit artikel">${escapeHtml(a.title)}</a>
                <div class="artikel-meta">
                    <span><i class="fas fa-tag"></i> ${escapeHtml(a.category)}</span>
                    <span><i class="fas fa-clock"></i> ${a.read_minutes || 1} menit baca</span>
                </div>
            </td>

            <td class="author-text">${escapeHtml(a.author || "-")}</td>

            <td>
                <span class="badge ${published ? "badge-publish" : "badge-draft"}">
                    ${published ? "Publish" : "Draft"}
                </span>
            </td>

            <td class="tanggal-text">
                ${formatTanggal(dateValue)}
                <small>${dateLabel}</small>
            </td>

            <td>
                <div class="action-buttons">

                    <a
                        class="btn-action view"
                        href="${articleUrl(a)}"
                        target="_blank"
                        rel="noopener"
                        title="${published ? "Lihat di halaman Artikel" : "Pratinjau draft"}"
                    >
                        <i class="fas fa-eye"></i>
                    </a>

                    <a
                        class="btn-action edit"
                        href="form-artikel.html?id=${a.id}"
                        title="Edit artikel"
                    >
                        <i class="fas fa-pen"></i>
                    </a>

                    <button
                        type="button"
                        class="btn-action delete"
                        data-delete="${a.id}"
                        title="Hapus artikel"
                    >
                        <i class="fas fa-trash"></i>
                    </button>

                </div>
            </td>

        </tr>`;

}

function renderTable() {

    const rows = filteredArticles();

    if (list.articles.length === 0) {

        tbody.innerHTML = `
            <tr class="table-state">
                <td colspan="6">
                    <i class="fas fa-feather-pointed"></i>
                    Belum ada artikel. Yuk tulis artikel pertama!
                    <br>
                    <a href="form-artikel.html" class="btn-primary">
                        <i class="fas fa-plus"></i> Tambah Artikel
                    </a>
                </td>
            </tr>`;

        return;

    }

    if (rows.length === 0) {

        tbody.innerHTML = `
            <tr class="table-state">
                <td colspan="6">
                    <i class="fas fa-magnifying-glass"></i>
                    Tidak ada artikel yang cocok dengan pencarian / filter.
                </td>
            </tr>`;

        return;

    }

    tbody.innerHTML = rows.map(rowHtml).join("");

    // Sorot artikel yang baru disimpan
    if (list.highlightId) {

        const row = tbody.querySelector(`tr[data-id="${list.highlightId}"]`);

        if (row) {
            row.classList.add("row-highlight");
            row.scrollIntoView({ block: "center", behavior: "smooth" });
        }

        list.highlightId = null;

    }

}


// =========================================================
// SEARCH + FILTER
// =========================================================

searchInput.addEventListener("input", () => {
    list.keyword = searchInput.value.toLowerCase().trim();
    renderTable();
});

filterTabs.forEach((tab) => {

    tab.addEventListener("click", () => {

        filterTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        list.status = tab.dataset.status;
        renderTable();

    });

});


// =========================================================
// HAPUS
// =========================================================

tbody.addEventListener("click", (e) => {

    const button = e.target.closest("[data-delete]");

    if (!button) return;

    const id = Number(button.dataset.delete);
    const article = list.articles.find((a) => a.id === id);

    if (article) openDeleteModal(article);

});

function openDeleteModal(article) {

    list.pendingDelete = article;
    deleteName.textContent = `"${article.title}"`;
    deleteModal.hidden = false;
    deleteCancel.focus();

}

function closeDeleteModal() {

    list.pendingDelete = null;
    deleteModal.hidden = true;
    deleteConfirm.disabled = false;

}

deleteCancel.addEventListener("click", closeDeleteModal);

deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !deleteModal.hidden) closeDeleteModal();
});

deleteConfirm.addEventListener("click", async () => {

    const article = list.pendingDelete;

    if (!article) return;

    deleteConfirm.disabled = true;

    try {

        const result = await api(`/api/articles/${article.id}`, { method: "DELETE" });

        closeDeleteModal();

        const row = tbody.querySelector(`tr[data-id="${article.id}"]`);
        if (row) row.classList.add("row-removing");

        setTimeout(() => {
            list.articles = list.articles.filter((a) => a.id !== article.id);
            renderStats();
            renderTable();
        }, 300);

        showToast(result.message, "success");

    } catch (err) {

        closeDeleteModal();

        if (err.status === 404) {
            // Sudah terhapus di tempat lain → segarkan daftar
            showToast(err.message, "info");
            loadArticles();
            return;
        }

        if (err.status === 401) {
            showToast("Sesi login habis. Silakan login ulang.", "error");
            setTimeout(() => (window.location.href = "/login"), 1500);
            return;
        }

        showToast(err.message, "error");

    }

});


// =========================================================
// PESAN SETELAH SIMPAN (dari form-artikel.html)
// =========================================================

function showFlashMessage() {

    const params = new URLSearchParams(location.search);
    const msg = params.get("msg");

    const messages = {
        published: "Artikel berhasil dipublikasikan dan sudah tampil di halaman Artikel.",
        updated: "Perubahan artikel sudah tayang di halaman Artikel."
    };

    if (messages[msg]) {
        showToast(messages[msg], "success");
    }

    if (params.get("id")) {
        list.highlightId = Number(params.get("id"));
    }

    // Bersihkan URL supaya pesan tidak muncul lagi saat refresh
    if (msg || params.get("id")) {
        history.replaceState(null, "", location.pathname);
    }

}


// =========================================================
// START
// =========================================================

showFlashMessage();
loadAdmin();
loadArticles();
