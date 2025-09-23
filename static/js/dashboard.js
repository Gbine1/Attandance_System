document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.classList.add(savedTheme);
    }

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-theme');

        // Save theme preference
        const currentTheme = body.classList.contains('dark-theme') ? 'dark-theme' : '';
        localStorage.setItem('theme', currentTheme);
    });

    // Mobile Menu Toggle - FINAL FIXED VERSION
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('mobile-show');
        document.body.classList.toggle('sidebar-open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 992 &&
            !e.target.closest('.sidebar') &&
            !e.target.closest('.menu-toggle')) {
            sidebar.classList.remove('mobile-show');
            document.body.classList.remove('sidebar-open');
        }
    });

    // Hover effect for sidebar
    sidebar.addEventListener('mouseenter', function() {
        if (window.innerWidth > 992 && !sidebar.classList.contains('mobile-show')) {
            sidebar.classList.add('hover-active');
        }
    });

    sidebar.addEventListener('mouseleave', function() {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('hover-active');
        }
    });

    // Check for username
    checkUsername();

    // Handle window resize
    function handleResize() {
        if (window.innerWidth <= 992) {
            sidebar.classList.remove('hover-active');
        } else {
            sidebar.classList.remove('mobile-show');
            document.body.classList.remove('sidebar-open');
        }
    }

    window.addEventListener('resize', handleResize);
});

// FINAL FIXED VERSION - USERNAME HANDLING
function checkUsername() {
    const username = localStorage.getItem('username');
    const avatar = localStorage.getItem('avatar');

    if (!username) {
        showUsernameModal();
    } else {
        updateAllUserElements(username, avatar);
    }
}

function showUsernameModal() {
    const modal = document.getElementById('username-modal');
    const input = document.getElementById('username-input');
    const saveBtn = document.getElementById('save-username');

    // Only run if modal exists (e.g., on home or login page)
    if (modal && input && saveBtn) {
        modal.style.display = 'flex';

        saveBtn.addEventListener('click', function() {
            const username = input.value.trim();
            if (username) {
                // Save username and generate avatar
                localStorage.setItem('username', username);
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FFA500&color=fff`;
                localStorage.setItem('avatar', avatarUrl);

                modal.style.display = 'none';
                updateAllUserElements(username, avatarUrl);
            }
        });

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    }
}


function updateAllUserElements(username, avatarUrl) {
    // Update greeting
    updateGreeting(username);

    // Update profile in top right
    document.getElementById('user-display-name').textContent = username;
    if (avatarUrl) {
        document.getElementById('user-avatar').src = avatarUrl;
    }
}

function updateGreeting(username) {
    const hour = new Date().getHours();
    let greeting = "Hello";

    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }

    document.getElementById('user-greeting').innerHTML = `${greeting}, <span>${username}</span>!`;
}