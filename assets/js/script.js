// ======================
// STICKY HEADER
// ======================

const header = document.querySelector("header");

window.addEventListener("scroll", () => {
    header.classList.toggle("sticky", window.scrollY > 0);
});


// ======================
// ACTIVE MENU SECTION
// ======================

document.addEventListener("DOMContentLoaded", () => {

    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".header__menu li a");

    window.addEventListener("scroll", () => {

        let currentSection = "";

        sections.forEach((section) => {

            const sectionTop = section.offsetTop - 100;

            if (window.scrollY >= sectionTop) {
                currentSection = section.getAttribute("id");
            }

        });

        navLinks.forEach((link) => {

            link.classList.remove("active");

            if (link.getAttribute("href") === `#${currentSection}`) {
                link.classList.add("active");
            }

        });

    });

});


// ======================
// POPUP MENU
// ======================

document.addEventListener("DOMContentLoaded", () => {

    const hamburgerBtn = document.querySelector(".hamburger-btn");
    const menuWrapper = document.querySelector(".menu-wrapper");

    if (!hamburgerBtn || !menuWrapper) {
        console.log("popup menu element tidak ditemukan");
        return;
    }

    hamburgerBtn.addEventListener("click", function(e){

        e.preventDefault();
        e.stopPropagation();

        menuWrapper.classList.toggle("active");

        console.log("klik");
    });

    document.addEventListener("click", function(e){

        if (!menuWrapper.contains(e.target)) {
            menuWrapper.classList.remove("active");
        }

    });

});