document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Gagal mengambil status login");
        }

        const data = await response.json();

        /*
        =====================================================
        CARI MENU LOGIN
        =====================================================
        */

        let loginItem =
            document.getElementById("loginItem");

        if (!loginItem) {

            loginItem =
                document.querySelector(
                    ".login-highlight"
                );

        }

        if (!loginItem) {
            return;
        }


        /*
        =====================================================
        CARI MENU HAMBURGER
        =====================================================
        */

        const hamburgerMenu =
            document.querySelector(
                "#hamburger-target ul"
            );


        /*
        =====================================================
        JIKA SUDAH LOGIN
        =====================================================
        */

        if (data.loggedIn) {


            /*
            -------------------------------------------------
            USERNAME
            -------------------------------------------------
            */

            const usernameItem =
                document.getElementById(
                    "usernameItem"
                );

            const usernameText =
                document.getElementById(
                    "usernameText"
                );


            if (usernameItem) {

                usernameItem.style.display =
                    "block";

            }


            if (usernameText) {

                usernameText.textContent =
                    data.username;

            }


            /*
            -------------------------------------------------
            TAMBAHKAN MENU ADMIN
            -------------------------------------------------
            */

            if (
                hamburgerMenu &&
                !document.getElementById("adminMenuItem")
            ) {

                const adminItem =
                    document.createElement("li");

                adminItem.id =
                    "adminMenuItem";

                adminItem.innerHTML = `

                    <a
                        href="/admin/dashboard.html"
                        class="sub-menu-item admin-menu-link"
                    >
                        <i class="fas fa-gauge-high"></i>
                        Admin
                    </a>

                `;


                /*
                Letakkan Admin sebelum Login/Logout
                */

                hamburgerMenu.insertBefore(
                    adminItem,
                    loginItem.tagName.toLowerCase() === "li"
                        ? loginItem
                        : loginItem.parentElement
                );

            }


            /*
            -------------------------------------------------
            LOGIN → LOGOUT
            -------------------------------------------------
            */

            if (
                loginItem.tagName.toLowerCase()
                === "li"
            ) {

                loginItem.innerHTML = `

                    <a
                        href="/logout"
                        class="sub-menu-item login-highlight"
                    >
                        Logout
                    </a>

                `;

            } else {

                loginItem.href =
                    "/logout";

                loginItem.textContent =
                    "Logout";

            }

        }


        /*
        =====================================================
        JIKA BELUM LOGIN
        =====================================================
        */

        else {


            /*
            -------------------------------------------------
            SEMBUNYIKAN USERNAME
            -------------------------------------------------
            */

            const usernameItem =
                document.getElementById(
                    "usernameItem"
                );

            if (usernameItem) {

                usernameItem.style.display =
                    "none";

            }


            /*
            -------------------------------------------------
            HAPUS MENU ADMIN
            -------------------------------------------------
            */

            const adminMenu =
                document.getElementById(
                    "adminMenuItem"
                );

            if (adminMenu) {

                adminMenu.remove();

            }


            /*
            -------------------------------------------------
            LOGOUT → LOGIN
            -------------------------------------------------
            */

            if (
                loginItem.tagName.toLowerCase()
                === "li"
            ) {

                loginItem.innerHTML = `

                    <a
                        href="/login"
                        class="sub-menu-item login-highlight"
                    >
                        Login
                    </a>

                `;

            } else {

                loginItem.href =
                    "/login";

                loginItem.textContent =
                    "Login";

            }

        }

    } catch (error) {

        console.error(
            "Auth UI Error:",
            error
        );

    }

});