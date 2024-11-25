class CorrelationVis {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedYear = null;
        this.selectedType = 'all';
        this.colors = {
            'organic': '#4a7337',
            'conventional': '#6b8c21',
            'all': '#ddd48f'
        };
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Clear existing content
        d3.select(vis.parentElement).html("");

        // Add title and controls above the zoomable area
        d3.select(vis.parentElement)
            .append("div")
            .attr("class", "vis-header")
            .style("padding", "10px")
            .style("text-align", "center")
            .append("h3")
            .style("font-family", "RockSlayers")
            .style("color", "#4a7337")
            .style("margin", "0")
            .text("Price VS Sales Volumes");

        // Add controls container
        vis.controlsDiv = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "controls-container")
            .style("padding", "5px")
            .style("margin", "0 10px");

        // Set up dimensions
        vis.margin = { top: 20, right: 200, bottom: 100, left: 80 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 400 - vis.margin.top - vis.margin.bottom;

        // Create main SVG
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "500px")
            .style("display", "block")
            .style("margin", "0 auto");

        // Create zoom container that will hold everything
        vis.zoomContainer = vis.svg.append("g")
            .attr("class", "zoom-container");

        // Main chart group
        vis.chartGroup = vis.zoomContainer.append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Initialize scales
        vis.x = d3.scaleBand()
            .range([0, vis.width])
            .padding(0.2);

        vis.y1 = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.y2 = d3.scaleLinear()
            .range([vis.height, 0]);

        // Create axes
        vis.xAxis = d3.axisBottom(vis.x);
        vis.y1Axis = d3.axisLeft(vis.y1)
            .tickFormat(d => `$${d.toFixed(2)}`);
        vis.y2Axis = d3.axisRight(vis.y2)
            .tickFormat(d => d3.format(".2s")(d));

        // Add axes groups
        vis.xAxisG = vis.chartGroup.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.y1AxisG = vis.chartGroup.append("g")
            .attr("class", "y-axis");

        vis.y2AxisG = vis.chartGroup.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", `translate(${vis.width},0)`);

        // Add axis labels
        vis.chartGroup.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -vis.margin.left + 20)
            .attr("x", -vis.height / 2)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .text("Price ($)");

        vis.chartGroup.append("text")
            .attr("class", "y-axis-label-right")
            .attr("transform", "rotate(90)")
            .attr("y", -vis.width - vis.margin.right + 140)
            .attr("x", vis.height / 2)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .text("Volume");

        // Add legend
        vis.legend = vis.chartGroup.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 40}, 0)`);

        // Initialize zoom behavior
        vis.zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", function (event) {
                vis.handleZoom(event);
            });

        // Add zoom functionality to SVG
        vis.svg.call(vis.zoom);

        // Add zoom controls
        this.addZoomControls();

        // Initialize controls
        this.initControls();

        // Create tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("font-family", "Patrick Hand")
            .style("z-index", "10");

        // Initial data processing
        this.wrangleData();
    }

    initControls() {
        let vis = this;

        // Create a flex container for controls
        const controlsContainer = vis.controlsDiv
            .style("display", "flex")
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("gap", "30px")
            .style("margin-bottom", "20px");

        // Add year period selector
        const years = [...new Set(vis.data.map(d => d.year))].sort();
        const yearControl = controlsContainer.append("div")
            .attr("class", "control-group")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "10px");

        yearControl.append("label")
            .style("font-family", "Patrick Hand")
            .text("Select Period:");

        // Start year
        yearControl.append("select")
            .attr("class", "start-year-select")
            .style("padding", "4px")
            .style("font-family", "Patrick Hand")
            .on("change", function () {
                vis.startYear = +this.value;
                // Ensure end year is not before start year
                const endYearSelect = d3.select(".end-year-select");
                const endYearOptions = endYearSelect.selectAll("option");
                endYearOptions.attr("disabled", d => d < vis.startYear ? true : null);
                if (vis.endYear < vis.startYear) {
                    vis.endYear = vis.startYear;
                    endYearSelect.property("value", vis.startYear);
                }
                vis.wrangleData();
            })
            .selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        yearControl.append("span")
            .text("to")
            .style("font-family", "Patrick Hand");

        // End year
        yearControl.append("select")
            .attr("class", "end-year-select")
            .style("padding", "4px")
            .style("font-family", "Patrick Hand")
            .on("change", function () {
                vis.endYear = +this.value;
                vis.wrangleData();
            })
            .selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        // Set initial values
        vis.startYear = years[0];
        vis.endYear = years[years.length - 1];
        d3.select(".start-year-select").property("value", vis.startYear);
        d3.select(".end-year-select").property("value", vis.endYear);

        // Add type selector with radio buttons
        const typeControl = controlsContainer.append("div")
            .attr("class", "control-group")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "15px");

        typeControl.append("label")
            .style("font-family", "Patrick Hand")
            .text("Select Type:");

        ['All', 'Organic', 'Conventional'].forEach(type => {
            const label = typeControl.append("label")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "4px")
                .style("font-family", "Patrick Hand");

            label.append("input")
                .attr("type", "radio")
                .attr("name", "type")
                .attr("value", type.toLowerCase())
                .property("checked", type.toLowerCase() === vis.selectedType)
                .on("change", function () {
                    vis.selectedType = this.value;
                    vis.wrangleData();
                });

            label.append("span")
                .text(type);
        });
    }
    addZoomControls() {
        let vis = this;

        const zoomControls = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "zoom-controls")
            .style("position", "absolute")
            .style("top", "10px")
            .style("right", "10px")
            .style("display", "flex")
            .style("gap", "5px");

        zoomControls.append("button")
            .text("+")
            .style("width", "30px")
            .style("height", "30px")
            .style("cursor", "pointer")
            .on("click", () => vis.handleZoomButton(1.2));

        zoomControls.append("button")
            .text("-")
            .style("width", "30px")
            .style("height", "30px")
            .style("cursor", "pointer")
            .on("click", () => vis.handleZoomButton(0.8));

        zoomControls.append("button")
            .text("Reset")
            .style("cursor", "pointer")
            .on("click", () => vis.resetZoom());
    }

    handleZoom(event) {
        let vis = this;
        vis.zoomContainer.attr("transform", event.transform);
    }

    handleZoomButton(scale) {
        let vis = this;
        vis.svg.transition()
            .duration(300)
            .call(vis.zoom.scaleBy, scale);
    }

    resetZoom() {
        let vis = this;
        vis.svg.transition()
            .duration(300)
            .call(vis.zoom.transform, d3.zoomIdentity);
    }

    wrangleData() {
        let vis = this;

        // Filter data based on selected period
        let filteredData = vis.data.filter(d => {
            const year = d.year;
            return year >= vis.startYear && year <= vis.endYear;
        });

        // Filter by selected type
        if (vis.selectedType !== 'all') {
            filteredData = filteredData.filter(d => d.type === vis.selectedType);
        }

        // First group by month to get monthly averages across years
        let monthlyData = d3.group(filteredData, d => d.date.getMonth());

        // Process data by month with yearly averages
        vis.displayData = Array.from(monthlyData, ([month, values]) => {
            // Calculate average price and volume for each month across years
            const avgPrice = d3.mean(values, d => d.averagePrice);
            const avgVolume = d3.mean(values, d => d.totalVolume);

            return {
                month: month,
                avgPrice: avgPrice,
                totalVolume: avgVolume,
                // Add additional statistics
                priceRange: {
                    min: d3.min(values, d => d.averagePrice),
                    max: d3.max(values, d => d.averagePrice)
                },
                volumeRange: {
                    min: d3.min(values, d => d.totalVolume),
                    max: d3.max(values, d => d.totalVolume)
                },
                yearCount: new Set(values.map(d => d.year)).size
            };
        }).sort((a, b) => a.month - b.month);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Update scales
        vis.x.domain(months);
        vis.y1.domain([0, d3.max(vis.displayData, d => d.avgPrice) * 1.1]);
        vis.y2.domain([0, d3.max(vis.displayData, d => d.totalVolume) * 1.1]);

        // Update axes
        vis.xAxisG
            .transition().duration(1000)
            .call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        vis.y1AxisG
            .transition().duration(1000)
            .call(vis.y1Axis);

        vis.y2AxisG
            .transition().duration(1000)
            .call(vis.y2Axis);

        // Update bars with tooltips
        const bars = vis.chartGroup.selectAll(".volume-bar")
            .data(vis.displayData);
        vis.chartGroup.selectAll(".volume-bar")
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .style("opacity", 0.3)
                    .attr("stroke", "none");

                vis.tooltip.style("opacity", 0);
            });
        bars.exit().remove();

        const barsEnter = bars.enter()
            .append("rect")
            .attr("class", "volume-bar");

        const barsMerged = barsEnter.merge(bars)
            .transition().duration(1000)
            .attr("x", d => vis.x(months[d.month]))
            .attr("y", d => vis.y2(d.totalVolume))
            .attr("width", vis.x.bandwidth())
            .attr("height", d => vis.height - vis.y2(d.totalVolume))
            .attr("fill", vis.colors[vis.selectedType])
            .style("opacity", 0.3);
        // Create line generator
        const line = d3.line()
            .x(d => vis.x(months[d.month]) + vis.x.bandwidth() / 2)
            .y(d => vis.y1(d.avgPrice))
            .curve(d3.curveMonotoneX);

        // Update line
        const path = vis.chartGroup.selectAll(".trend-line")
            .data([vis.displayData]);

        path.exit().remove();

        const pathEnter = path.enter()
            .append("path")
            .attr("class", "trend-line");

        pathEnter.merge(path)
            .transition().duration(1000)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", vis.colors[vis.selectedType])
            .attr("stroke-width", 3);

        // Update points
        const points = vis.chartGroup.selectAll(".data-point")
            .data(vis.displayData);
        vis.chartGroup.selectAll(".data-point")
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .attr("r", 5)
                    .attr("stroke", "none");

                vis.tooltip.style("opacity", 0);
            });

        points.exit().remove();

        const pointsEnter = points.enter()
            .append("circle")
            .attr("class", "data-point");

        pointsEnter.merge(points)
            .transition().duration(1000)
            .attr("cx", d => vis.x(months[d.month]) + vis.x.bandwidth() / 2)
            .attr("cy", d => vis.y1(d.avgPrice))
            .attr("r", 5)
            .attr("fill", vis.colors[vis.selectedType]);
        // Update tooltips to include period information
        vis.chartGroup.selectAll(".volume-bar")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .style("opacity", 0.5)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <div style="font-family: Patrick Hand">
                            <strong>Month:</strong> ${months[d.month]}<br/>
                            <strong>Average Volume:</strong> ${d3.format(",")(Math.round(d.totalVolume))}<br/>
                            <strong>Volume Range:</strong> ${d3.format(",")(Math.round(d.volumeRange.min))} - ${d3.format(",")(Math.round(d.volumeRange.max))}<br/>
                            <strong>Period:</strong> ${vis.startYear} - ${vis.endYear}<br/>
                            <strong>Type:</strong> ${vis.selectedType.charAt(0).toUpperCase() + vis.selectedType.slice(1)}
                        </div>
                    `);
            });
        vis.chartGroup.selectAll(".data-point")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("r", 8)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <div style="font-family: Patrick Hand">
                            <strong>Month:</strong> ${months[d.month]}<br/>
                            <strong>Average Price:</strong> $${d.avgPrice.toFixed(2)}<br/>
                            <strong>Price Range:</strong> $${d.priceRange.min.toFixed(2)} - $${d.priceRange.max.toFixed(2)}<br/>
                            <strong>Period:</strong> ${vis.startYear} - ${vis.endYear}<br/>
                            <strong>Type:</strong> ${vis.selectedType.charAt(0).toUpperCase() + vis.selectedType.slice(1)}
                        </div>
                    `);
            });

        // Update legend title to include period
        vis.legend.select("text")
            .text(`${vis.selectedType.charAt(0).toUpperCase() + vis.selectedType.slice(1)} Metrics (${vis.startYear}-${vis.endYear})`);
    }

    updateLegend() {
        let vis = this;

        // Remove old legend items
        vis.legend.selectAll("*").remove();

        // Add title
        vis.legend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .style("font-family", "Patrick Hand")
            .style("font-weight", "bold")
            .text(`${vis.selectedType.charAt(0).toUpperCase() + vis.selectedType.slice(1)} Metrics`);

        // Add price line item
        const priceLegend = vis.legend.append("g")
            .attr("transform", "translate(0, 30)");

        priceLegend.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("stroke", vis.colors[vis.selectedType])
            .attr("stroke-width", 3);

        priceLegend.append("text")
            .attr("x", 30)
            .attr("y", 5)
            .style("font-family", "Patrick Hand")
            .text("Price");

        // Add volume bar item
        const volumeLegend = vis.legend.append("g")
            .attr("transform", "translate(0, 60)");

        volumeLegend.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", vis.colors[vis.selectedType])
            .style("opacity", 0.3);

        volumeLegend.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .style("font-family", "Patrick Hand")
            .text("Volume");
    }
}