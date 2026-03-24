// Professional Theme Slider JS for Live Hotel Onboarding
const html = document.documentElement;

if (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme')) {
    html.classList.add('dark');
} else if (localStorage.getItem('theme') === 'dark') {
    html.classList.add('dark');
}

document.addEventListener('DOMContentLoaded', () => {
    const themeSlider = document.getElementById('theme-slider-container');
    const themeSliderMobile = document.getElementById('theme-slider-mobile');

    const toggleTheme = () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    if (themeSlider) themeSlider.addEventListener('click', toggleTheme);
    if (themeSliderMobile) themeSliderMobile.addEventListener('click', toggleTheme);
});
