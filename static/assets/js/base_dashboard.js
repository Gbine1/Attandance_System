document.addEventListener("DOMContentLoaded", function() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const themeToggle = document.getElementById("themeToggle");

    // Toggle sidebar
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });

    // Hover expand if collapsed
    sidebar.addEventListener("mouseenter", () => {
        if (sidebar.classList.contains("collapsed")) {
            sidebar.style.width = "220px";
        }
    });
    sidebar.addEventListener("mouseleave", () => {
        if (sidebar.classList.contains("collapsed")) {
            sidebar.style.width = "60px";
        }
    });

    // Light/Dark theme toggle
    themeToggle.addEventListener("click", () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute("data-bs-theme");
        html.setAttribute("data-bs-theme", currentTheme === "light" ? "dark" : "light");
    });
});