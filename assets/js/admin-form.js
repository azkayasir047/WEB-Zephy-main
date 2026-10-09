// =========================================================
// ZEPHYRUS ADMIN — FORM TULIS / EDIT ARTIKEL
// ---------------------------------------------------------
// form-artikel.html            → tulis artikel baru
// form-artikel.html?id=12      → edit artikel id 12
// =========================================================

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const state = {
    id: null,             // null = artikel baru
    status: null,         // 'draft' | 'publish' | null (belum disimpan)
    slug: null,
    dirty: false,         // ada perubahan yang belum disimpan?
    saving: false,
    uploading: 0
};

const el = {
    form: document.getElementById("articleForm"),
    loading: document.getElementById("formLoading"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),
    statusBadge: document.getElementById("statusBadge"),

    title: document.getElementById("title"),
    titleError: document.getElementById("titleError"),
    contentError: document.getElementById("contentError"),
    wordCount: document.getElementById("wordCount"),
    readTime: document.getElementById("readTime"),

    category: document.getElementById("category"),
    excerpt: document.getElementById("excerpt"),
    author: document.getElementById("author"),

    thumbnail: document.getElementById("thumbnail"),
    thumbInput: document.getElementById("thumbInput"),
    thumbDrop: document.getElementById("thumbDrop"),
    thumbPreview: document.getElementById("thumbPreview"),
    thumbEmpty: document.getElementById("thumbEmpty"),
    thumbUploading: document.getElementById("thumbUploading"),
    thumbRemove: document.getElementById("thumbRemove"),

    infoStatus: document.getElementById("infoStatus"),
    infoLinkRow: document.getElementById("infoLinkRow"),
    infoLink: document.getElementById("infoLink"),
    infoUpdatedRow: document.getElementById("infoUpdatedRow"),
    infoUpdated: document.getElementById("infoUpdated"),

    btnDraft: document.getElementById("btnDraft"),
    btnPublish: document.getElementById("btnPublish")
};


// =========================================================
// EDITOR (Quill)
// =========================================================

const quill = new Quill("#editor", {
    theme: "snow",
    placeholder: "Mulai tulis isi artikel di sini...",
    modules: {
        toolbar: {
            container: [
                [{ header: [2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["blockquote", "link", "image"],
                [{ align: [] }],
                ["clean"]
            ],
            handlers: {
                image: pickEditorImage
            }
        },
        // Gambar yang di-paste / di-drag ke editor langsung di-upload
        // ke server (bukan disimpan sebagai base64 di dalam teks).
        uploader: {
            mimetypes: IMAGE_TYPES,
            handler: (range, files) => {
                files.forEach((file) => insertEditorImage(file, range));
            }
        }
    }
});

// Tooltip toolbar dalam Bahasa Indonesia
const TOOLBAR_TITLES = {
    ".ql-header": "Judul bagian",
    ".ql-bold": "Tebal",
    ".ql-italic": "Miring",
    ".ql-underline": "Garis bawah",
    ".ql-strike": "Coret",
    ".ql-list[value=ordered]": "Daftar bernomor",
    ".ql-list[value=bullet]": "Daftar poin",
    ".ql-blockquote": "Kutipan",
    ".ql-link": "Sisipkan link",
    ".ql-image": "Sisipkan gambar",
    ".ql-align": "Rata teks",
    ".ql-clean": "Hapus format"
};

Object.entries(TOOLBAR_TITLES).forEach(([selector, title]) => {
    document.querySelectorAll(`.ql-toolbar ${selector}`).forEach((node) => {
        node.setAttribute("title", title);
    });
});

quill.on("text-change", (delta, oldDelta, source) => {
    updateWordCount();
    hideError(el.contentError);
    if (source === "user") markDirty();
});

function getContentHtml() {

    if (isEditorEmpty()) return "";

    // Quill 2.0.3 mengubah semua spasi jadi &nbsp; di getSemanticHTML(),
    // yang membuat teks tidak bisa turun baris. Dinormalkan di sini.
    return quill.getSemanticHTML().replace(/&nbsp;/g, " ");

}

function setContentHtml(html) {
    const delta = quill.clipboard.convert({ html: html || "" });
    quill.setContents(delta, "silent");
    quill.history.clear();
    updateWordCount();
}

function isEditorEmpty() {

    const hasText = quill.getText().trim().length > 0;
    const hasImage = quill.getContents().ops.some(
        (op) => op.insert && typeof op.insert === "object" && op.insert.image
    );

    return !hasText && !hasImage;

}

function updateWordCount() {

    const words = quill.getText().trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));

    el.wordCount.textContent = `${words.toLocaleString("id-ID")} kata`;
    el.readTime.textContent = `± ${minutes} menit baca`;

}


// =========================================================
// UPLOAD GAMBAR
// =========================================================

async function uploadImage(file) {

    if (!IMAGE_TYPES.includes(file.type)) {
        throw new Error("File harus berupa gambar JPG, PNG, WEBP, atau GIF.");
    }

    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Ukuran gambar maksimal 5 MB.");
    }

    state.uploading++;

    try {

        const result = await api("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file
        });

        return result.url;

    } finally {
        state.uploading--;
    }

}

