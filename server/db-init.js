// =========================================================
// INISIALISASI DATABASE
// ---------------------------------------------------------
// Dipanggil sekali saat server start.
// Membuat tabel "articles" kalau belum ada, lalu mengisi
// artikel contoh (hanya jika tabel masih kosong) supaya
// halaman Artikel tidak kosong saat pertama kali dicoba.
// =========================================================

const pool = require("./db");

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS articles (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(300) NOT NULL UNIQUE,
    category      VARCHAR(60)  NOT NULL DEFAULT 'Kegiatan',
    excerpt       TEXT         NOT NULL DEFAULT '',
    content       TEXT         NOT NULL DEFAULT '',
    thumbnail     VARCHAR(500),
    author        VARCHAR(100) NOT NULL DEFAULT 'BO Zephyrus',
    status        VARCHAR(10)  NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'publish')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_articles_status_published
    ON articles (status, published_at DESC);
`;

// Artikel contoh = artikel yang sebelumnya ditulis manual
// di artikel/art.html, dipindah ke database.
const SEED_ARTICLES = [
    {
        title: "Duh hari ini zephyrus survei",
        slug: "duh-hari-ini-zephyrus-survei",
        category: "Kegiatan",
        excerpt: "Penentuan titik pemasangan sensor FEWS.",
        thumbnail: "/assets/img/survei.jpeg",
        published_at: "2026-06-20T08:00:00+07:00",
        content: `
<p>Monitoring banjir merupakan salah satu langkah penting dalam mitigasi bencana hidrometeorologi. Sistem pemantauan real-time memungkinkan informasi kondisi lapangan diperoleh secara cepat.</p>
<h2>Latar Belakang</h2>
<p>Wilayah Majalaya memiliki kerentanan terhadap kejadian banjir akibat curah hujan tinggi serta kondisi DAS yang kompleks.</p>
<p>Oleh karena itu dilakukan pemasangan sensor Automatic Water Level Recorder (AWLR) dan sensor curah hujan.</p>
<blockquote>"Data real-time dapat membantu proses peringatan dini banjir."</blockquote>
<h2>Hasil Monitoring</h2>
<p>Berdasarkan data yang diperoleh, sensor mampu mengirimkan data secara berkala dan dapat divisualisasikan melalui dashboard monitoring.</p>
<h2>Kesimpulan</h2>
<p>Sistem monitoring berbasis sensor memberikan informasi yang cepat, akurat, dan dapat digunakan sebagai dasar pengambilan keputusan.</p>`.trim()
    },
    {
        title: "Abis stuban sm himagreto nich",
        slug: "abis-stuban-sm-himagreto-nich",
        category: "Kegiatan",
        excerpt: "Terlalu banyak insight yg didapat.",
        thumbnail: "/assets/img/stuban.jpeg",
        published_at: "2026-06-18T08:00:00+07:00",
        content: "<p>Terlalu banyak insight yg didapat.</p>"
    },
    {
        title: "Peta Kerawanan Banjir Majalaya",
        slug: "peta-kerawanan-banjir-majalaya",
        category: "Edukasi",
        excerpt: "mangeak",
        thumbnail: "/assets/img/gatau.png",
        published_at: "2026-06-15T08:00:00+07:00",
        content: "<p>mangeak</p>"
    }
];

async function initDatabase() {

    await pool.query(CREATE_TABLE_SQL);

    const { rows } = await pool.query(
        "SELECT COUNT(*)::int AS total FROM articles"
    );

    if (rows[0].total > 0) {
        return;
    }

    for (const a of SEED_ARTICLES) {

        await pool.query(
            `INSERT INTO articles
                (title, slug, category, excerpt, content, thumbnail,
                 author, status, created_at, updated_at, published_at)
             VALUES ($1, $2, $3, $4, $5, $6,
                     'BO Zephyrus', 'publish', $7, $7, $7)
             ON CONFLICT (slug) DO NOTHING`,
            [a.title, a.slug, a.category, a.excerpt, a.content,
             a.thumbnail, a.published_at]
        );

    }

    console.log("Tabel articles dibuat + diisi 3 artikel contoh.");

}

module.exports = initDatabase;
