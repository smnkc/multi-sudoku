let isDarkTheme = localStorage.getItem('sudoku_theme') === 'dark';
if (isDarkTheme) document.documentElement.setAttribute('data-theme', 'dark');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => console.error('SW Error:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.innerText = isDarkTheme ? '☀️' : '🌙';
        themeBtn.addEventListener('click', () => {
            isDarkTheme = !isDarkTheme;
            if (isDarkTheme) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('sudoku_theme', 'dark');
                themeBtn.innerText = '☀️';
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('sudoku_theme', 'light');
                themeBtn.innerText = '🌙';
            }
        });
    }
});
