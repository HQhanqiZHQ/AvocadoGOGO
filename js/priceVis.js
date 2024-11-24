class PriceVisualization {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.filteredData = data;
        this.currentType = 'all'; // 'all', 'organic', 'conventional'
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set up chart dimensions
        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 60, right: 100, bottom: 60, left: 80 };
        vis.width = container.width - vis.margin.left - vis.margin.right;
        vis.height = container.height - vis.margin.top - vis.margin.bottom;

        // Create SVG container
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${container.width} ${container.height}`)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add title using custom font
        vis.svg.append("text")
            .attr("class", "vis-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-family", "RockSlayers")
            .style("font-size", "24px")
            .text("Avocado Price Trends");

        // Initialize scales
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        // Create axes
        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%b %Y"));
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
            .attr("x", -vis.height / 2)
            .attr("y", -60)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .text("Price ($)");

        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40)
            .style("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .text("Date");

        // Add type selector
        vis.typeSelector = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "type-selector")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px");

        vis.typeSelector.selectAll("button")
            .data(['all', 'organic', 'conventional'])
            .join("button")
            .attr("class", d => `type-btn ${d === vis.currentType ? 'active' : ''}`)
            .style("margin", "0 5px")
            .style("padding", "5px 10px")
            .style("border", "2px solid #4a7337")
            .style("border-radius", "15px")
            .style("background", d => d === vis.currentType ? "#4a7337" : "white")
            .style("color", d => d === vis.currentType ? "white" : "#4a7337")
            .style("cursor", "pointer")
            .style("font-family", "Patrick Hand")
            .text(d => d.charAt(0).toUpperCase() + d.slice(1))
            .on("click", function (event, d) {
                vis.currentType = d;
                vis.typeSelector.selectAll("button")
                    .style("background", btn => btn === d ? "#4a7337" : "white")
                    .style("color", btn => btn === d ? "white" : "#4a7337");
                vis.updateVis();
            });

        // Initialize tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("font-family", "Patrick Hand");

        // Add clip path for smooth transitions
        vis.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        vis.updateVis();
    }
    update() {
        // Alias for updateVis to maintain consistency
        this.updateVis();
    }
    updateVis() {
        let vis = this;

        // Filter data based on type
        vis.filteredData = vis.currentType === 'all'
            ? vis.data
            : vis.data.filter(d => d.type === vis.currentType);

        // Process data by date
        let processedData = d3.group(vis.filteredData, d => d.date);
        vis.displayData = Array.from(processedData, ([date, values]) => ({
            date: date,
            avgPrice: d3.mean(values, d => d.averagePrice),
            totalVolume: d3.sum(values, d => d.totalVolume)
        })).sort((a, b) => a.date - b.date);

        // Update scales
        vis.x.domain(d3.extent(vis.displayData, d => d.date));
        vis.y.domain([0, d3.max(vis.displayData, d => d.avgPrice) * 1.1]);

        // Create line generator
        const line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.avgPrice))
            .curve(d3.curveMonotoneX);

        // Add price line with animation
        const path = vis.svg.selectAll(".price-line")
            .data([vis.displayData])
            .join("path")
            .attr("class", "price-line")
            .attr("clip-path", "url(#clip)")
            .attr("fill", "none")
            .attr("stroke", "#4a7337")
            .attr("stroke-width", 2);

        // Animate the line
        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .attr("d", line);

        // Add interactive elements
        vis.svg.selectAll(".price-point")
            .data(vis.displayData)
            .join("circle")
            .attr("class", "price-point")
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.avgPrice))
            .attr("r", 4)
            .attr("fill", "#4a7337")
            .attr("opacity", 0)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 6)
                    .attr("opacity", 1);

                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-family: ChalkboyRegular;">
                            <strong>Date:</strong> ${d3.timeFormat("%B %Y")(d.date)}<br/>
                            <strong>Average Price:</strong> $${d.avgPrice.toFixed(2)}<br/>
                            <strong>Volume:</strong> ${d3.format(",")(Math.round(d.totalVolume))}
                        </div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 4)
                    .attr("opacity", 0);

                vis.tooltip
                    .style("opacity", 0);
            });

        // Update axes with animation
        vis.xAxisG
            .transition()
            .duration(1000)
            .call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)")
            .style("font-size", "0.8em");

        vis.yAxisG
            .transition()
            .duration(1000)
            .call(vis.yAxis);
    }
}