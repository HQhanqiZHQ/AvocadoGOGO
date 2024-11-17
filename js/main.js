class AvocadoVisualization {
    constructor() {
        this.data = null;
        this.priceVis = null;
        this.regionVis = null;
        this.seasonalVis = null;

        this.loadData();
        this.initScrollAnimation();
    }

    async loadData() {
        try {
            this.data = await d3.csv("data/avocado.csv", d => ({
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

            this.initializeVisualizations();
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    initializeVisualizations() {
        // Initialize visualizations with processed data
        this.priceVis = new PriceVisualization("#price-vis", this.data);
        this.regionVis = new RegionalVisualization("#region-vis", this.data);
        this.seasonalVis = new SeasonalVisualization("#seasonal-vis", this.data);
    }

    initScrollAnimation() {
        // Add smooth scrolling for navigation links
        document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Add scroll-based animations
        const sections = document.querySelectorAll('.analysis-section');

        const observerOptions = {
            root: null,
            threshold: 0.1,
            rootMargin: "0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Trigger visualization update when section becomes visible
                    this.updateVisOnScroll(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    updateVisOnScroll(sectionId) {
        switch (sectionId) {
            case 'price':
                this.priceVis?.update();
                break;
            case 'regional':
                this.regionVis?.update();
                break;
            case 'seasonal':
                this.seasonalVis?.update();
                break;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new AvocadoVisualization();
});