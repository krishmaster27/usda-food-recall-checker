// Wait for the page to load
window.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.main-content');

    // Slide in the sidebar on page load
    sidebar.classList.add('active');
    content.classList.add('shifted');

    // Create a toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '&#9776;'; // hamburger icon
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.top = '20px';
    toggleBtn.style.left = '20px';
    toggleBtn.style.fontSize = '24px';
    toggleBtn.style.background = '#0074D9';
    toggleBtn.style.color = 'white';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '6px';
    toggleBtn.style.padding = '10px 14px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.zIndex = '1100';
    document.body.appendChild(toggleBtn);

    // Toggle sidebar visibility
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        content.classList.toggle('shifted');
    });
});