// Tombol gambar di toolbar editor
function pickEditorImage() {

    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_TYPES.join(",");

    input.addEventListener("change", () => {
        if (input.files && input.files[0]) {
            insertEditorImage(input.files[0], quill.getSelection(true));
        }
    });

    input.click();

}

async function insertEditorImage(file, range) {

    const index = range ? range.index : quill.getLength();

    showToast("Mengunggah gambar...", "info");

    try {

        const url = await uploadImage(file);

        quill.insertEmbed(index, "image", url, "user");
        quill.setSelection(index + 1, 0, "silent");

    } catch (err) {
        handleError(err);
    }

}

// ---- Gambar sampul ----

function setThumbnail(url) {

    el.thumbnail.value = url || "";

    if (url) {
        el.thumbPreview.src = url;
        el.thumbPreview.hidden = false;
        el.thumbEmpty.hidden = true;
        el.thumbRemove.hidden = false;
        el.thumbDrop.classList.add("has-image");
    } else {
        el.thumbPreview.removeAttribute("src");
        el.thumbPreview.hidden = true;
        el.thumbEmpty.hidden = false;
        el.thumbRemove.hidden = true;
        el.thumbDrop.classList.remove("has-image");
    }

}

async function handleThumbFile(file) {

    if (!file) return;

    el.thumbUploading.hidden = false;

    try {
        const url = await uploadImage(file);
        setThumbnail(url);
        markDirty();
    } catch (err) {
        handleError(err);
    } finally {
        el.thumbUploading.hidden = true;
        el.thumbInput.value = "";
    }

}

el.thumbDrop.addEventListener("click", () => el.thumbInput.click());

el.thumbDrop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.thumbInput.click();
    }
});

el.thumbInput.addEventListener("change", () => {
    handleThumbFile(el.thumbInput.files[0]);
});

