class PriceVisualization {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.viewType = 'combined';
        this.colorScale = d3.scaleOrdinal()
            .domain(['combined', 'organic', 'conventional'])
            .range(['#4a7337', '#568203', '#88B04B']);
        this.seasonMap = {
            0: "Winter", 1: "Winter", 2: "Spring",
            3: "Spring", 4: "Spring", 5: "Summer",
            6: "Summer", 7: "Summer", 8: "Fall",
            9: "Fall", 10: "Fall", 11: "Winter"
        };
        this.iconSize = 30;
        this.initVis();
    }

    initVis() {
        let vis = this;
        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 60, right: 100, bottom: 60, left: 80 };
        vis.width = container.width - vis.margin.left - vis.margin.right;
        vis.height = container.height - vis.margin.top - vis.margin.bottom;

        // SVG setup
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${container.width} ${container.height}`)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Title
        vis.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", vis.width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .style("font-size", "20px")
            .text("Avocado Price Trends");

        // Scales and axes
        vis.x = d3.scaleTime().range([0, vis.width]);
        vis.y = d3.scaleLinear().range([vis.height, 0]);
        vis.xAxis = d3.axisBottom(vis.x).tickFormat(d3.timeFormat("%b %Y"));
        vis.yAxis = d3.axisLeft(vis.y).tickFormat(d => `$${d.toFixed(2)}`);

        // Append axes
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

        // View type buttons
        const buttonContainer = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "button-container")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px")
            .style("display", "flex")
            .style("gap", "10px");

        ['combined', 'separate', 'stacked'].forEach(type => {
            buttonContainer.append("button")
                .attr("class", `view-btn ${type === vis.viewType ? 'active' : ''}`)
                .style("margin", "0 5px")
                .style("padding", "8px 15px")
                .style("border", "2px solid #4a7337")
                .style("border-radius", "15px")
                .style("background", type === vis.viewType ? "#4a7337" : "white")
                .style("color", type === vis.viewType ? "white" : "#4a7337")
                .style("cursor", "pointer")
                .style("font-family", "Patrick Hand")
                .style("font-size", "14px")
                .text(type.charAt(0).toUpperCase() + type.slice(1))
                .on("click", function() {
                    vis.viewType = type;
                    buttonContainer.selectAll("button")
                        .style("background", btn => btn === type ? "#4a7337" : "white")
                        .style("color", btn => btn === type ? "white" : "#4a7337");
                    vis.updateVis();
                });
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
            .style("font-family", "Patrick Hand")
            .style("pointer-events", "none")
            .style("z-index", 1000);

        this.updateVis();
        this.initBottomTooltip();

        // Add transparent overlay for mouse tracking
        vis.overlay = vis.svg.append("rect")
            .attr("class", "overlay")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .style("opacity", 0)
            .on("mousemove", function(event) {
                const mouseX = d3.pointer(event)[0];
                const x0 = vis.x.invert(mouseX);
                const bisect = d3.bisector(d => d.date).left;
                const data = vis.processData();
                const index = bisect(data, x0);
                const d = data[index];

                if (d) {
                    vis.bottomTooltip
                        .style("opacity", 1)
                        .html(`
                        <div style="text-align: center;">
                            <strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br/>
                            ${vis.viewType === 'combined' ?
                            `<strong>Average Price:</strong> $${d.combined.toFixed(2)}` :
                            `<strong>Organic:</strong> $${d.organic.toFixed(2)} | 
                                 <strong>Conventional:</strong> $${d.conventional.toFixed(2)}`
                        }<br/>
                            <strong>Total Volume:</strong> ${d3.format(",")(d.totalVolume)}
                        </div>
                    `);
                }
            })
            .on("mouseout", function() {
                vis.bottomTooltip.style("opacity", 0);
            });
    }

    processData() {
        let vis = this;
        let grouped = Array.from(d3.group(vis.data, d => d.date), ([date, values]) => ({
            date: date,
            combined: d3.mean(values, d => d.averagePrice),
            organic: d3.mean(values.filter(v => v.type === 'organic'), d => d.averagePrice),
            conventional: d3.mean(values.filter(v => v.type === 'conventional'), d => d.averagePrice),
            totalVolume: d3.sum(values, d => d.totalVolume)
        })).sort((a, b) => a.date - b.date);

        return grouped;
    }

    findPeaks(data) {
        let yearlyData = d3.group(data, d => d.date.getFullYear());
        let extremes = [];

        yearlyData.forEach((yearPoints, year) => {
            yearPoints.sort((a, b) => a.date - b.date);
            let peak = yearPoints.reduce((max, curr) =>
                curr.combined > max.combined ? curr : max
            );
            let trough = yearPoints.reduce((min, curr) =>
                curr.combined < min.combined ? curr : min
            );

            peak.isPeak = true;
            peak.season = this.seasonMap[peak.date.getMonth()];
            trough.isPeak = false;
            trough.season = this.seasonMap[trough.date.getMonth()];

            extremes.push(peak, trough);
        });

        return extremes;
    }
    initBottomTooltip() {
        let vis = this;

        // Create bottom tooltip container
        vis.bottomTooltip = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "bottom-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("left", "50%")
            .style("transform", "translateX(-50%)")
            .style("bottom", "10px")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("font-family", "Patrick Hand")
            .style("pointer-events", "none")
            .style("z-index", 1000);
    }
    updateVis() {
        let vis = this;
        let processedData = vis.processData();
        let extremePoints = vis.findPeaks(processedData);

        // Update scales
        vis.x.domain(d3.extent(processedData, d => d.date));
        vis.y.domain([0, d3.max(processedData, d => {
            if (vis.viewType === 'stacked') {
                return d.organic + d.conventional;
            } else {
                return d3.max([d.combined, d.organic, d.conventional]);
            }
        }) * 1.1]);

        // Clear previous elements
        vis.svg.selectAll(".price-line").remove();
        vis.svg.selectAll(".price-area").remove();
        vis.svg.selectAll(".extreme-icon").remove();
        vis.svg.selectAll(".year-connector").remove();

        if (vis.viewType === 'combined') {
            // Single line for combined average
            vis.svg.append("path")
                .datum(processedData)
                .attr("class", "price-line")
                .attr("fill", "none")
                .attr("stroke", vis.colorScale('combined'))
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(d => vis.x(d.date))
                    .y(d => vis.y(d.combined))
                    .curve(d3.curveMonotoneX));

            // Add peaks and troughs
            this.addExtremePoints(extremePoints, 'combined');

        } else if (vis.viewType === 'separate') {
            // Separate lines for organic and conventional
            ['organic', 'conventional'].forEach(type => {
                vis.svg.append("path")
                    .datum(processedData)
                    .attr("class", "price-line")
                    .attr("fill", "none")
                    .attr("stroke", vis.colorScale(type))
                    .attr("stroke-width", 2)
                    .attr("d", d3.line()
                        .x(d => vis.x(d.date))
                        .y(d => vis.y(d[type]))
                        .curve(d3.curveMonotoneX));
            });

            // Add peaks for both types
            this.addExtremePoints(extremePoints.filter(d => d.type === 'organic'), 'organic');
            this.addExtremePoints(extremePoints.filter(d => d.type === 'conventional'), 'conventional');

        } else if (vis.viewType === 'stacked') {
            // Stacked area chart
            const stack = d3.stack()
                .keys(['conventional', 'organic'])
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);

            const stackedData = stack(processedData);

            const area = d3.area()
                .x(d => vis.x(d.data.date))
                .y0(d => vis.y(d[0]))
                .y1(d => vis.y(d[1]))
                .curve(d3.curveMonotoneX);

            vis.svg.selectAll(".price-area")
                .data(stackedData)
                .enter()
                .append("path")
                .attr("class", "price-area")
                .attr("fill", d => vis.colorScale(d.key))
                .attr("d", area)
                .style("opacity", 0.7)
                .on("mouseover", function(event, d) {
                    d3.select(this).style("opacity", 0.9);
                    const mouseX = d3.pointer(event)[0];
                    const x0 = vis.x.invert(mouseX);
                    const bisect = d3.bisector(d => d.date).left;
                    const index = bisect(processedData, x0);
                    const data = processedData[index];

                    if (data) {
                        vis.tooltip
                            .style("opacity", 1)
                            .html(`
                                <div>
                                    <strong>Date:</strong> ${d3.timeFormat("%B %Y")(data.date)}<br/>
                                    <strong>Organic:</strong> $${data.organic.toFixed(2)}<br/>
                                    <strong>Conventional:</strong> $${data.conventional.toFixed(2)}<br/>
                                    <strong>Total Volume:</strong> ${d3.format(",")(data.totalVolume)}
                                </div>
                            `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    d3.select(this).style("opacity", 0.7);
                    vis.tooltip.style("opacity", 0);
                });
        }
        vis.addYearDividers();
        // Update axes
        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        vis.yAxisG.call(vis.yAxis);

        // Update legend
        vis.updateLegend();
    }
    addExtremePoints(extremePoints, type) {
        let vis = this;

        // Add avocado icons with dots
        let icons = vis.svg.selectAll(`.extreme-icon-${type}`)
            .data(extremePoints);

        icons.exit().remove();

        let iconsEnter = icons.enter()
            .append("g")
            .attr("class", `extreme-icon extreme-icon-${type}`);

        // Add avocado icons
        iconsEnter.append("image")
            .attr("xlink:href", "img/icons/avocado slider.png")
            .attr("width", vis.iconSize)
            .attr("height", vis.iconSize)
            .attr("clip-path", "url(#clip)");

        // Add dots at peaks and troughs
        iconsEnter.append("circle")
            .attr("class", "peak-dot")
            .attr("r", 4)
            .attr("fill", vis.colorScale(type))
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        icons = iconsEnter.merge(icons)
            .attr("transform", d => `translate(
            ${vis.x(d.date) - vis.iconSize/2},
            ${vis.y(d[type]) - (d.isPeak ? vis.iconSize + 5 : -5)}
        )`);

        // Update icons and add interactions
        icons.select("image")
            .style("transform-origin", "center")
            .style("transform", d => d.isPeak ? "rotate(0deg)" : "rotate(180deg)")
            .style("opacity", d => d.isPeak ? 0.8 : 0.6)
            .on("mouseover", function(event, d) {
                const icon = d3.select(this.parentNode);

                icon.select("image")
                    .transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("width", vis.iconSize * 1.2)
                    .attr("height", vis.iconSize * 1.2);

                icon.select("circle")
                    .transition()
                    .duration(200)
                    .attr("r", 6)
                    .style("opacity", 1);

                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                    <div style="font-family: Patrick Hand;">
                        <strong>${d.isPeak ? 'Yearly Peak' : 'Yearly Low'}</strong><br/>
                        <strong>Date:</strong> ${d3.timeFormat("%B %Y")(d.date)}<br/>
                        <strong>Season:</strong> ${d.season}<br/>
                        <strong>Price:</strong> $${d[type].toFixed(2)}<br/>
                        <strong>Volume:</strong> ${d3.format(",")(d.totalVolume)}
                    </div>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                const icon = d3.select(this.parentNode);

                icon.select("image")
                    .transition()
                    .duration(200)
                    .style("opacity", d => d.isPeak ? 0.8 : 0.6)
                    .attr("width", vis.iconSize)
                    .attr("height", vis.iconSize);

                icon.select("circle")
                    .transition()
                    .duration(200)
                    .attr("r", 4)
                    .style("opacity", 0.8);

                vis.tooltip.style("opacity", 0);
            });

        // Update dots position
        icons.select("circle")
            .attr("cx", vis.iconSize/2)
            .attr("cy", d => d.isPeak ? vis.iconSize + 5 : -5)
            .style("opacity", 0.8);

        // Add connecting lines
        let yearlyGroups = Array.from(d3.group(extremePoints, d => d.date.getFullYear()));
        let connectors = vis.svg.selectAll(`.year-connector-${type}`)
            .data(yearlyGroups);

        connectors.exit().remove();

        connectors.enter()
            .append("path")
            .attr("class", `year-connector year-connector-${type}`)
            .merge(connectors)
            .attr("fill", "none")
            .attr("stroke", vis.colorScale(type))
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.5)
            .transition()
            .duration(1000)
            .attr("d", d => {
                let points = d[1].sort((a, b) => a.date - b.date);
                return d3.line()
                    .x(p => vis.x(p.date))
                    .y(p => vis.y(p[type]))
                    .curve(d3.curveMonotoneX)(points);
            });
    }
    addYearDividers() {
        let vis = this;

        // Get unique years from data
        let years = [...new Set(vis.data.map(d => d.date.getFullYear()))];

        // Remove existing dividers
        vis.svg.selectAll(".year-divider").remove();
        vis.svg.selectAll(".year-label").remove();

        // Add dividers and labels
        years.forEach(year => {
            let yearStart = new Date(year, 0, 1);

            // Skip first divider to avoid overlapping with y-axis
            if (year !== years[0]) {
                // Add vertical line
                vis.svg.append("line")
                    .attr("class", "year-divider")
                    .attr("x1", vis.x(yearStart))
                    .attr("x2", vis.x(yearStart))
                    .attr("y1", 0)
                    .attr("y2", vis.height)
                    .attr("stroke", "#4a7337")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "4,4")
                    .attr("opacity", 0.3);
            }

            // Add year label at bottom
            vis.svg.append("text")
                .attr("class", "year-label")
                .attr("x", vis.x(yearStart))
                .attr("y", vis.height + 40)
                .attr("text-anchor", "middle")
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .style("fill", "#4a7337")
                .text(year);
        });
    }
    updateLegend() {
        let vis = this;
        vis.svg.selectAll(".legend").remove();

        const legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width - 120}, 0)`);

        const legendItems = vis.viewType === 'combined'
            ? ['combined']
            : ['organic', 'conventional'];

        legendItems.forEach((type, i) => {
            const legendGroup = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);

            legendGroup.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", vis.colorScale(type));

            legendGroup.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-family", "Patrick Hand")
                .text(type.charAt(0).toUpperCase() + type.slice(1));
        });
    }
}

const styles = `
    .extreme-icon {
        cursor: pointer;
        transition: transform 0.2s;
    }
    .extreme-icon:hover {
        filter: brightness(1.2);
    }
    .year-connector {
        pointer-events: none;
        transition: all 1s;
    }
    .chart-title {
        font-weight: bold;
        fill: #4a7337;
    }
    .tooltip {
        background-color: rgba(255, 255, 255, 0.95);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        pointer-events: none;
    }
    .view-btn {
        transition: all 0.3s ease;
    }
    .view-btn:hover {
        transform: translateY(-2px);
    }
    .price-line {
        transition: all 0.5s;
    }
    .price-area {
        transition: all 0.5s;
    }
    .peak-dot {
    transition: all 0.2s;
    cursor: pointer;
    pointer-events: none;
    }
    .overlay {
    cursor: pointer;
    }

    .bottom-tooltip {
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transition: opacity 0.3s;
        white-space: nowrap;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);