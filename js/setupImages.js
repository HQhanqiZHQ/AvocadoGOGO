// setupImages.js
const isLocalDevelopment = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
const basePath = isLocalDevelopment ? '' : '/AvocadoGOGO';
function setupBackgroundImages() {
    // Base path for GitHub Pages deployment
    const basePath = '/AvocadoGOGO';

    // Set up scroll dot images
    const regularScrollDot = `${basePath}/img/icons/icon8.png`;
    const activeScrollDot = `${basePath}/img/icons/icon7.png`;

    // Update scroll dots
    const dots = document.querySelectorAll('.scroll-dot');
    dots.forEach(dot => {
        dot.style.backgroundImage = `url('${regularScrollDot}')`;
    });

    // Update active dots
    const activeDots = document.querySelectorAll('.scroll-dot.active, .scroll-dot.visited');
    activeDots.forEach(dot => {
        dot.style.backgroundImage = `url('${activeScrollDot}')`;
    });


    // Add observer for scroll dot changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active') ||
                mutation.target.classList.contains('visited')) {
                mutation.target.style.backgroundImage = `url('${activeScrollDot}')`;
            } else {
                mutation.target.style.backgroundImage = `url('${regularScrollDot}')`;
            }
        });
    });

    // Observe each scroll dot for class changes
    dots.forEach(dot => {
        observer.observe(dot, {
            attributes: true,
            attributeFilter: ['class']
        });
    });
}

// Run setup when DOM is loaded
document.addEventListener('DOMContentLoaded', setupBackgroundImages);