["dragenter", "dragover"].forEach((type) => {
    el.thumbDrop.addEventListener(type, (e) => {
        e.preventDefault();
        el.thumbDrop.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((type) => {
    el.thumbDrop.addEventListener(type, (e) => {
        e.preventDefault();
        el.thumbDrop.classList.remove("dragging");
    });
});

el.thumbDrop.addEventListener("drop", (e) => {
    handleThumbFile(e.dataTransfer.files[0]);
});

el.thumbRemove.addEventListener("click", () => {
    setThumbnail("");
    markDirty();
});


// =========================================================
// STATUS TAMPILAN
// =========================================================

function renderStatus(article) {

    const isEdit = Boolean(state.id);
    const published = state.status === "publish";

    el.pageTitle.textContent = isEdit ? "Edit Artikel" : "Tulis Artikel Baru";

    el.pageSubtitle.textContent = !isEdit
        ? "Tulis isi artikel di bawah, lalu simpan sebagai draft atau langsung publish."
        : published
            ? "Artikel ini sudah tayang. Perubahan langsung tampil di halaman Artikel setelah kamu klik Update."
            : "Artikel ini masih draft dan belum terlihat pengunjung.";

    const label = !state.status ? "Belum disimpan" : published ? "Publish" : "Draft";

    el.statusBadge.textContent = label;
    el.statusBadge.className = `badge ${published ? "badge-publish" : "badge-draft"}`;
    el.infoStatus.textContent = published ? "Tayang di halaman Artikel" : state.status ? "Draft (tersembunyi)" : "Belum disimpan";

    // Tombol
    el.btnDraft.querySelector("span").textContent = published ? "Jadikan Draft" : "Simpan Draft";
    el.btnPublish.querySelector("span").textContent = published ? "Update Artikel" : "Publish";

    // Link lihat artikel (draft pun bisa dilihat admin sebagai pratinjau)
    if (state.slug) {
        el.infoLinkRow.hidden = false;
        el.infoLink.href = `/artikel/baca.html?slug=${encodeURIComponent(state.slug)}`;
        el.infoLink.firstChild.textContent = published ? "Lihat artikel " : "Pratinjau draft ";
    } else {
        el.infoLinkRow.hidden = true;
    }

    if (article && article.updated_at) {
        el.infoUpdatedRow.hidden = false;
        el.infoUpdated.textContent = new Date(article.updated_at).toLocaleString("id-ID", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    document.title = `${isEdit ? "Edit" : "Tulis"} Artikel - Zephyrus`;

}


// =========================================================
// PERUBAHAN BELUM DISIMPAN
// =========================================================

function markDirty() {
    state.dirty = true;
}

["input", "change"].forEach((type) => {
    el.form.addEventListener(type, (e) => {
        if (e.target !== el.thumbInput) markDirty();
    });
});

el.title.addEventListener("input", () => hideError(el.titleError));

window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
        e.preventDefault();
        e.returnValue = "";
    }
});

// Ctrl+S / Cmd+S = simpan (draft kalau belum tayang, update kalau sudah)
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save(state.status === "publish" ? "publish" : "draft", { stay: true });
    }
});


// =========================================================
// VALIDASI
// =========================================================

function showError(node, message) {
    node.textContent = message;
    node.hidden = false;
}

function hideError(node) {
    node.hidden = true;
}

function validate(status) {

    let ok = true;

    if (!el.title.value.trim()) {
        showError(el.titleError, "Judul artikel wajib diisi.");
        el.title.focus();
        ok = false;
    }

    if (status === "publish" && isEditorEmpty()) {
        showError(el.contentError, "Isi artikel masih kosong. Tulis isinya dulu sebelum publish.");
        if (ok) quill.focus();
        ok = false;
    }

    return ok;

}


// =========================================================
// SIMPAN
// =========================================================

function setSaving(saving, status) {

    state.saving = saving;

    el.btnDraft.disabled = saving;
    el.btnPublish.disabled = saving;

    const target = status === "publish" ? el.btnPublish : el.btnDraft;
    const icon = target.querySelector("i");

    if (saving) {
        target.dataset.icon = icon.className;
        icon.className = "fas fa-spinner fa-spin";
    } else if (target.dataset.icon) {
        icon.className = target.dataset.icon;
    }

}

