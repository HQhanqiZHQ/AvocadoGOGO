class SeasonalVisualization {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set up dimensions
        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = {top: 60, right: 150, bottom: 60, left: 80};
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

        // Add title
        vis.svg.append("text")
            .attr("class", "vis-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-family", "RockSlayers")
            .style("font-size", "24px")
            .text("Seasonal Trends in Avocado Market");

        // Create scales
        vis.x = d3.scalePoint()
            .range([0, vis.width])
            .padding(0.5);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        // Create color scale for years
        vis.colorScale = d3.scaleOrdinal()
            .range(["#4a7337", "#6b8c21", "#ddd48f", "#cda989", "#704012"]);

        // Create axes
        vis.xAxis = d3.axisBottom(vis.x);
        vis.yAxis = d3.axisLeft(vis.y)
            .tickFormat(d => `$${d.toFixed(2)}`);

        // Add axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.svg.append("g")
            .attr("class", "axis y-axis");

        // Add axis labels
        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("x", -vis.height/2)
            .attr("y", -60)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "middle")
            .style("font-family", "ChalkboyRegular")
            .text("Average Price ($)");

        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("x", vis.width/2)
            .attr("y", vis.height + 40)
            .style("text-anchor", "middle")
            .style("font-family", "ChalkboyRegular")
            .text("Month");

        // Create legend
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 20}, 0)`);

        // Add controls
        vis.addControls();

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

        // Initial update
        vis.wrangleData();
    }
    update() {
        // Alias for updateVis to maintain consistency
        this.updateVis();
    }
    addControls() {
        let vis = this;

        // Add type selector
        const controls = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "controls")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px");

        // Add year range selector
        const years = [...new Set(vis.data.map(d => d.year))].sort();

        controls.append("select")
            .attr("class", "year-select")
            .style("margin", "0 10px")
            .style("padding", "5px")
            .style("font-family", "ChalkboyRegular")
            .selectAll("option")
            .data(years)
            .join("option")
            .attr("value", d => d)
            .text(d => d)
            .on("change", function() {
                vis.selectedYear = this.value;
                vis.wrangleData();
            });

        // Add type selector (Organic/Conventional)
        const typeSelector = controls.append("div")
            .attr("class", "type-selector")
            .style("margin-top", "10px");

        ['All', 'Organic', 'Conventional'].forEach(type => {
            typeSelector.append("label")
                .style("margin", "0 10px")
                .style("font-family", "ChalkboyRegular")
                .html(`
                    <input type="checkbox" value="${type.toLowerCase()}" 
                           ${type === 'All' ? 'checked' : ''}>
                    ${type}
                `);
        });

        // Add event listeners
        typeSelector.selectAll("input")
            .on("change", function() {
                vis.selectedTypes = Array.from(typeSelector.selectAll("input:checked").nodes())
                    .map(node => node.value);
                vis.wrangleData();
            });
    }

    wrangleData() {
        let vis = this;

        // Group data by month and calculate average prices
        let nestedData = d3.group(vis.data,
            d => d.date.getMonth(),
            d => d.year
        );

        // Process the nested data
        vis.processedData = Array.from(nestedData, ([month, yearGroup]) => ({
            month: month,
            values: Array.from(yearGroup, ([year, values]) => ({
                year: year,
                avgPrice: d3.mean(values, d => d.averagePrice),
                totalVolume: d3.sum(values, d => d.totalVolume)
            }))
        }));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update scales
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        vis.x.domain(months);

        const allPrices = vis.processedData.flatMap(d => d.values.map(v => v.avgPrice));
        vis.y.domain([0, d3.max(allPrices) * 1.1]);

        // Create line generator
        const line = d3.line()
            .x(d => vis.x(months[d.month]))
            .y(d => vis.y(d.values[0].avgPrice))
            .curve(d3.curveMonotoneX);

        // Add lines for each year with animation
        vis.svg.selectAll(".trend-line")
            .data(vis.processedData)
            .join("path")
            .attr("class", "trend-line")
            .attr("fill", "none")
            .attr("stroke", (d, i) => vis.colorScale(i))
            .attr("stroke-width", 2)
            .attr("d", d => line(d))
            .style("opacity", 0)
            .transition()
            .duration(1000)
            .style("opacity", 1);

        // Add interactive points
        vis.svg.selectAll(".price-point")
            .data(vis.processedData.flatMap(d =>
                d.values.map(v => ({month: d.month, ...v}))
            ))
            .join("circle")
            .attr("class", "price-point")
            .attr("cx", d => vis.x(months[d.month]))
            .attr("cy", d => vis.y(d.avgPrice))
            .attr("r", 5)
            .attr("fill", d => vis.colorScale(d.year))
            .style("opacity", 0)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 8)
                    .style("opacity", 1);

                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-family: ChalkboyRegular;">
                            <strong>Month:</strong> ${months[d.month]}<br/>
                            <strong>Year:</strong> ${d.year}<br/>
                            <strong>Average Price:</strong> $${d.avgPrice.toFixed(2)}<br/>
                            <strong>Volume:</strong> ${d3.format(",")(Math.round(d.totalVolume))}
                        </div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 5)
                    .style("opacity", 0);

                vis.tooltip.style("opacity", 0);
            });

        // Update axes
        vis.xAxisG
            .transition()
            .duration(1000)
            .call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        vis.yAxisG
            .transition()
            .duration(1000)
            .call(vis.yAxis);

        // Update legend
        const years = [...new Set(vis.data.map(d => d.year))].sort();

        const legendItems = vis.legend.selectAll(".legend-item")
            .data(years)
            .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendItems.selectAll("rect")
            .data(d => [d])
            .join("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => vis.colorScale(d));

        legendItems.selectAll("text")
            .data(d => [d])
            .join("text")
            .attr("x", 20)
            .attr("y", 12)
            .style("font-family", "ChalkboyRegular")
            .text(d => d);
    }
}