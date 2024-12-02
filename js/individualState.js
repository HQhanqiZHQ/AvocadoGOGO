class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedYear = null;
        this.sortMetric = "avgVolume"; // Default sort by volume
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
            .text(`Text size represents: ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`)
            .on("click", () => {
                vis.sortMetric = vis.sortMetric === "avgPrice" ? "avgVolume" : "avgPrice";
                vis.metricButton.text(`Text size represents: ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`);
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
                    text: state,
                    avgPrice: d3.mean(yearData, d => d.averagePrice) || 0,
                    avgVolume: d3.mean(yearData, d => d.totalVolume) || 0
                };
            })
            .filter(d => d.avgPrice > 0)
            .sort((a, b) => b[vis.sortMetric] - a[vis.sortMetric]);  // Sort by current metric

        // Add rank property
        vis.wordData.forEach((d, i) => {
            d.rank = i + 1;
        });
        const volumeScale = d3.scaleLog()
            .domain([d3.min(vis.wordData, d => d.avgVolume),
                d3.max(vis.wordData, d => d.avgVolume)])
            .range([20, 60]);

        vis.wordData.forEach(d => {
            d.size = volumeScale(d.avgVolume);
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.svg.selectAll("*").remove();

        const layout = d3.layout.cloud()
            .size([800, 500])
            .words(vis.wordData)
            .padding(15)
            .rotate(() => (~~(Math.random() * 2)) * 90)
            .fontSize(d => d.size)
            .spiral("archimedean")
            .on("end", draw);

        layout.start();

        function draw(words) {
            const colorScale = d3.scaleSequential()
                .domain(d3.extent(vis.wordData, d => d.avgPrice))
                .interpolator(d3.interpolateGreens);

            // Draw main word cloud
            const group = vis.svg.append("g")
                .attr("transform", "translate(400,250)")
                .selectAll("text")
                .data(words)
                .enter()
                .append("text")
                .style("font-family", "Patrick Hand")
                .style("fill", d => colorScale(d.avgPrice))
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
        <strong>${d.text}</strong><br/>
        Price: $${d.avgPrice.toFixed(2)}<br/>
        Volume: ${d3.format(",")(Math.round(d.avgVolume))}<br/>
        Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}: ${d.rank}/${vis.wordData.length}
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
                .text("Price Range:");

            const colorLegend = legend.append("g");
            const gradient = vis.svg.append("defs")
                .append("linearGradient")
                .attr("id", "color-gradient")
                .attr("y1", "0%")
                .attr("y2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", '#2E7D32');
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", '#E8F5E9');

            colorLegend.append("rect")
                .attr("width", 20)
                .attr("height", 100)
                .style("fill", "url(#color-gradient)");

            const priceExtent = d3.extent(vis.wordData, d => d.avgPrice);
            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 10)
                .style("font-family", "Patrick Hand")
                .text(`High: $${priceExtent[1].toFixed(2)}`);

            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 95)
                .style("font-family", "Patrick Hand")
                .text(`Low: $${priceExtent[0].toFixed(2)}`);

            // Size legend
            const volumeExtent = d3.extent(vis.wordData, d => d.avgVolume);
            const sizeLegend = legend.append("g")
                .attr("transform", "translate(0, 150)");

            sizeLegend.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .style("font-family", "Patrick Hand")
                .text("Volume Range:");

            // Example sizes
            [20, 40, 60].forEach((size, i) => {
                const y = i * 40 + 20;
                sizeLegend.append("text")
                    .attr("x", 0)
                    .attr("y", y)
                    .style("font-family", "Patrick Hand")
                    .style("font-size", size)
                    .text("Aa");

                sizeLegend.append("text")
                    .attr("x", 50)
                    .attr("y", y)
                    .style("font-family", "Patrick Hand")
                    .text(d3.format(".2s")(
                        d3.scaleLinear()
                            .domain([0, 2])
                            .range([volumeExtent[0], volumeExtent[1]])(i)
                    ));
            });

            // Animate words
            group.transition()
                .delay((d, i) => i * 20)
                .duration(1000)
                .style("opacity", 1);
        }
    }
}