async function save(status, { stay = false } = {}) {

    if (state.saving) return;

    if (state.uploading > 0) {
        showToast("Tunggu sebentar, gambar masih diunggah.", "info");
        return;
    }

    if (!validate(status)) return;

    const payload = {
        title: el.title.value.trim(),
        content: getContentHtml(),
        category: el.category.value,
        excerpt: el.excerpt.value.trim(),
        author: el.author.value.trim(),
        thumbnail: el.thumbnail.value,
        status
    };

    const wasPublished = state.status === "publish";

    setSaving(true, status);

    try {

        const result = state.id
            ? await api(`/api/articles/${state.id}`, { method: "PUT", body: payload })
            : await api("/api/articles", { method: "POST", body: payload });

        const article = result.data;

        state.id = article.id;
        state.status = article.status;
        state.slug = article.slug;
        state.dirty = false;

        // Ganti URL ke mode edit supaya refresh tidak membuat artikel dobel.
        history.replaceState(null, "", `form-artikel.html?id=${article.id}`);

        // Publish / Update → kembali ke daftar artikel.
        if (status === "publish" && !stay) {
            const params = new URLSearchParams({
                msg: wasPublished ? "updated" : "published",
                id: article.id
            });
            window.location.href = `dashboard.html?${params}`;
            return;
        }

        renderStatus(article);

        showToast(
            status === "draft" && wasPublished
                ? "Artikel dikembalikan ke draft dan disembunyikan dari halaman Artikel."
                : result.message,
            "success"
        );

    } catch (err) {
        handleError(err);
    } finally {
        setSaving(false, status);
    }

}

el.btnDraft.addEventListener("click", () => save("draft"));
el.btnPublish.addEventListener("click", () => save("publish"));

el.form.addEventListener("submit", (e) => e.preventDefault());


// =========================================================
// ERROR
// =========================================================

function handleError(err) {

    console.error(err);

    if (err.status === 401) {
        showToast(
            "Sesi login habis. Tulisanmu masih aman di halaman ini — login ulang di tab baru, lalu klik simpan lagi.",
            "error"
        );
        window.open("/login", "_blank");
        return;
    }

    showToast(err.message || "Terjadi kesalahan.", "error");

}


// =========================================================
// MODE EDIT: MUAT ARTIKEL
// =========================================================

// Sama dengan makeExcerpt() di server. Dipakai untuk mengecek
// apakah ringkasan dibuat otomatis (kalau iya, kolomnya dikosongkan
// supaya ringkasan ikut berubah saat isi artikel diedit).
function autoExcerpt(html, max = 160) {

    const text = String(html || "")
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length <= max) return text;

    return text.slice(0, max).replace(/\s+\S*$/, "") + "…";

}

async function loadArticle(id) {

    el.loading.hidden = false;
    el.form.classList.add("is-loading");

    try {

        const { data } = await api(`/api/articles/${encodeURIComponent(id)}`);

        state.id = data.id;
        state.status = data.status;
        state.slug = data.slug;

        el.title.value = data.title;
        el.category.value = data.category;
        el.author.value = data.author || "";

        // Kategori lama yang tidak ada di pilihan tetap bisa dipakai.
        if (el.category.value !== data.category) {
            const option = new Option(data.category, data.category, true, true);
            el.category.add(option);
        }

        el.excerpt.value =
            data.excerpt === autoExcerpt(data.content) ? "" : data.excerpt;

        setThumbnail(data.thumbnail);
        setContentHtml(data.content);

        state.dirty = false;

        renderStatus(data);

    } catch (err) {

        handleError(err);

        el.form.hidden = true;
        el.loading.hidden = false;
        el.loading.innerHTML =
            `<i class="fas fa-circle-exclamation"></i> ${escapeHtml(err.message)}
             <a href="dashboard.html" class="btn-secondary">Kembali ke daftar</a>`;
        return;

    } finally {
        el.form.classList.remove("is-loading");
    }

    el.loading.hidden = true;

}


// =========================================================
// START
// =========================================================

(function start() {

    const id = new URLSearchParams(location.search).get("id");

    renderStatus(null);
    updateWordCount();

    if (id) {
        loadArticle(id);
    } else {
        el.title.focus();
    }

})();
