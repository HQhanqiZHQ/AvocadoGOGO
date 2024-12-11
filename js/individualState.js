class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedYear = null;
        this.sortMetric = "avgVolume";
        this.stateMapping = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
            'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
            'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
            'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
            'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
            'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
            'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
            'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
            'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
            'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
            'WI': 'Wisconsin', 'WY': 'Wyoming'
        };
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.container = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "state-visualization-container")
            .style("position", "relative")
            .style("background-color", "#ffffff")
            .style("border-radius", "8px")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
            .style("padding", "40px")  // Increase padding
            .style("max-width", "1400px")  // Set max-width
            .style("margin", "0 auto")

        vis.width = 800;
        vis.height = 600;

        // Add title
        vis.container.append("h3")
            .style("text-align", "center")
            .style("font-family", "RockSlayers")
            .style("color", "#4a7337")
            .style("margin", "0 0 20px 0")
            .style("font-size", "24px")
            .text("State Avocado Market Overview");

        // Controls container
        const controlsContainer = vis.container.append("div")
            .attr("class", "controls-container")
            .style("display", "flex")
            .style("justify-content", "center")
            .style("gap", "20px")
            .style("margin-bottom", "40px");

        // Add controls
        this.addYearSelector(controlsContainer);
        this.addMetricToggle(controlsContainer);

        // Create container for visualizations
        const visContainer = vis.container.append("div")
            .attr("class", "visualizations-container")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("height", "500px")  // Set fixed height
            .style("margin-bottom", "40px");  // Add margin before the text

        // Word cloud container
        vis.wordCloudContainer = visContainer.append("div")
            .attr("class", "word-cloud-container")
            .style("width", "50%")
            .style("height", "100%");

        // Circle visualization container
        vis.circleContainer = visContainer.append("div")
            .attr("class", "circle-container")
            .style("width", "50%")
            .style("height", "100%");

        // Initialize SVGs
        vis.wordCloudSvg = vis.wordCloudContainer.append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        vis.circleSvg = vis.circleContainer.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", `translate(${vis.width/4},${vis.height/2})`);

        // Initialize tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "state-tooltip")
            .style("position", "absolute")
            .style("opacity", "0")
            .style("background", "white")
            .style("padding", "12px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "6px")
            .style("font-family", "Patrick Hand")
            .style("font-size", "14px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

        // Initialize force simulation for circles
        vis.simulation = d3.forceSimulation()
            .force("center", d3.forceCenter(0, 0))
            .force("charge", d3.forceManyBody().strength(50))
            .force("collide", d3.forceCollide().radius(d => d.radius + 2))
            .on("tick", () => vis.ticked());

        this.wrangleData();
    }
    addYearSelector(container) {
        let vis = this;
        const years = [...new Set(Object.values(vis.data)
            .flatMap(stateData => stateData.map(d => d.year)))].sort();

        const select = container.append("select")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("border-radius", "4px")
            .style("border", "1px solid #4a7337")
            .style("cursor", "pointer")
            .on("change", function() {
                vis.selectedYear = +this.value;
                vis.wrangleData();
            });

        select.selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        vis.selectedYear = years[years.length - 1];
    }

    addMetricToggle(container) {
        let vis = this;
        container.append("button")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("cursor", "pointer")
            .style("background", "#4a7337")
            .style("color", "white")
            .style("border", "none")
            .style("border-radius", "5px")
            .text(`Sort by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`)
            .on("click", function() {
                vis.sortMetric = vis.sortMetric === "avgPrice" ? "avgVolume" : "avgPrice";
                d3.select(this).text(`Sort by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`);
                vis.wrangleData();
            });
    }

    wrangleData() {
        let vis = this;

        // Process data for both visualizations
        vis.processedData = Object.entries(vis.data)
            .filter(([state, _]) => state !== 'ALL')
            .map(([state, stateData]) => {
                const yearData = stateData.filter(d => d.year === vis.selectedYear);
                const avgVolume = d3.mean(yearData, d => d.totalVolume) || 0;
                const avgPrice = d3.mean(yearData, d => d.averagePrice) || 0;
                const totalVolume = d3.sum(yearData, d => d.totalVolume) || 0;
                const volumePercentage = (totalVolume / d3.sum(Object.values(vis.data)
                    .flat()
                    .filter(d => d.year === vis.selectedYear), d => d.totalVolume)) * 100;

                return {
                    text: vis.stateMapping[state],
                    state: vis.stateMapping[state],
                    abbreviation: state,
                    avgVolume,
                    avgPrice,
                    volumePercentage,
                    value: vis.sortMetric === "avgPrice" ? avgPrice : avgVolume
                };
            })
            .filter(d => d.avgPrice > 0);

        // Sort data
        vis.processedData.sort((a, b) => b[vis.sortMetric] - a[vis.sortMetric]);

        // Add ranks
        vis.processedData.forEach((d, i) => {
            d.rank = i + 1;
        });

        // Calculate scales
        vis.sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(vis.processedData, d => d[vis.sortMetric])])
            .range([10, 40]);

        // Calculate scales for different metrics
        vis.volumeSizeScale = d3.scaleSqrt()
            .domain([0, d3.max(vis.processedData, d => d.volumePercentage)])
            .range([10, 40]);

        vis.priceSizeScale = d3.scaleSqrt()
            .domain([0, d3.max(vis.processedData, d => d.avgPrice)])
            .range([10, 40]);

        vis.colorScale = d3.scaleSequential()
            .domain([
                d3.min(vis.processedData, d => d[vis.sortMetric]),
                d3.mean(vis.processedData, d => d[vis.sortMetric]),
                d3.max(vis.processedData, d => d[vis.sortMetric])
            ])
            .interpolator(d3.interpolateRdBu);

        // Calculate sizes for both visualizations
        vis.processedData.forEach(d => {
            // Word cloud size based on selected metric
            d.size = vis.sizeScale(d[vis.sortMetric]);

            // Circle size should always be based on market share (volume percentage)
            d.radius = vis.volumeSizeScale(d.volumePercentage);

            d.color = vis.colorScale(d[vis.sortMetric]);
        });

        this.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update word cloud
        this.updateWordCloud();

        // Update circle visualization
        this.updateCircles();
    }

    updateWordCloud() {
        let vis = this;
        const wordCloudWidth = vis.wordCloudContainer.node().getBoundingClientRect().width;
        const wordCloudHeight = vis.wordCloudContainer.node().getBoundingClientRect().height;

        // Clear previous word cloud
        vis.wordCloudSvg.selectAll("*").remove();

        const cloud = vis.wordCloudSvg.append("g")
            .attr("transform", `translate(${wordCloudWidth/2},${wordCloudHeight/2})`);

        // Create word cloud layout
        const layout = d3.layout.cloud()
            .size([wordCloudWidth, wordCloudHeight])
            .words(vis.processedData)
            .padding(5)
            .rotate(() => ~~(Math.random() * 2) * 90)
            .fontSize(d => d.size)
            .on("end", words => {
                cloud.selectAll("text")
                    .data(words)
                    .enter()
                    .append("text")
                    .style("font-family", "Patrick Hand")
                    .style("fill", d => d.color)
                    .attr("text-anchor", "middle")
                    .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                    .attr("font-size", d => `${d.size}px`)
                    .text(d => d.text)
                    .on("mouseover", (event, d) => this.showTooltip(event, d))
                    .on("mouseout", () => this.hideTooltip());
            });

        layout.start();

        // Add legend
        this.addWordCloudLegend();
    }

    addWordCloudLegend() {
        let vis = this;
        const legend = vis.wordCloudSvg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(20, 20)");  // coordinates to top-left

        // Color legend
        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .style("font-family", "Patrick Hand")
            .text(`${vis.sortMetric === "avgPrice" ? "Price" : "Volume"} Range`);

        const gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "color-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", vis.colorScale(0));

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", vis.colorScale(d3.max(vis.processedData, d => d[vis.sortMetric])));

        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 100)
            .style("fill", "url(#color-gradient)");

        // Add labels
        const extent = d3.extent(vis.processedData, d => d[vis.sortMetric]);
        legend.append("text")
            .attr("x", 25)
            .attr("y", 10)
            .style("font-family", "Patrick Hand")
            .text(vis.sortMetric === "avgPrice" ?
                `High: $${extent[1].toFixed(2)}` :
                `High: ${d3.format(",")(Math.round(extent[1]))}`);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 90)
            .style("font-family", "Patrick Hand")
            .text(vis.sortMetric === "avgPrice" ?
                `Low: $${extent[0].toFixed(2)}` :
                `Low: ${d3.format(",")(Math.round(extent[0]))}`);
    }

    updateCircles() {
        let vis = this;

        // Clear previous circles
        vis.circleSvg.selectAll("*").remove();

        // Create circles
        const circles = vis.circleSvg.selectAll(".state-circle")
            .data(vis.processedData)
            .enter()
            .append("g")
            .attr("class", "state-circle");

        circles.append("circle")
            .attr("r", d => d.radius)
            .style("fill", d => d.color)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => this.showTooltip(event, d))
            .on("mouseout", () => this.hideTooltip());

        circles.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-family", "Patrick Hand")
            .style("fill", "#fff")
            .style("font-size", d => `${d.radius/2}px`)
            .text(d => d.abbreviation);

        // Add legend for circles
        this.addCircleLegend();

        // Update simulation
        vis.simulation
            .nodes(vis.processedData)
            .force("collide", d3.forceCollide().radius(d => d.radius + 2))
            .alpha(1)
            .restart();
    }

    addCircleLegend() {
        let vis = this;
        const legend = vis.circleSvg.append("g")
            .attr("class", "circle-legend")
            .attr("transform", `translate(${vis.width/2 - 250}, -250)`);

        legend.append("text")
            .attr("x", 0)
            .attr("y", -20)
            .style("font-family", "Patrick Hand")
            .text("Market Share");

        // Calculate dynamic size values based on actual data
        const maxValue = d3.max(vis.processedData, d => d.volumePercentage);
        const sizes = [
            maxValue * 0.1,  // Small - 10% of max
            maxValue * 0.5,  // Medium - 50% of max
            maxValue        // Large - max value
        ];

        sizes.forEach((size, i) => {
            const y = i * 50;
            const radius = vis.volumeSizeScale(size);

            legend.append("circle")
                .attr("cx", radius)
                .attr("cy", y + radius)
                .attr("r", radius)
                .style("fill", "none")
                .style("stroke", "#666")
                .style("stroke-dasharray", "2,2");

            legend.append("text")
                .attr("x", radius * 2 + 10)
                .attr("y", y + radius)
                .attr("dy", "0.35em")
                .style("font-family", "Patrick Hand")
                .text(`${size.toFixed(2)}%`);
        });
    }
    showTooltip(event, d) {
        let vis = this;
        vis.tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`
                <div style="font-family: Patrick Hand">
                    <strong>${d.state} (${d.abbreviation})</strong><br/>
                    Rank: ${d.rank} of ${vis.processedData.length}<br/>
                    Volume: ${d3.format(",")(Math.round(d.avgVolume))}<br/>
                    Price: $${d.avgPrice.toFixed(2)}<br/>
                    Market Share: ${d.volumePercentage.toFixed(2)}%
                </div>
            `);
    }

    hideTooltip() {
        this.tooltip.style("opacity", 0);
    }

    ticked() {
        let vis = this;
        vis.circleSvg.selectAll(".state-circle")
            .attr("transform", d => `translate(${d.x},${d.y})`);
    }
}