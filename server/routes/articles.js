// =========================================================
// API ARTIKEL
// ---------------------------------------------------------
// PUBLIK (tanpa login):
//   GET    /api/articles                 → daftar artikel yang sudah Publish
//   GET    /api/articles/:idAtauSlug     → isi 1 artikel yang sudah Publish
//
// ADMIN (wajib login):
//   GET    /api/articles?scope=admin     → semua artikel (Draft + Publish)
//   GET    /api/articles/:id             → admin juga bisa buka Draft
//   POST   /api/articles                 → tambah artikel
//   PUT    /api/articles/:id             → edit artikel
//   DELETE /api/articles/:id             → hapus artikel
//   POST   /api/uploads                  → upload gambar (thumbnail / isi)
// =========================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../db");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "assets", "uploads");
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};


// =========================================================
// HELPER
// =========================================================

function isLoggedIn(req) {
    return Boolean(req.session && req.session.user);
}

function requireLogin(req, res, next) {

    if (isLoggedIn(req)) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Sesi login habis. Silakan login ulang."
    });

}

function slugify(text) {

    return String(text)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 200) || "artikel";

}

// Pastikan slug unik: judul-artikel, judul-artikel-2, dst.
async function uniqueSlug(base, excludeId = null) {

    let slug = base;
    let n = 2;

    while (true) {

        const { rows } = await pool.query(
            "SELECT id FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)",
            [slug, excludeId]
        );

        if (rows.length === 0) {
            return slug;
        }

        slug = `${base}-${n}`;
        n++;

    }

}

function stripHtml(html) {

    return String(html || "")
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

}

function makeExcerpt(html, max = 160) {

    const text = stripHtml(html);

    if (text.length <= max) {
        return text;
    }

    return text.slice(0, max).replace(/\s+\S*$/, "") + "…";

}

// Thumbnail hanya boleh gambar lokal (/assets/...) atau URL http(s).
function cleanThumbnail(value) {

    const v = String(value || "").trim();

    if (!v) return null;

    if (v.startsWith("/assets/") || /^https?:\/\//i.test(v)) {
        return v.slice(0, 500);
    }

    return null;

}

// Validasi + rapikan data dari form.
function readArticleBody(body) {

    const errors = [];

    const title = String(body.title || "").trim();
    const category = String(body.category || "Kegiatan").trim().slice(0, 60) || "Kegiatan";
    const content = String(body.content || "").trim();
    const author = String(body.author || "").trim().slice(0, 100);
    const status = body.status === "publish" ? "publish" : "draft";
    let excerpt = String(body.excerpt || "").trim();

    if (!title) {
        errors.push("Judul artikel wajib diisi.");
    } else if (title.length > 255) {
        errors.push("Judul maksimal 255 karakter.");
    }

    // Artikel yang di-Publish wajib punya isi.
    if (status === "publish" && stripHtml(content).length === 0) {
        errors.push("Isi artikel masih kosong. Tulis isinya dulu sebelum Publish.");
    }

    if (!excerpt) {
        excerpt = makeExcerpt(content);
    }

    return {
        errors,
        data: {
            title,
            category,
            content,
            author,
            status,
            excerpt: excerpt.slice(0, 500),
            thumbnail: cleanThumbnail(body.thumbnail)
        }
    };

}

// Perkiraan lama baca (200 kata / menit), dihitung di database.
const READ_MINUTES_SQL = `
    CEIL(GREATEST(array_length(regexp_split_to_array(
        trim(regexp_replace(content, '<[^>]+>', ' ', 'g')), '\\s+'), 1), 1) / 200.0)::int
        AS read_minutes
`;

// Kolom yang dikirim untuk daftar (tanpa isi lengkap supaya ringan).
const LIST_COLUMNS = `
    id, title, slug, category, excerpt, thumbnail, author, status,
    created_at, updated_at, published_at, ${READ_MINUTES_SQL}
`;


// =========================================================
// GET /api/articles
// =========================================================

router.get("/api/articles", async (req, res) => {

    const adminScope = req.query.scope === "admin";

    if (adminScope && !isLoggedIn(req)) {
        return res.status(401).json({
            success: false,
            message: "Sesi login habis. Silakan login ulang."
        });
    }

    try {

        const sql = adminScope
            ? `SELECT ${LIST_COLUMNS} FROM articles
               ORDER BY updated_at DESC`
            : `SELECT ${LIST_COLUMNS} FROM articles
               WHERE status = 'publish'
               ORDER BY published_at DESC NULLS LAST, id DESC`;

        const { rows } = await pool.query(sql);

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal mengambil daftar artikel."
        });

    }

});


// =========================================================
// GET /api/articles/:key   (key = id angka atau slug)
// =========================================================

