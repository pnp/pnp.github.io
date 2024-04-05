"use strict"
const hamburgerMenu = document.querySelector('.hamburger');
const menuPrimary = document.querySelector('.nav-menu.primary');

const showMenu = evt => {

    hamburgerMenu.classList.toggle('show');

    if (hamburgerMenu.classList.contains('show')) {
        hamburgerMenu.ariaLabeledBy = "Hurra";
        menuPrimary.ariaExpanded = true;
        menuPrimary.focus()
    } else {
        hamburgerMenu.ariaLabeledBy = "murks";
        menuPrimary.ariaExpanded = false;
        hamburgerMenu.focus();
    }

}

if (hamburgerMenu && menuPrimary) {

    hamburgerMenu.addEventListener('click', showMenu);

}