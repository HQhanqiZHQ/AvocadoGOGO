class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedYear = null;
        this.sortMetric = "avgVolume"; // Default sort by volume
        // Add state name mapping
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
            .attr("class", "state-cloud-container")
            .style("position", "relative")
            .style("background-color", "#ffffff")
            .style("border-radius", "8px")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

        vis.container.append("h3")
            .style("text-align", "center")
            .style("font-family", "RockSlayers")
            .style("color", "#4a7337")
            .style("margin", "0 0 20px 0")
            .style("font-size", "24px")
            .text("State Avocado Market Overview");

        this.addYearSelector();
        this.addMetricToggle();

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

        vis.cloudContainer = vis.container.append("div")
            .attr("class", "word-cloud")
            .style("width", "800px")
            .style("height", "600px")
            .style("margin", "20px auto")
            .style("overflow", "hidden")
            .style("position", "relative")
            .style("background-color", "#fafafa")
            .style("border-radius", "8px")
            .style("border", "1px solid #eee");

        vis.svg = vis.cloudContainer.append("svg")
            .attr("width", "800")
            .attr("height", "600")
            .style("display", "block");

        this.wrangleData();
    }

    addYearSelector() {
        let vis = this;
        const years = [...new Set(Object.values(vis.data)
            .flatMap(stateData => stateData.map(d => d.year)))].sort();

        const selectorContainer = vis.container.append("div")
            .style("text-align", "center")
            .style("margin", "20px 0");

        selectorContainer.append("label")
            .style("font-family", "Patrick Hand")
            .style("margin-right", "15px")
            .text("Select Year: ");

        selectorContainer.append("select")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("border-radius", "4px")
            .style("border", "1px solid #4a7337")
            .style("cursor", "pointer")
            .on("change", function() {
                vis.selectedYear = +this.value;
                vis.wrangleData();
            })
            .selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        vis.selectedYear = years[years.length - 1];
    }

    addMetricToggle() {
        let vis = this;
        vis.metricButton = vis.container.append("div")
            .style("text-align", "center")
            .style("margin", "10px 0")
            .append("button")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("cursor", "pointer")
            .style("background", "#4a7337")
            .style("color", "white")
            .style("border", "none")
            .style("border-radius", "5px")
            .text(`Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`)
            .on("click", () => {
                vis.sortMetric = vis.sortMetric === "avgPrice" ? "avgVolume" : "avgPrice";
                vis.metricButton.text(`Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`);
                vis.wrangleData();
            });
    }

    wrangleData() {
        let vis = this;
        vis.wordData = Object.entries(vis.data)
            .filter(([state, _]) => state !== 'ALL')
            .map(([state, stateData]) => {
                const yearData = stateData.filter(d => d.year === vis.selectedYear);
                return {
                    text: vis.stateMapping[state] || state,
                    abbreviation: state,
                    avgPrice: d3.mean(yearData, d => d.averagePrice) || 0,
                    avgVolume: d3.mean(yearData, d => d.totalVolume) || 0
                };
            })
            .filter(d => d.avgPrice > 0);

        // Calculate volume ranks
        let volumeSorted = [...vis.wordData].sort((a, b) => b.avgVolume - a.avgVolume);
        volumeSorted.forEach((d, i) => {
            vis.wordData.find(w => w.text === d.text).volumeRank = i + 1;
        });

        // Calculate price ranks
        let priceSorted = [...vis.wordData].sort((a, b) => b.avgPrice - a.avgPrice);
        priceSorted.forEach((d, i) => {
            vis.wordData.find(w => w.text === d.text).priceRank = i + 1;
        });

        // Sort by selected metric for display
        vis.wordData.sort((a, b) => b[vis.sortMetric] - a[vis.sortMetric]);

        const volumeScale = d3.scaleLog()
            .domain([d3.min(vis.wordData, d => d.avgVolume),
                d3.max(vis.wordData, d => d.avgVolume)])
            .range([8, 24]);

        vis.wordData.forEach(d => {
            d.size = volumeScale(d.avgVolume);
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.svg.selectAll("*").remove();

        // Create scales based on the current sort metric
        const colorScale = d3.scaleSequential()
            .domain(d3.extent(vis.wordData, d => vis.sortMetric === "avgPrice" ? d.avgPrice : d.avgVolume).reverse())
            .interpolator(d3.interpolateRdBu);

        const sizeScale = d3.scaleLog()
            .domain(d3.extent(vis.wordData, d => vis.sortMetric === "avgPrice" ? d.avgVolume : d.avgPrice))
            .range([8, 24]);

        // Update the size property for each word based on the current metric
        vis.wordData.forEach(d => {
            d.size = sizeScale(vis.sortMetric === "avgPrice" ? d.avgVolume : d.avgPrice);
        });

        const layout = d3.layout.cloud()
            .size([800, 500])
            .words(vis.wordData)
            .padding(8)
            .rotate(() => Math.random() * 90 - 45)
            .fontSize(d => d.size)
            .spiral("archimedean")
            .on("end", draw);

        layout.start();

        function draw(words) {
            const group = vis.svg.append("g")
                .attr("transform", "translate(400,250)")
                .selectAll("text")
                .data(words)
                .enter()
                .append("text")
                .style("font-family", "Patrick Hand")
                .style("fill", d => colorScale(vis.sortMetric === "avgPrice" ? d.avgPrice : d.avgVolume))
                .style("cursor", "pointer")
                .attr("text-anchor", "middle")
                .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                .attr("font-size", d => `${d.size}px`)
                .text(d => d.text)
                .style("opacity", 0)
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("font-size", `${d.size * 1.2}px`)
                        .style("font-weight", "bold");

                    vis.tooltip
                        .style("opacity", 1)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px")
                        .html(`
                        <div style="font-family: Patrick Hand">
                            <strong>${d.text} (${d.abbreviation})</strong><br/>
                            Price: $${d.avgPrice.toFixed(2)} (Rank: ${d.priceRank}/${vis.wordData.length})<br/>
                            Volume: ${d3.format(",")(Math.round(d.avgVolume))} (Rank: ${d.volumeRank}/${vis.wordData.length})
                        </div>
                    `);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("font-size", `${d.size}px`)
                        .style("font-weight", "normal");

                    vis.tooltip.style("opacity", 0);
                });

            // Add legend
            const legend = vis.svg.append("g")
                .attr("class", "legend")
                .attr("transform", "translate(650, 50)");

            // Color legend
            legend.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .style("font-family", "Patrick Hand")
                .text(`${vis.sortMetric === "avgPrice" ? "Price" : "Volume"} range`);

            const colorLegend = legend.append("g");
            const gradient = vis.svg.append("defs")
                .append("linearGradient")
                .attr("id", "color-gradient")
                .attr("y1", "0%")
                .attr("y2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", 'red');
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", 'blue');

            colorLegend.append("rect")
                .attr("width", 20)
                .attr("height", 100)
                .style("fill", "url(#color-gradient)");

            const metricExtent = d3.extent(vis.wordData, d =>
                vis.sortMetric === "avgPrice" ? d.avgPrice : d.avgVolume);

            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 10)
                .style("font-family", "Patrick Hand")
                .text(vis.sortMetric === "avgPrice" ?
                    `High: $${metricExtent[1].toFixed(2)}` :
                    `High: ${d3.format(",")(Math.round(metricExtent[1]))}`);

            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 95)
                .style("font-family", "Patrick Hand")
                .text(vis.sortMetric === "avgPrice" ?
                    `Low: $${metricExtent[0].toFixed(2)}` :
                    `Low: ${d3.format(",")(Math.round(metricExtent[0]))}`);

            // Size legend
            const sizeMetricExtent = d3.extent(vis.wordData, d =>
                vis.sortMetric === "avgPrice" ? d.avgVolume : d.avgPrice);

            const sizeLegend = legend.append("g")
                .attr("transform", "translate(0, 150)");

            sizeLegend.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .style("font-family", "Patrick Hand")
                .text(`${vis.sortMetric === "avgPrice" ? "Volume" : "Price"} range`);

            // Example sizes
            [20, 40, 60].forEach((size, i) => {
                const y = i * 40 + 20;
                sizeLegend.append("text")
                    .attr("x", 0)
                    .attr("y", y)
                    .style("font-family", "Patrick Hand")
                    .style("font-size", size)
                    .text("Aa");

                const value = d3.scaleLinear()
                    .domain([0, 2])
                    .range([sizeMetricExtent[0], sizeMetricExtent[1]])(i);

                sizeLegend.append("text")
                    .attr("x", 50)
                    .attr("y", y)
                    .style("font-family", "Patrick Hand")
                    .text(vis.sortMetric === "avgPrice" ?
                        d3.format(".2s")(value) :
                        `$${value.toFixed(2)}`);
            });

            // Animate words
            group.transition()
                .delay((d, i) => i * 20)
                .duration(1000)
                .style("opacity", 1);
        }
    }
}