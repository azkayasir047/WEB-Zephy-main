// =========================================================
// HALAMAN BACA ARTIKEL (artikel/baca.html?slug=...)
// ---------------------------------------------------------
// Ambil 1 artikel dari database lalu tampilkan.
// Isi artikel dibersihkan dengan DOMPurify sebelum ditampilkan
// supaya kode berbahaya (script, dll) tidak ikut jalan.
// =========================================================

(function () {

    const $ = (id) => document.getElementById(id);

    const params = new URLSearchParams(location.search);
    const key = params.get("slug") || params.get("id");

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatTanggal(value) {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function showState(icon, message, withBack = true) {
        $("articleState").innerHTML = `
            <i class="fas ${icon}"></i>
            <p>${escapeHtml(message)}</p>
            ${withBack ? '<a href="art.html" class="baca-btn">Lihat semua artikel</a>' : ""}`;
        $("articleState").hidden = false;
        $("articleBody").hidden = true;
        $("articleRoot").setAttribute("aria-busy", "false");
    }

    function sanitize(html) {

        if (window.DOMPurify) {
            return DOMPurify.sanitize(html, {
                ADD_ATTR: ["target"],
                FORBID_TAGS: ["style", "form", "input", "button"]
            });
        }

        // Tanpa DOMPurify: tampilkan sebagai teks biasa (aman).
        const div = document.createElement("div");
        div.textContent = html.replace(/<[^>]+>/g, " ");
        return div.innerHTML;

    }

    function render(a) {

        document.title = `${a.title} | Artikel | Zephyrus ITB`;

        const description = document.querySelector('meta[name="description"]');
        if (description && a.excerpt) description.setAttribute("content", a.excerpt);

        $("articleCategory").textContent = a.category;
        $("articleTitle").textContent = a.title;
        $("articleDate").textContent = formatTanggal(a.published_at || a.updated_at);
        $("articleAuthor").textContent = a.author || "BO Zephyrus";
        $("articleRead").textContent = `${a.read_minutes || 1} menit baca`;

        if (a.thumbnail) {
            const cover = $("articleCover");
            cover.src = a.thumbnail;
            cover.alt = a.title;
            cover.hidden = false;
            cover.onerror = () => { cover.hidden = true; };
        }

        const content = $("articleContent");
        content.innerHTML = sanitize(a.content || "");

        // Link di dalam artikel yang mengarah ke luar → buka tab baru
        content.querySelectorAll("a[href]").forEach((link) => {
            if (link.hostname && link.hostname !== location.hostname) {
                link.target = "_blank";
                link.rel = "noopener";
            }
        });

        content.querySelectorAll("img").forEach((img) => {
            img.loading = "lazy";
        });

        // Draft hanya bisa dibuka admin yang login → tampilkan banner
        if (a.status !== "publish") {
            $("draftBanner").hidden = false;
            $("draftEditLink").href = `/admin/form-artikel.html?id=${a.id}`;
        }

        // Tombol bagikan
        const url = location.origin + location.pathname + "?slug=" + encodeURIComponent(a.slug);
        const text = `${a.title} — ${url}`;

        $("shareWa").href = "https://wa.me/?text=" + encodeURIComponent(text);
        $("shareLine").href = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url);

        $("shareCopy").addEventListener("click", async () => {
            const label = $("shareCopy").querySelector("span");
            try {
                await navigator.clipboard.writeText(url);
                label.textContent = "Tersalin!";
            } catch (err) {
                window.prompt("Salin link ini:", url);
            }
            setTimeout(() => (label.textContent = "Salin Link"), 2000);
        });

        $("articleState").hidden = true;
        $("articleBody").hidden = false;
        $("articleRoot").setAttribute("aria-busy", "false");

    }

    async function loadRelated(current) {

        try {

            const response = await fetch("/api/articles", { cache: "no-store" });
            if (!response.ok) return;

            const { data } = await response.json();
            const others = (data || []).filter((a) => a.id !== current.id);

            // Utamakan kategori yang sama, lalu yang terbaru
            others.sort((x, y) =>
                (y.category === current.category) - (x.category === current.category));

            const picks = others.slice(0, 3);
            if (picks.length === 0) return;

            $("relatedGrid").innerHTML = picks.map((a) => `
                <a class="baca-related-card" href="baca.html?slug=${encodeURIComponent(a.slug)}">
                    <img src="${escapeHtml(a.thumbnail || "../assets/img/logo1.png")}" alt="" loading="lazy"
                         ${a.thumbnail ? "" : 'class="is-fallback"'}
                         onerror="this.onerror=null; this.src='../assets/img/logo1.png'; this.classList.add('is-fallback');">
                    <div>
                        <span>${escapeHtml(a.category)}</span>
                        <h3>${escapeHtml(a.title)}</h3>
                    </div>
                </a>`).join("");

            $("relatedSection").hidden = false;

        } catch (err) {
            console.error(err);
        }

    }

    async function load() {

        if (!key) {
            showState("fa-circle-question", "Artikel tidak ditemukan.");
            return;
        }

        try {

            const response = await fetch(`/api/articles/${encodeURIComponent(key)}`, {
                credentials: "include",
                cache: "no-store"
            });

            if (response.status === 404) {
                showState("fa-file-circle-xmark", "Artikel tidak ditemukan atau sudah dihapus.");
                return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const { data } = await response.json();

            render(data);
            loadRelated(data);

        } catch (err) {
            console.error(err);
            showState(
                "fa-circle-exclamation",
                "Artikel belum bisa dimuat. Pastikan website dibuka lewat server (http://localhost:3000)."
            );
        }

    }

    load();

})();
