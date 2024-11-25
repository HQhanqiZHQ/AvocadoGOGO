class PriceVisualization {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.filteredData = data;
        this.currentType = 'all';
        this.isStacked = false;
        this.dispatcher = d3.dispatch("brushed");
        this.colorScale = d3.scaleOrdinal()
            .domain(['organic', 'conventional'])
            .range(['#568203', '#88B04B']);
        // season mapping
        this.seasonMap = {
            0: "Winter", 1: "Winter", 2: "Spring",
            3: "Spring", 4: "Spring", 5: "Summer",
            6: "Summer", 7: "Summer", 8: "Fall",
            9: "Fall", 10: "Fall", 11: "Winter"
        };
        // Peak detection threshold
        this.peakThreshold = 0.1;
        this.iconSize = 30; // Size for the avocado icon

        this.initVis();
    }

    initVis() {
        let vis = this;

        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 60, right: 100, bottom: 60, left: 80 };
        vis.width = container.width - vis.margin.left - vis.margin.right;
        vis.height = container.height - vis.margin.top - vis.margin.bottom;

        // Create SVG drawing area
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${container.width} ${container.height}`)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
        // Add after creating SVG
        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 4)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .style("font-size", "20px")
            .text("Avocado Price Trends with Yearly Peaks and Troughs");
        // Initialize scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom(vis.x)
            .tickFormat(d3.timeFormat("%b %Y"));

        vis.yAxis = d3.axisLeft(vis.y)
            .tickFormat(d => `$${d.toFixed(2)}`);

        // Append axes groups
        vis.xAxisG = vis.svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisG = vis.svg.append("g")
            .attr("class", "axis y-axis");

        // Add clip path
        vis.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Initialize generators
        vis.stack = d3.stack()
            .keys(['organic', 'conventional']);

        vis.area = d3.area()
            .x(d => vis.x(d.data.date))
            .y0(d => vis.y(d[0]))
            .y1(d => vis.y(d[1]))
            .curve(d3.curveMonotoneX);

        vis.line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.avgPrice))
            .curve(d3.curveMonotoneX);

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
            .on("click", function(event, d) {
                // Toggle behavior: if clicking already selected button, go back to 'all'
                if (vis.currentType === d && d !== 'all') {
                    vis.currentType = 'all';
                } else {
                    vis.currentType = d;
                }

                // Update button styles
                vis.typeSelector.selectAll("button")
                    .style("background", btn => btn === vis.currentType ? "#4a7337" : "white")
                    .style("color", btn => btn === vis.currentType ? "white" : "#4a7337");

                vis.filterAndUpdateVis();
            });

        // Add buttons and UI elements
        vis.viewToggle = d3.select(vis.parentElement)
            .append("button")
            .attr("class", "view-toggle")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "200px")
            .style("padding", "5px 10px")
            .style("border", "2px solid #4a7337")
            .style("border-radius", "15px")
            .style("background", "#4a7337")
            .style("color", "white")
            .style("cursor", "pointer")
            .style("font-family", "Patrick Hand")
            .text("Toggle View")
            .on("click", function() {
                vis.isStacked = !vis.isStacked;
                d3.select(this)
                    .style("background", vis.isStacked ? "white" : "#4a7337")
                    .style("color", vis.isStacked ? "#4a7337" : "white");
                vis.filterAndUpdateVis();
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
            .style("font-family", "Patrick Hand");// Initialize legend
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width - 100}, 0)`);

        ['organic', 'conventional'].forEach((type, i) => {
            const legendRow = vis.legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", vis.colorScale(type));

            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-family", "Patrick Hand")
                .text(type.charAt(0).toUpperCase() + type.slice(1));
        });

        // Peak detection function
        vis.findPeaks = (data) => {
            // Group data by year
            let yearlyData = d3.group(data, d => d.date.getFullYear());
            let extremes = [];

            yearlyData.forEach((yearPoints, year) => {
                // Sort by date
                yearPoints.sort((a, b) => a.date - b.date);

                // Find peak (highest price)
                let peak = yearPoints.reduce((max, curr) =>
                    curr.avgPrice > max.avgPrice ? curr : max
                );

                // Find trough (lowest price)
                let trough = yearPoints.reduce((min, curr) =>
                    curr.avgPrice < min.avgPrice ? curr : min
                );

                // Add additional info
                peak.isPeak = true;
                peak.season = vis.seasonMap[peak.date.getMonth()];
                trough.isPeak = false;
                trough.season = vis.seasonMap[trough.date.getMonth()];

                extremes.push(peak, trough);
            });

            return extremes;
        };
        // Initial visualization
        vis.filterAndUpdateVis();
    }

    filterAndUpdateVis() {
        let vis = this;

        // Process data based on view type
        if (vis.isStacked) {
            // For stacked view, always include both types but zero out non-selected ones
            let groupedByDate = Array.from(d3.group(vis.data, d => d.date), ([date, values]) => {
                return {
                    date: date,
                    organic: vis.currentType === 'conventional' ? 0 :
                        d3.mean(values.filter(v => v.type === 'organic'), v => v.averagePrice) || 0,
                    conventional: vis.currentType === 'organic' ? 0 :
                        d3.mean(values.filter(v => v.type === 'conventional'), v => v.averagePrice) || 0
                };
            }).sort((a, b) => a.date - b.date);

            vis.displayData = groupedByDate;
            vis.stackedData = vis.stack(groupedByDate);
        } else {
            // For line view, filter data based on type
            if (vis.currentType !== 'all') {
                vis.filteredData = vis.data.filter(d => d.type === vis.currentType);
            } else {
                vis.filteredData = vis.data;
            }

            vis.displayData = Array.from(d3.group(vis.filteredData, d => d.date), ([date, values]) => ({
                date: date,
                avgPrice: d3.mean(values, d => d.averagePrice),
                totalVolume: d3.sum(values, d => d.totalVolume)
            })).sort((a, b) => a.date - b.date);
        }

        vis.updateVis();
    }
    updateVis() {
        let vis = this;

        if (!vis.displayData || vis.displayData.length === 0) {
            console.log("No data to display");
            return;
        }

        // Update scales
        vis.x.domain(d3.extent(vis.displayData, d => d.date));

// Find this section in updateVis() where we handle stacked areas
        if (vis.isStacked) {
            vis.y.domain([0, d3.max(vis.stackedData, d => d3.max(d, d => d[1]))]);

            // Update stacked areas
            let areas = vis.svg.selectAll(".price-area")
                .data(vis.stackedData);

            areas.exit().remove();

            areas.enter()
                .append("path")
                .attr("class", "price-area")
                .merge(areas)
                .attr("clip-path", "url(#clip)")
                .style("fill", d => vis.colorScale(d.key))
                .style("opacity", 0.8)  // Add default opacity
                .on("mouseover", function(event, d) {
                    // Highlight the area being hovered
                    d3.select(this)
                        .style("opacity", 1);

                    // Get data at mouse position
                    const mouseX = d3.pointer(event)[0];
                    const x0 = vis.x.invert(mouseX);
                    const bisect = d3.bisector(d => d.data.date).left;
                    const index = bisect(d, x0);
                    const data = d[index];

                    if (data) {
                        vis.tooltip
                            .style("opacity", 1)
                            .html(`
                        <div style="font-family: Patrick Hand;">
                            <strong>Type:</strong> ${d.key.charAt(0).toUpperCase() + d.key.slice(1)}<br/>
                            <strong>Date:</strong> ${d3.timeFormat("%B %Y")(data.data.date)}<br/>
                            <strong>Price:</strong> $${(data[1] - data[0]).toFixed(2)}<br/>
                            <strong>Total Price:</strong> $${data[1].toFixed(2)}
                        </div>
                    `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mousemove", function(event, d) {
                    // Update tooltip position on mouse move
                    const mouseX = d3.pointer(event)[0];
                    const x0 = vis.x.invert(mouseX);
                    const bisect = d3.bisector(d => d.data.date).left;
                    const index = bisect(d, x0);
                    const data = d[index];

                    if (data) {
                        vis.tooltip
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    // Reset area opacity and hide tooltip
                    d3.select(this)
                        .style("opacity", 0.8);
                    vis.tooltip.style("opacity", 0);
                })
                .transition()
                .duration(1000)
                .attr("d", vis.area);

            // Remove line elements and peaks
            vis.svg.selectAll(".price-line").remove();
            vis.svg.selectAll(".price-point").remove();
            vis.svg.selectAll(".peak-icon").remove();
        } else {
            vis.y.domain([0, d3.max(vis.displayData, d => d.avgPrice) * 1.1]);

            // Remove stacked areas
            vis.svg.selectAll(".price-area").remove();

            // Update line
            let line = vis.svg.selectAll(".price-line")
                .data([vis.displayData]);

            line.exit().remove();

            line.enter()
                .append("path")
                .attr("class", "price-line")
                .merge(line)
                .attr("clip-path", "url(#clip)")
                .attr("fill", "none")
                .attr("stroke", "#4a7337")
                .attr("stroke-width", 2)
                .transition()
                .duration(1000)
                .attr("d", vis.line);



// Find peaks and troughs
            let extremePoints = vis.findPeaks(vis.displayData);

// Add avocado icons at peaks and troughs
            let icons = vis.svg.selectAll(".extreme-icon")
                .data(extremePoints);

            icons.exit().remove();

            let iconsEnter = icons.enter()
                .append("g")
                .attr("class", "extreme-icon");

            iconsEnter.append("image")
                .attr("xlink:href", "img/icons/avocado slider.png")
                .attr("width", vis.iconSize)
                .attr("height", vis.iconSize)
                .attr("clip-path", "url(#clip)");

            icons = iconsEnter.merge(icons)
                .attr("transform", d => `translate(
        ${vis.x(d.date) - vis.iconSize/2},
        ${vis.y(d.avgPrice) - (d.isPeak ? vis.iconSize + 5 : -5)}
    )`);

// Rotate trough icons
            icons.select("image")
                .style("transform-origin", "center")
                .style("transform", d => d.isPeak ? "rotate(0deg)" : "rotate(180deg)")
                .style("opacity", d => d.isPeak ? 0.8 : 0.6)
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("opacity", 1)
                        .attr("width", vis.iconSize * 1.2)
                        .attr("height", vis.iconSize * 1.2);

                    vis.tooltip
                        .style("opacity", 1)
                        .html(`
                <div style="font-family: Patrick Hand;">
                    <strong>${d.isPeak ? 'Yearly Peak' : 'Yearly Low'}</strong><br/>
                    <strong>Date:</strong> ${d3.timeFormat("%B %Y")(d.date)}<br/>
                    <strong>Season:</strong> ${d.season}<br/>
                    <strong>Price:</strong> $${d.avgPrice.toFixed(2)}<br/>
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
                        .style("opacity", d => d.isPeak ? 0.8 : 0.6)
                        .attr("width", vis.iconSize)
                        .attr("height", vis.iconSize);

                    vis.tooltip.style("opacity", 0);
                });

// Add connecting lines between peaks and troughs for each year
            let yearlyGroups = Array.from(d3.group(extremePoints, d => d.date.getFullYear()));

            let connectors = vis.svg.selectAll(".year-connector")
                .data(yearlyGroups);

            connectors.exit().remove();

            connectors.enter()
                .append("path")
                .attr("class", "year-connector")
                .merge(connectors)
                .attr("fill", "none")
                .attr("stroke", "#4a7337")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4,4")
                .attr("opacity", 0.5)
                .transition()
                .duration(1000)
                .attr("d", d => {
                    let points = d[1].sort((a, b) => a.date - b.date);
                    return d3.line()
                        .x(p => vis.x(p.date))
                        .y(p => vis.y(p.avgPrice))
                        .curve(d3.curveMonotoneX)(points);
                });
            // Add year labels
            let yearLabels = vis.svg.selectAll(".year-label")
                .data(yearlyGroups);

            yearLabels.exit().remove();

            yearLabels.enter()
                .append("text")
                .attr("class", "year-label")
                .merge(yearLabels)
                .attr("x", d => {
                    let points = d[1].sort((a, b) => a.date - b.date);
                    return vis.x(points[0].date);
                })
                .attr("y", vis.height + 50)
                .attr("text-anchor", "middle")
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .text(d => d[0]);  // d[0] is the year

            // Update points (optional - you might want to remove this if you only want peaks)
            let points = vis.svg.selectAll(".price-point")
                .data(vis.displayData);

            points.exit().remove();

            let pointsEnter = points.enter()
                .append("circle")
                .attr("class", "price-point");

            points = pointsEnter.merge(points)
                .attr("clip-path", "url(#clip)")
                .attr("cx", d => vis.x(d.date))
                .attr("cy", d => vis.y(d.avgPrice))
                .attr("r", 4)
                .attr("fill", "#4a7337")
                .attr("opacity", 0);

            points
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 6)
                        .attr("opacity", 1);

                    vis.tooltip
                        .style("opacity", 1)
                        .html(`
        <div style="font-family: Patrick Hand;">
            <strong>${d.isPeak ? 'Yearly Peak' : 'Yearly Low'}</strong><br/>
            <strong>Date:</strong> ${d3.timeFormat("%B %Y")(d.date)}<br/>
            <strong>Season:</strong> ${d.season}<br/>
            <strong>Price:</strong> $${d.avgPrice.toFixed(2)}<br/>
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
                        .attr("r", 4)
                        .attr("opacity", 0);

                    vis.tooltip.style("opacity", 0);
                });
        }

        // Update axes
        vis.xAxisG.transition()
            .duration(1000)
            .call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)")
            .style("font-size", "0.8em");

        vis.yAxisG.transition()
            .duration(1000)
            .call(vis.yAxis);

        // Update legend visibility
        vis.legend
            .style("opacity", vis.isStacked ? 1 : 0)
            .style("pointer-events", vis.isStacked ? "all" : "none");
    }

    on(eventName, callback) {
        this.dispatcher.on(eventName, callback);
        return this;
    }
}

// Add to your styles constant
const styles = `
    .extreme-icon {
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .extreme-icon:hover {
        filter: brightness(1.2);
    }
    .year-connector {
        pointer-events: none;
        transition: all 1s;
    }
    .price-line {
        transition: d 1s;
    }
    .price-point {
        transition: all 0.2s;
    }
    .chart-title {
        font-weight: bold;
        fill: #4a7337;
    }
    .year-label {
        fill: #4a7337;
        font-weight: bold;
    }
    .tooltip {
        background-color: rgba(255, 255, 255, 0.95);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

