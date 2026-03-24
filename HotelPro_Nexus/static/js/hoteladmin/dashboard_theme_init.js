(function () {
    const savedTheme = localStorage.getItem('zenith_theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
    }
})();