router.get("/api/articles/:key", async (req, res) => {

    const key = String(req.params.key);
    const byId = /^\d+$/.test(key);

    try {

        const { rows } = await pool.query(
            `SELECT *, ${READ_MINUTES_SQL}
             FROM articles
             WHERE ${byId ? "id = $1" : "slug = $1"}`,
            [byId ? Number(key) : key]
        );

        const article = rows[0];

        // Draft hanya boleh dilihat admin yang login.
        if (!article || (article.status !== "publish" && !isLoggedIn(req))) {
            return res.status(404).json({
                success: false,
                message: "Artikel tidak ditemukan."
            });
        }

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            data: article
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal mengambil artikel."
        });

    }

});


// =========================================================
// POST /api/articles   (tambah)
// =========================================================

router.post("/api/articles", requireLogin, async (req, res) => {

    const { errors, data } = readArticleBody(req.body || {});

    if (errors.length) {
        return res.status(400).json({
            success: false,
            message: errors.join(" ")
        });
    }

    try {

        const slug = await uniqueSlug(slugify(data.title));

        const { rows } = await pool.query(
            `INSERT INTO articles
                (title, slug, category, excerpt, content, thumbnail,
                 author, status, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::varchar,
                     CASE WHEN $8::varchar = 'publish' THEN NOW() ELSE NULL END)
             RETURNING *`,
            [
                data.title,
                slug,
                data.category,
                data.excerpt,
                data.content,
                data.thumbnail,
                data.author || req.session.user.username,
                data.status
            ]
        );

        return res.status(201).json({
            success: true,
            message: data.status === "publish"
                ? "Artikel berhasil dipublikasikan."
                : "Artikel disimpan sebagai draft.",
            data: rows[0]
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal menyimpan artikel."
        });

    }

});


// =========================================================
// PUT /api/articles/:id   (edit)
// =========================================================

router.put("/api/articles/:id", requireLogin, async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: "ID tidak valid." });
    }

    const { errors, data } = readArticleBody(req.body || {});

    if (errors.length) {
        return res.status(400).json({
            success: false,
            message: errors.join(" ")
        });
    }

    try {

        const found = await pool.query(
            "SELECT id, slug, published_at FROM articles WHERE id = $1",
            [id]
        );

        if (found.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Artikel tidak ditemukan (mungkin sudah dihapus)."
            });
        }

        const current = found.rows[0];

        // Slug (alamat link) dikunci setelah pertama kali Publish
        // supaya link yang sudah dibagikan tidak rusak.
        // Selama masih Draft, slug ikut judul terbaru.
        const slug = current.published_at
            ? current.slug
            : await uniqueSlug(slugify(data.title), id);

        const { rows } = await pool.query(
            `UPDATE articles SET
                title        = $1,
                slug         = $2,
                category     = $3,
                excerpt      = $4,
                content      = $5,
                thumbnail    = $6,
                author       = $7,
                status       = $8::varchar,
                updated_at   = NOW(),
                published_at = CASE
                    WHEN $8::varchar = 'publish' AND published_at IS NULL THEN NOW()
                    ELSE published_at
                END
             WHERE id = $9
             RETURNING *`,
            [
                data.title,
                slug,
                data.category,
                data.excerpt,
                data.content,
                data.thumbnail,
                data.author || req.session.user.username,
                data.status,
                id
            ]
        );

        return res.json({
            success: true,
            message: data.status === "publish"
                ? "Perubahan artikel sudah tayang."
                : "Perubahan disimpan sebagai draft.",
            data: rows[0]
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal memperbarui artikel."
        });

    }

});


// =========================================================
// DELETE /api/articles/:id
// =========================================================

router.delete("/api/articles/:id", requireLogin, async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: "ID tidak valid." });
    }

    try {

        const { rows } = await pool.query(
            "DELETE FROM articles WHERE id = $1 RETURNING id, title",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Artikel tidak ditemukan (mungkin sudah dihapus)."
            });
        }

        return res.json({
            success: true,
            message: `Artikel "${rows[0].title}" dihapus.`,
            data: rows[0]
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal menghapus artikel."
        });

    }

});


// =========================================================
// POST /api/uploads   (upload gambar)
// ---------------------------------------------------------
// Body = file gambar mentah, Content-Type = image/jpeg|png|webp|gif.
// Disimpan di /assets/uploads/ lalu URL-nya dikembalikan.
// Tidak perlu library tambahan (multer).
// =========================================================

router.post(
    "/api/uploads",
    requireLogin,
    express.raw({
        type: Object.keys(IMAGE_TYPES),
        limit: MAX_UPLOAD_BYTES
    }),
    async (req, res) => {

        const type = String(req.headers["content-type"] || "").split(";")[0].trim();
        const ext = IMAGE_TYPES[type];

        if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({
                success: false,
                message: "File harus berupa gambar JPG, PNG, WEBP, atau GIF."
            });
        }

        try {

            await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

            const name =
                `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

            await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.body);

            return res.status(201).json({
                success: true,
                url: `/assets/uploads/${name}`
            });

        } catch (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Gagal menyimpan gambar."
            });

        }

    }
);

module.exports = router;
