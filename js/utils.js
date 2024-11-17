const IconUtils = {
    icons: {
        avocado: '../img/icons/icon1.png',
        organic: '../img/icons/icon2.png',
        conventional: '../img/icons/icon3.png',
        price: '../img/icons/icon4.png',
        volume: '../img/icons/icon5.png',
        trend: '../img/icons/icon6.png'
    },

    // Add cursor changes on double click instead of right click
    initCustomCursors() {
        // Change cursor on double click
        document.addEventListener('dblclick', (e) => {
            this.cycleCursor();
        });

        // Initialize with default cursor
        document.body.classList.add('cursor-avocado');
    },

    // Cycle through cursor types
    currentCursorIndex: 0,
    cursorClasses: ['cursor-avocado', 'cursor-organic', 'cursor-conventional'],
    cycleCursor() {
        document.body.classList.remove(...this.cursorClasses);
        this.currentCursorIndex = (this.currentCursorIndex + 1) % this.cursorClasses.length;
        document.body.classList.add(this.cursorClasses[this.currentCursorIndex]);
    },

    // Add decorative icons to specific positions
    addDecorativeIcons() {
        // Define fixed positions for icons
        const positions = [
            { top: '10px', right: '10px' },           // Top right corner
            { top: '10px', left: '10px' },            // Top left corner
            { bottom: '10px', right: '10px' },        // Bottom right corner
            { bottom: '10px', left: '10px' }          // Bottom left corner
        ];

        // Create container for positioned icons
        const container = document.createElement('div');
        container.className = 'decorative-icons-container';
        container.style.position = 'fixed';   // Fixed position relative to viewport
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '1000';      // Ensure icons are above other content

        // Add positioned icons
        positions.forEach((pos, index) => {
            const icon = document.createElement('img');
            icon.src = this.icons.avocado;    // Using avocado icon for all corners
            icon.className = 'corner-icon';
            icon.style.position = 'fixed';
            icon.style.width = '40px';        // Slightly larger size for visibility
            icon.style.height = '40px';

            // Apply all position styles from the positions array
            Object.keys(pos).forEach(key => {
                icon.style[key] = pos[key];
            });

            // Add subtle hover effect
            icon.style.transition = 'transform 0.3s ease';
            icon.style.transform = 'rotate(0deg)';

            // Add subtle animation
            icon.style.animation = `wiggle${index + 1} 3s ease-in-out infinite`;

            container.appendChild(icon);
        });

        // // Add small avocado in the center-top as a logo
        // const centerIcon = document.createElement('img');
        // centerIcon.src = this.icons.avocado;
        // centerIcon.className = 'center-icon';
        // centerIcon.style.position = 'fixed';
        // centerIcon.style.top = '10px';
        // centerIcon.style.left = '50%';
        // centerIcon.style.transform = 'translateX(-50%)';
        // centerIcon.style.width = '30px';
        // centerIcon.style.height = '30px';
        // centerIcon.style.transition = 'transform 0.3s ease';
        // centerIcon.style.animation = 'pulseIcon 2s ease-in-out infinite';

        // container.appendChild(centerIcon);
        document.body.appendChild(container);

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes wiggle1 {
                0%, 100% { transform: rotate(-5deg); }
                50% { transform: rotate(5deg); }
            }
            @keyframes wiggle2 {
                0%, 100% { transform: rotate(5deg); }
                50% { transform: rotate(-5deg); }
            }
            @keyframes wiggle3 {
                0%, 100% { transform: rotate(-5deg); }
                50% { transform: rotate(5deg); }
            }
            @keyframes wiggle4 {
                0%, 100% { transform: rotate(5deg); }
                50% { transform: rotate(-5deg); }
            }
            @keyframes pulseIcon {
                0%, 100% { transform: translateX(-50%) scale(1); }
                50% { transform: translateX(-50%) scale(1.1); }
            }
            .corner-icon:hover {
                transform: scale(1.2) !important;
            }
            .center-icon:hover {
                transform: translateX(-50%) scale(1.2) !important;
            }
        `;
        document.head.appendChild(style);
    },

    // Initialize all icon features
    init() {
        this.initCustomCursors();
        // Only add decorative icons on home page
        if (window.location.pathname.endsWith('index.html') ||
            window.location.pathname.endsWith('/')) {
            this.addDecorativeIcons();
        }
    }
};

// Initialize icon utilities
document.addEventListener('DOMContentLoaded', () => {
    IconUtils.init();
});