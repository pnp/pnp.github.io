(() => {
    // Use the blog's key so the preference follows visitors between both sites.
    const storageKey = 'pnp-blog-theme';
    const legacyStorageKey = 'pnp-color-scheme';
    const root = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = null;

    try {
        preference = window.localStorage.getItem(storageKey);
        if (preference !== 'dark' && preference !== 'light') {
            preference = window.localStorage.getItem(legacyStorageKey);
            if (preference === 'dark' || preference === 'light') {
                window.localStorage.setItem(storageKey, preference);
            }
        }
    } catch (error) {
        console.warn('Unable to read or migrate the saved colour scheme.', error);
    }

    const applyTheme = (dark) => {
        root.dataset.theme = dark ? 'dark' : 'light';
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.setAttribute('aria-checked', String(dark));
            toggle.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
        }
    };

    applyTheme(preference === 'dark' || (preference !== 'light' && systemTheme.matches));
    systemTheme.addEventListener('change', (event) => {
        if (preference !== 'dark' && preference !== 'light') {
            applyTheme(event.matches);
        }
    });
    window.addEventListener('storage', (event) => {
        if (event.key === storageKey || event.key === null) {
            preference = event.newValue;
            applyTheme(preference === 'dark' || (preference !== 'light' && systemTheme.matches));
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.querySelector('.theme-toggle');
        const status = document.querySelector('.theme-status');
        if (toggle) {
            toggle.hidden = false;
            applyTheme(root.dataset.theme === 'dark');
            toggle.addEventListener('click', () => {
                preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
                applyTheme(preference === 'dark');
                try {
                    window.localStorage.setItem(storageKey, preference);
                    if (status) status.textContent = '';
                } catch (error) {
                    console.warn('Unable to save the colour scheme.', error);
                    if (status) status.textContent = 'Theme changed for this page, but your preference could not be saved.';
                }
            });
        }

        const menuToggle = document.querySelector('.menu-toggle');
        const menu = document.getElementById('primary-menu');
        const mobile = window.matchMedia('(max-width: 1199px)');
        if (!menuToggle || !menu) return;

        const setMenu = (open) => {
            menu.hidden = mobile.matches && !open;
            menuToggle.setAttribute('aria-expanded', String(open));
            menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        };
        const resetMenu = () => {
            menuToggle.hidden = !mobile.matches;
            setMenu(false);
        };
        resetMenu();
        mobile.addEventListener('change', () => {
            const focusInMenu = menu.contains(document.activeElement);
            const focusOnToggle = document.activeElement === menuToggle;
            resetMenu();
            if (mobile.matches && focusInMenu) menuToggle.focus();
            if (!mobile.matches && focusOnToggle) menu.querySelector('a')?.focus();
        });
        menuToggle.addEventListener('click', () => {
            setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
        });
        menu.addEventListener('click', (event) => {
            if (event.target.closest('a') && mobile.matches) {
                setMenu(false);
                menuToggle.focus();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                menuToggle.focus();
            }
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.page-header')) setMenu(false);
        });
    });
})();
