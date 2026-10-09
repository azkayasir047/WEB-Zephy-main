const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const authRoute = require("./routes/auth");
const articleRoute = require("./routes/articles");
const initDatabase = require("./db-init");

// =========================================================
// MIDDLEWARE DASAR
// =========================================================

// Batas 2 MB cukup untuk teks artikel yang panjang.
// (Gambar di-upload terpisah lewat /api/uploads.)
app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({
    extended: true
}));


// =========================================================
// SESSION LOGIN
// =========================================================

app.use(
    session({

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 24
        }

    })
);


// =========================================================
// MIDDLEWARE CEK LOGIN
// =========================================================

function isAuthenticated(req, res, next) {

    if (req.session.user) {

        return next();

    }

    return res.redirect("/login");

}


// =========================================================
// AUTH ROUTE
// =========================================================
//
// POST /login
// GET  /me
// GET  /logout
//
// =========================================================

app.use(authRoute);


// =========================================================
// API ARTIKEL
// =========================================================
//
// GET    /api/articles
// GET    /api/articles/:idAtauSlug
// POST   /api/articles          (login)
// PUT    /api/articles/:id      (login)
// DELETE /api/articles/:id      (login)
// POST   /api/uploads           (login)
//
// =========================================================

app.use(articleRoute);

// Endpoint /api yang tidak dikenal → balas JSON, bukan HTML.
app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "Endpoint API tidak ditemukan."
    });

});


// =========================================================
// BLOKIR FOLDER SERVER
// =========================================================
//
// Website publik di-serve dari folder root project, jadi
// tanpa ini file seperti /server/app.js atau
// /server/node_modules/... bisa dibuka lewat browser.
//
// =========================================================

app.use("/server", (req, res) => {

    res.status(404).send("Halaman tidak ditemukan.");

});


// =========================================================
// LOGIN PAGE
// =========================================================
//
// Kalau belum login:
//     /login → login.html
//
// Kalau sudah login:
//     /login → dashboard
//
// =========================================================

app.get("/login", (req, res) => {

    if (req.session.user) {

        return res.redirect("/dashboard");

    }

    return res.sendFile(
        path.join(
            __dirname,
            "..",
            "login.html"
        )
    );

});


// =========================================================
// PROTEKSI FOLDER ADMIN
// =========================================================
//
// SEMUA file di folder /admin wajib login.
//
// Contoh:
//
// /admin/dashboard.html
// /admin/form-artikel.html
//
// =========================================================

app.use(
    "/admin",
    isAuthenticated,
    express.static(
        path.join(
            __dirname,
            "..",
            "admin"
        )
    )
);


// =========================================================
// DASHBOARD ADMIN
// =========================================================
//
// Setelah login:
//
// /dashboard
//      ↓
// admin/dashboard.html
//
// =========================================================

app.get(
    "/dashboard",
    isAuthenticated,
    (req, res) => {

        // Diarahkan ke /admin/dashboard.html (bukan sendFile)
        // supaya link relatif di halaman admin seperti
        // "form-artikel.html" tetap mengarah ke /admin/...
        return res.redirect("/admin/dashboard.html");

    }
);


// =========================================================
// HALAMAN UTAMA / WEBSITE PUBLIK
// =========================================================
//
// Semua halaman di luar /admin tetap bisa dibuka
// tanpa login.
//
// Login tidak diperlukan untuk:
//
// /tes_carousel.html
// /Data.html
// /artikel/art.html
// /profile.html
// /kalender.html
// dll.
//
// =========================================================

app.use(
    express.static(
        path.join(
            __dirname,
            ".."
        )
    )
);


// =========================================================
// ROOT WEBSITE
// =========================================================

app.get("/", (req, res) => {

    return res.sendFile(
        path.join(
            __dirname,
            "..",
            "tes_carousel.html"
        )
    );

});


// =========================================================
// 404
// =========================================================

app.use((req, res) => {

    res.status(404).send("Halaman tidak ditemukan.");

});


// =========================================================
// START SERVER
// =========================================================

const PORT =
    process.env.PORT || 3000;

initDatabase()
    .then(() => {

        app.listen(
            PORT,
            () => {

                console.log(
                    `Server berjalan di http://localhost:${PORT}`
                );

            }
        );

    })
    .catch((err) => {

        console.error(
            "Gagal menyiapkan database. Cek isi server/.env dan pastikan PostgreSQL menyala.",
            err
        );

        process.exit(1);

    });