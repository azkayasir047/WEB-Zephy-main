// =========================================================
// ZEPHYRUS ADMIN — HELPER BERSAMA
// Dipakai oleh dashboard.html dan form-artikel.html
// =========================================================

// ---------------------------------------------------------
// Hamburger menu
// ---------------------------------------------------------

(function initHamburger() {

    const button = document.getElementById("hamburger-trigger");
    const menu = document.getElementById("hamburger-target");

    if (!button || !menu) return;

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.remove("active");
        }
    });

})();


// ---------------------------------------------------------
// Escape teks sebelum dimasukkan ke innerHTML (anti-XSS)
// ---------------------------------------------------------

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


// ---------------------------------------------------------
// Format tanggal Indonesia: 27 Sep 2026
// ---------------------------------------------------------

function formatTanggal(value) {

    if (!value) return "-";

    return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}


// ---------------------------------------------------------
// Pemanggil API: selalu kirim cookie, lempar error
// dengan pesan dari server kalau gagal.
// ---------------------------------------------------------

async function api(url, options = {}) {

    const init = {
        credentials: "include",
        cache: "no-store",
        ...options,
        headers: { ...(options.headers || {}) }
    };

    if (init.body && !(init.body instanceof Blob) && typeof init.body !== "string") {
        init.body = JSON.stringify(init.body);
        init.headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(url, init);
    } catch (err) {
        throw new Error("Tidak bisa terhubung ke server. Pastikan server Node.js sedang berjalan.");
    }

    let data = {};

    try {
        data = await response.json();
    } catch (err) {
        data = {};
    }

    if (!response.ok || data.success === false) {

        const error = new Error(
            data.message || `Terjadi kesalahan (kode ${response.status}).`
        );

        error.status = response.status;

        throw error;

    }

    return data;

}


// ---------------------------------------------------------
// Toast notifikasi kecil di pojok layar
// ---------------------------------------------------------

function showToast(message, type = "success") {

    let wrap = document.getElementById("toastWrap");

    if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "toastWrap";
        wrap.className = "toast-wrap";
        wrap.setAttribute("aria-live", "polite");
        document.body.appendChild(wrap);
    }

    const icons = {
        success: "fa-circle-check",
        error: "fa-circle-exclamation",
        info: "fa-circle-info"
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML =
        `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;

    wrap.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, type === "error" ? 6000 : 3500);

}


// ---------------------------------------------------------
// Link publik sebuah artikel
// ---------------------------------------------------------

function articleUrl(article) {
    return `/artikel/baca.html?slug=${encodeURIComponent(article.slug)}`;
}
