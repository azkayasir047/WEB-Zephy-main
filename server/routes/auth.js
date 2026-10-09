const express = require("express");
const router = express.Router();
const pool = require("../db");

// Login
router.post("/login", async (req, res) => {

    const { username, password } = req.body;

    try {

        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Username tidak ditemukan"
            });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: "Password salah"
            });
        }

        req.session.user = {
            id: user.id,
            username: user.username
        };

        res.json({
            success: true,
            message: "Login berhasil"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

});

router.get("/me", (req, res) => {

    if (!req.session.user) {
        return res.json({
            loggedIn: false
        });
    }

    res.json({
        loggedIn: true,
        username: req.session.user.username
    });

});

router.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.clearCookie("connect.sid");
        res.redirect("/login");

    });

});

module.exports = router;