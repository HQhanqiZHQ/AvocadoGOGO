class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = data;
        this.currentView = 'map'; // 'map' or 'table'
        this.selectedYear = '2018';
        this.selectedMetric = 'price'; // 'price' or 'volume'
        this.selectedType = 'all'; // 'all', 'organic', 'conventional'
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set up dimensions
        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 60, right: 200, bottom: 60, left: 60 };
        vis.width = container.width - vis.margin.left - vis.margin.right;
        vis.height = container.height - vis.margin.top - vis.margin.bottom;

        // Create SVG
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${container.width} ${container.height}`)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Create title
        vis.svg.append("text")
            .attr("class", "vis-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-family", "RockSlayers")
            .style("font-size", "24px")
            .text("Avocado Prices Across States");

        // Add controls
        vis.addControls();

        // Initialize map projection
        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width / 2, vis.height / 2])
            .scale(vis.width);

        vis.path = d3.geoPath()
            .projection(vis.projection);

        // Create color scales
        vis.priceColorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, 3]); // Typical price range

        vis.volumeColorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, 1000000]); // Adjust based on your volume range

        // Initialize tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("font-family", "ChalkboyRegular");

        // Load US map data
        Promise.all([
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
        ]).then(([us]) => {
            vis.usStates = topojson.feature(us, us.objects.states).features;
            vis.stateBorders = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
            vis.wrangleData();
        });
    }

    addControls() {
        let vis = this;

        const controls = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "controls")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px");

        // View toggle
        controls.append("button")
            .attr("class", "view-toggle")
            .style("margin", "5px")
            .style("padding", "5px 10px")
            .style("font-family", "ChalkboyRegular")
            .text("Switch View")
            .on("click", () => {
                vis.currentView = vis.currentView === 'map' ? 'table' : 'map';
                vis.updateVis();
            });

        // Year slider
        controls.append("div")
            .attr("class", "year-control")
            .style("margin", "10px")
            .html(`
                <label style="font-family: ChalkboyRegular">Year: 
                    <input type="range" min="2015" max="2018" value="2018" step="1">
                    <span class="year-display">2018</span>
                </label>
            `)
            .on("input", function () {
                vis.selectedYear = this.value;
                this.querySelector(".year-display").textContent = this.value;
                vis.wrangleData();
            });

        // Metric toggle
        const metricToggle = controls.append("div")
            .attr("class", "metric-toggle")
            .style("margin", "10px");

        ["Price", "Volume"].forEach(metric => {
            metricToggle.append("label")
                .style("margin", "0 10px")
                .style("font-family", "ChalkboyRegular")
                .html(`
                    <input type="radio" name="metric" value="${metric.toLowerCase()}" 
                           ${metric.toLowerCase() === vis.selectedMetric ? 'checked' : ''}>
                    ${metric}
                `);
        });

        metricToggle.selectAll("input")
            .on("change", function () {
                vis.selectedMetric = this.value;
                vis.wrangleData();
            });

        // Type selector
        const typeSelector = controls.append("div")
            .style("margin", "10px");

        ["All", "Organic", "Conventional"].forEach(type => {
            typeSelector.append("label")
                .style("margin", "0 10px")
                .style("font-family", "ChalkboyRegular")
                .html(`
                    <input type="radio" name="type" value="${type.toLowerCase()}" 
                           ${type.toLowerCase() === vis.selectedType ? 'checked' : ''}>
                    ${type}
                `);
        });

        typeSelector.selectAll("input")
            .on("change", function () {
                vis.selectedType = this.value;
                vis.wrangleData();
            });
    }

    wrangleData() {
        let vis = this;

        // Filter data based on selected year and type
        vis.filteredData = {};
        Object.entries(vis.data).forEach(([state, data]) => {
            const filteredStateData = data.filter(d => {
                const matchesYear = d.year === +vis.selectedYear;
                const matchesType = vis.selectedType === 'all' || d.type === vis.selectedType;
                return matchesYear && matchesType;
            });

            if (filteredStateData.length > 0) {
                vis.filteredData[state] = {
                    avgPrice: d3.mean(filteredStateData, d => d.averagePrice),
                    totalVolume: d3.sum(filteredStateData, d => d.totalVolume)
                };
            }
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        if (vis.currentView === 'map') {
            // Update map visualization
            const states = vis.svg.selectAll(".state")
                .data(vis.usStates);

            // Enter + Update
            states.join("path")
                .attr("class", "state")
                .attr("d", vis.path)
                .attr("fill", d => {
                    const stateData = vis.filteredData[d.properties.name];
                    if (!stateData) return "#ccc";
                    return vis.selectedMetric === 'price'
                        ? vis.priceColorScale(stateData.avgPrice)
                        : vis.volumeColorScale(stateData.totalVolume);
                })
                .on("mouseover", function (event, d) {
                    const stateData = vis.filteredData[d.properties.name];
                    if (stateData) {
                        d3.select(this)
                            .attr("stroke", "#000")
                            .attr("stroke-width", 2);

                        vis.tooltip
                            .style("opacity", 1)
                            .html(`
                                <div style="font-family: ChalkboyRegular">
                                    <strong>${d.properties.name}</strong><br/>
                                    Average Price: $${stateData.avgPrice.toFixed(2)}<br/>
                                    Total Volume: ${d3.format(",")(Math.round(stateData.totalVolume))}
                                </div>
                            `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function () {
                    d3.select(this)
                        .attr("stroke", null)
                        .attr("stroke-width", null);
                    vis.tooltip.style("opacity", 0);
                });

            // Add state borders
            vis.svg.selectAll(".state-borders")
                .data([vis.stateBorders])
                .join("path")
                .attr("class", "state-borders")
                .attr("d", vis.path)
                .attr("fill", "none")
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5);

        } else {
            // Update table visualization
            // Implementation for table view...
        }

        // Update legend
        vis.updateLegend();
    }

    updateLegend() {
        let vis = this;

        // Remove old legend
        vis.svg.selectAll(".legend").remove();

        // Create new legend
        const legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 10}, 20)`);

        const scale = vis.selectedMetric === 'price' ? vis.priceColorScale : vis.volumeColorScale;
        const title = vis.selectedMetric === 'price' ? 'Price ($)' : 'Volume';

        // Add gradient
        const gradientHeight = 200;
        const gradientWidth = 20;

        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .style("font-family", "ChalkboyRegular")
            .text(title);

        const gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");

        const numStops = 10;
        for (let i = 0; i < numStops; i++) {
            const offset = i / (numStops - 1);
            gradient.append("stop")
                .attr("offset", `${offset * 100}%`)
                .attr("stop-color", scale(scale.domain()[1] * (1 - offset)));
        }

        legend.append("rect")
            .attr("width", gradientWidth)
            .attr("height", gradientHeight)
            .style("fill", "url(#legend-gradient)");

        // Add scale ticks
        const ticks = scale.domain();
        ticks.forEach((tick, i) => {
            legend.append("text")
                .attr("x", gradientWidth + 5)
                .attr("y", gradientHeight * (1 - i / (ticks.length - 1)))
                .style("font-family", "ChalkboyRegular")
                .style("font-size", "12px")
                .text(vis.selectedMetric === 'price'
                    ? `$${tick.toFixed(2)}`
                    : d3.format(",")(tick));
        });
    }
}