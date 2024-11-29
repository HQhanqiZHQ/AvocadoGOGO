class AvocadoVisualization {
    constructor() {
        this.data = null;
        this.priceVis = null;
        this.indStates = null;
        this.multiStates = null;
        this.seasonalVis = null;
        this.currentSectionIndex = 0;
        this.sections = [];

        // Initialize scroll buttons first
        this.initScrollButtons();
        // Then load data
        this.loadData();
    }

    async loadData() {
        try {
            console.log("Loading data...");
            const rawData = await d3.csv("data/avocado.csv");
            console.log("Data loaded:", rawData.length, "rows");

            // Process the data
            this.data = rawData.map(d => ({
                date: new Date(d.Date),
                averagePrice: +d.AveragePrice,
                totalVolume: +d["Total Volume"],
                volume4046: +d["4046"],
                volume4225: +d["4225"],
                volume4770: +d["4770"],
                totalBags: +d["Total Bags"],
                smallBags: +d["Small Bags"],
                largeBags: +d["Large Bags"],
                xLargeBags: +d["XLarge Bags"],
                type: d.type,
                year: +d.year,
                region: d.region
            }));

            console.log("Processing data for state visualizations...");
            this.processStateData();
            console.log("Initializing visualizations...");
            this.initializeVisualizations();

            // Add visibility to first section
            document.querySelector('.section-content').classList.add('visible');
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    processStateData() {
        const indStateData = {};
        const multiStateData = {};
        const regionData = {};

        this.data.forEach(row => {
            const states = mapLocationToStates(row.region);
            // console.log(states)
            if (states[0] === 'CA'){
                // console.log(states)
                const state = states[0];
                if (!multiStateData[state]) {
                    multiStateData[state] = [];
                }
                multiStateData[state].push(row);
            }
            if (states && states.length === 1) {
                const state = states[0];
                if (!indStateData[state]) {
                    indStateData[state] = [];
                }
                indStateData[state].push(row);

                if (states[0] === 'CA'){
                    if (!regionData[row.region] && row.region === 'California') {
                        regionData[row.region] = [];
                    }
                    regionData['California'].push(row);
                }
            }
            else if (states && states.length > 1) {
                if (!regionData[row.region]) {
                    regionData[row.region] = [];
                }
                regionData[row.region].push(row);

                states.forEach(state => {
                    if (!multiStateData[state]) {
                        multiStateData[state] = [];
                    }
                    multiStateData[state].push(row);
                });
            }
        });
        // console.log(regionData)
        this.indStateData = indStateData;
        this.multiStateData = multiStateData;
        this.regionData = regionData;
    }

    initializeVisualizations() {
        try {

            this.priceVis = new PriceVisualization("#price-vis", this.data);
            this.indStates = new IndividualState("#state-vis", this.indStateData);
            this.multiStates = new MultiStates("#multi-state-vis", this.regionData, this.indStateData);
            this.correlationVis = new CorrelationVis("#correlation-vis", this.data);
            this.treeVis = new TreeVis("#tree-vis", this.regionData);
            // Initial updates
            this.priceVis.updateVis();
            this.indStates.updateVis();
            // this.multiStates.updateVis();
            this.correlationVis.updateVis();
            this.treeVis.updateVis();
        } catch (error) {
            console.error("Error initializing visualizations:", error);
        }
    }

    initScrollButtons() {
        this.sections = Array.from(document.querySelectorAll('.full-height'));
        const dots = document.querySelectorAll('.scroll-dot');
        const upBtn = document.querySelector('.up-btn');
        const downBtn = document.querySelector('.down-btn');

        // Initialize up/down buttons
        upBtn?.addEventListener('click', () => this.scrollToSection('up'));
        downBtn?.addEventListener('click', () => this.scrollToSection('down'));

        // Initialize dot buttons
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.scrollToSection(index));
        });

        // Add scroll event listener
        window.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                this.updateScrollButtons();
                this.updateActiveDot();
                this.handleVisibilityUpdates();
            });
        });

        // Initial update
        this.updateScrollButtons();
        this.updateActiveDot();
    }

    scrollToSection(direction) {
        if (typeof direction === 'number') {
            this.currentSectionIndex = direction;
        } else {
            if (direction === 'up') {
                this.currentSectionIndex = Math.max(0, this.currentSectionIndex - 1);
            } else {
                this.currentSectionIndex = Math.min(this.sections.length - 1, this.currentSectionIndex + 1);
            }
        }

        // Update dots before scrolling
        this.updateActiveDot();

        // Scroll to section
        this.sections[this.currentSectionIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    updateScrollButtons() {
        const upBtn = document.querySelector('.up-btn');
        const downBtn = document.querySelector('.down-btn');

        if (upBtn && downBtn) {
            const shouldHideUp = window.scrollY < 100;
            upBtn.classList.toggle('hidden', shouldHideUp);

            const documentHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );
            const shouldHideDown = (window.innerHeight + window.scrollY) >= documentHeight - 100;
            downBtn.classList.toggle('hidden', shouldHideDown);
        }
    }

    updateActiveDot() {
        const dots = document.querySelectorAll('.scroll-dot');

        let activeIndex = 0;
        const scrollMid = window.scrollY + (window.innerHeight / 2);

        this.sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top;
            const absoluteBottom = absoluteTop + rect.height;

            if (scrollMid >= absoluteTop && scrollMid < absoluteBottom) {
                activeIndex = index;
                // Add visible class to current section
                section.querySelector('.section-content')?.classList.add('visible');
            }
        });

        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });

        this.currentSectionIndex = activeIndex;
    }

    handleVisibilityUpdates() {
        this.sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;

            if (isVisible) {
                section.querySelector('.section-content')?.classList.add('visible');
                this.updateVisOnScroll(section.id);
            }
        });
    }

    updateVisOnScroll(sectionId) {
        try {
            switch (sectionId) {
                case 'price':
                    this.priceVis?.updateVis();
                    break;
                case 'states':
                    this.indStates?.updateVis();
                    break;
                case 'multi':
                    this.multiStates?.updateVis();
                    break;
                case 'seasonal':
                    this.seasonalVis?.updateVis();
                    break;
            }
        } catch (error) {
            console.error(`Error updating visualization for section ${sectionId}:`, error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing application...");
    const app = new AvocadoVisualization();
    // // Initialize icon utilities
    // IconUtils.init();
});

document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.section-content');

    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});