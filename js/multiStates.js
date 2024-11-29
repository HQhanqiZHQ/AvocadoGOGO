class MultiStates {
    constructor(parentElement, regionData, stateData) {
        this.parentElement = parentElement;
        this.data = regionData;
        this.stateData = stateData;
        this.startMonth = 0;
        this.endMonth = 3;
        this.selectedRegion = null;
        this.selectedMetric = 'volume'; // Default metric
        this.initVis();
    }

    initVis() {
        let vis = this;
        console.log(this.stateData)
        // Set up chart dimensions
        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 60, right: container.width * 0.4, bottom: 60, left: 80 }; // Set right margin to 40% of container width
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
        const titleContainer = d3.select(vis.parentElement)
            .append("div")
            .style("width", "100%")
            .style("position", "absolute")
            .style("top", "10px")
            .style("text-align", "center");

        // Add main visualization title
        titleContainer.append("h2")
            .style("font-family", "RockSlayers")
            .style("font-size", "24px")
            .style("margin", "0")
            .text("Avocado Price Analysis");

        // Initialize map projection
        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width / 2, vis.height / 2])
            .scale(vis.width);

        vis.path = d3.geoPath()
            .projection(vis.projection);

        // Create color scales
        vis.priceColorScale = d3.scaleSequential(d3.interpolateOranges)
            .domain([0, 3]);

        vis.volumeColorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, 1000000]);

        // Add transition overlay
        vis.transitionOverlay = vis.svg.append("rect")
            .attr("class", "transition-overlay")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "#fff")
            .attr("opacity", 0)
            .style("pointer-events", "none");

        // Add legend group
        vis.legendGroup = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${vis.height})`);

        // Add legend title
        vis.legendTitle = vis.legendGroup.append("text")
            .attr("class", "legend-title")
            .attr("x", 0)
            .attr("y", -10)
            .style("font-family", "RockSlayers")
            .style("font-size", "14px");

        // Create gradient for legend
        const defs = vis.svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        // Create legend rectangle with gradient
        vis.legendGroup.append("rect")
            .attr("width", 200)
            .attr("height", 20)
            .style("fill", "url(#legend-gradient)");

        // Add legend axis group
        vis.legendAxis = vis.legendGroup.append("g")
            .attr("class", "legend-axis")
            .attr("transform", "translate(0, 20)");


        // Add metric toggle buttons
        const buttonGroup = vis.svg.append("g")
            .attr("class", "button-group")
            .attr("transform", `translate(${vis.width/2}, ${vis.height})`);

        // Price button
        buttonGroup.append("rect")
            .attr("class", "metric-button price-button")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 80)
            .attr("height", 25)
            .attr("rx", 5)
            .style("fill", vis.selectedMetric === 'price' ? "#4CAF50" : "#f0f0f0")
            .style("cursor", "pointer");

        buttonGroup.append("text")
            .attr("x", 40)
            .attr("y", 16)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .style("font-size", "12px")
            .style("fill", vis.selectedMetric === 'price' ? "white" : "black")
            .style("pointer-events", "none")
            .text("Price");

        // Volume button
        buttonGroup.append("rect")
            .attr("class", "metric-button volume-button")
            .attr("x", 90)
            .attr("y", 0)
            .attr("width", 80)
            .attr("height", 25)
            .attr("rx", 5)
            .style("fill", vis.selectedMetric === 'volume' ? "#4CAF50" : "#f0f0f0")
            .style("cursor", "pointer");

        buttonGroup.append("text")
            .attr("x", 130)
            .attr("y", 16)
            .attr("text-anchor", "middle")
            .style("font-family", "Patrick Hand")
            .style("font-size", "12px")
            .style("fill", vis.selectedMetric === 'volume' ? "white" : "black")
            .style("pointer-events", "none")
            .text("Volume");

        // Add click events for metric buttons
        buttonGroup.selectAll(".metric-button")
            .on("click", function() {
                const isPrice = d3.select(this).classed("price-button");
                const oldMetric = vis.selectedMetric;
                vis.selectedMetric = isPrice ? 'price' : 'volume';

                // Update button styles
                buttonGroup.selectAll(".metric-button")
                    .style("fill", function() {
                        return d3.select(this).classed(vis.selectedMetric + "-button") ? "#4CAF50" : "#f0f0f0";
                    });

                buttonGroup.selectAll("text")
                    .style("fill", function() {
                        const buttonType = d3.select(this.previousSibling).classed("price-button") ? "price" : "volume";
                        return buttonType === vis.selectedMetric ? "white" : "black";
                    });

                // Perform transition
                vis.transitionMetric(oldMetric, vis.selectedMetric);
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

        // Add table container
        vis.tableContainer = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "table-container")
            .style("position", "absolute")
            .style("top", `${vis.margin.top}px`)
            .style("right", "20px")
            .style("width", `${container.width * 0.38}px`) // Set width to slightly less than 40% to account for padding
            .style("height", `${vis.height}px`)
            .style("overflow-y", "auto")
            .style("background", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("padding", "10px");

        // Add table title
        vis.tableContainer
            .text("Region Statistics");

        // Add reset button
        vis.tableContainer.append("button")
            .attr("class", "reset-button")
            .style("display", "none")
            .style("margin", "0 auto 10px auto")
            .style("padding", "5px 10px")
            .style("background", "#f0f0f0")
            .style("border", "1px solid #ddd")
            .style("border-radius", "3px")
            .style("cursor", "pointer")
            .text("Show All Regions")
            .on("click", () => {
                vis.selectedRegion = null;
                vis.updateTable();
                d3.select(".reset-button").style("display", "none");
                vis.svg.selectAll(".state")
                    .attr("stroke", null)
                    .attr("stroke-width", null);
            });

        // Initialize region states map and other properties
        vis.regionStatesMap = {
            'BaltimoreWashington': ['Maryland', 'Virginia', 'District of Columbia', 'West Virginia'],
            'GreatLakes': ['Wisconsin', 'Illinois', 'Michigan', 'Indiana', 'Ohio'],
            'HartfordSpringfield': ['Connecticut', 'Massachusetts', 'Rhode Island'],
            'Midsouth': ['Tennessee', 'Kentucky'],
            'NewOrleansMobile': ['Louisiana', 'Mississippi', 'Alabama'],
            'Northeast': ['New York', 'New Jersey', 'Pennsylvania', 'Delaware'],
            'NorthernNewEngland': ['Maine', 'New Hampshire', 'Vermont'],
            'Plains': ['Minnesota', 'Iowa', 'Missouri', 'Kansas', 'Nebraska', 'South Dakota', 'North Dakota'],
            'SouthCentral': ['Texas', 'Oklahoma', 'Arkansas'],
            'Southeast': ['North Carolina', 'South Carolina', 'Georgia', 'Florida'],
            'West': ['California', 'Nevada', 'Oregon', 'Washington', 'Idaho', 'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona'],
            'WestTexNewMexico': ['New Mexico', 'Texas'],
            'California': ['California']
        };

        vis.stateRegionMap = {};
        Object.entries(vis.regionStatesMap).forEach(([region, states]) => {
            states.forEach(state => {
                vis.stateRegionMap[state] = region;
            });
        });

        vis.initSlider();

        // Load US map data
        Promise.all([
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
        ]).then(([us]) => {
            vis.usStates = topojson.feature(us, us.objects.states).features
                .filter(d => {
                    const state = vis.getStateName(d);
                    return state !== 'Alaska' && state !== 'Hawaii';
                });
            vis.stateBorders = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
            vis.wrangleData();
        });
    }

    transitionMetric(oldMetric, newMetric) {
        let vis = this;

        if (oldMetric === newMetric) return;

        const minPrice = d3.min(Object.values(vis.regionSummaries), d => d.avgPrice);
        const minVolume = d3.min(Object.values(vis.regionSummaries), d => d.totalVolume);
        const maxPrice = d3.max(Object.values(vis.regionSummaries), d => d.avgPrice);
        const maxVolume = d3.max(Object.values(vis.regionSummaries), d => d.totalVolume);
        vis.priceColorScale.domain([minPrice, maxPrice]);
        vis.volumeColorScale.domain([minVolume, maxVolume]);

        // Update legend during transition
        vis.updateLegend(newMetric);

        // Transition overlay effect
        vis.transitionOverlay
            .raise() // Bring overlay to front
            .transition()
            .duration(400)
            .attr("opacity", 1)
            .on("end", () => {
                // Update state colors
                vis.svg.selectAll(".state")
                    .attr("fill", d => {
                        const stateName = d.properties.name;
                        const region = vis.stateRegionMap[stateName];
                        const regionData = vis.regionSummaries[region];

                        if (vis.selectedRegion && region === vis.selectedRegion) {
                            return "#ff0000";
                        }

                        if (!region || !regionData) return "#ccc";

                        return newMetric === 'price'
                            ? vis.priceColorScale(regionData.avgPrice)
                            : vis.volumeColorScale(regionData.totalVolume);
                    });

                // Second transition: Uncover
                vis.transitionOverlay
                    .transition()
                    .duration(400)
                    .attr("opacity", 0);
            });

    }

    updateLegend(metric) {
        let vis = this;
        const scale = metric === 'price' ? vis.priceColorScale : vis.volumeColorScale;
        const title = metric === 'price' ? 'Average Price ($)' : 'Total Volume';
        const domain = scale.domain();

        // Update gradient stops with transition
        const gradientStops = d3.range(0, 1.1, 0.1);

        d3.select("#legend-gradient").selectAll("stop")
            .data(gradientStops)
            .transition()
            .duration(800)
            .attr("stop-color", d => scale(domain[0] + (domain[1] - domain[0]) * d));

        // Update legend title with transition
        vis.legendTitle
            .transition()
            .duration(800)
            .text(title);

        // Update legend axis with transition
        const legendScale = d3.scaleLinear()
            .domain(domain)
            .range([0, 200]);

        const legendAxis = d3.axisBottom(legendScale)
            .tickValues([domain[0] || 0, domain[1]])
            .tickFormat(d => {
                if (metric === 'price') {
                    return `$${d.toFixed(2)}`;
                } else {
                    return d3.format(".2~s")(d);
                }
            });

        vis.legendAxis
            .transition()
            .duration(800)
            .call(legendAxis);
    }

    updateTable() {
        let vis = this;

        // Clear existing table
        vis.tableContainer.selectAll("table").remove();

        // Create table
        const table = vis.tableContainer.append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse");

        // Add table headers
        const headers = ["Region", "Avg Price", "Volume", "Small Bags", "Large Bags", "XL Bags"];
        table.append("thead")
            .append("tr")
            .selectAll("th")
            .data(headers)
            .enter()
            .append("th")
            .style("padding", "5px")
            .style("border-bottom", "2px solid #ddd")
            .style("text-align", "left")
            .style("font-size", "12px")
            .text(d => d);

        // Filter and sort data
        let tableData;
        if (vis.selectedRegion) {
            tableData = [vis.regionSummaries[vis.selectedRegion]];
            d3.select(".reset-button").style("display", "block");
        } else {
            tableData = Object.entries(vis.regionSummaries)
                .map(([region, data]) => ({
                    region,
                    ...data
                }))
                .sort((a, b) => b.totalVolume - a.totalVolume);
            d3.select(".reset-button").style("display", "none");
        }

        // Add table rows
        const rows = table.append("tbody")
            .selectAll("tr")
            .data(tableData)
            .enter()
            .append("tr")
            .style("border-bottom", "1px solid #ddd")
            .style("cursor", "pointer")
            .on("mouseover", function () {
                d3.select(this).style("background", "#f0f0f0");
            })
            .on("mouseout", function () {
                d3.select(this).style("background", null);
            })
            .on("click", function (event, d) {
                vis.selectedRegion = d.region;
                vis.updateTable();
                vis.highlightRegion(d.region);
            });

        // Add cells
        rows.selectAll("td")
            .data(d => [
                d.region,
                `$${d.avgPrice.toFixed(2)}`,
                d3.format(",")(Math.round(d.totalVolume)),
                d3.format(",")(Math.round(d.smallBags)),
                d3.format(",")(Math.round(d.largeBags)),
                d3.format(",")(Math.round(d.xLargeBags))
            ])
            .enter()
            .append("td")
            .style("padding", "5px")
            .style("font-size", "12px")
            .text(d => d);
    }

    highlightRegion(region) {
        let vis = this;

        // Remove existing highlights
        vis.svg.selectAll(".state")
            .attr("stroke", null)
            .attr("stroke-width", null)
            .attr("fill", d => {
                const stateName = d.properties.name;
                const stateRegion = vis.stateRegionMap[stateName];
                const regionData = vis.regionSummaries[stateRegion];

                if (!stateRegion || !regionData) return "#ccc";

                return vis.selectedMetric === 'price'
                    ? vis.priceColorScale(regionData.avgPrice)
                    : vis.volumeColorScale(regionData.totalVolume);
            })
            .style("fill-opacity", 1);

        // Add highlight to selected region
        vis.svg.selectAll(".state")
            .filter(d => vis.stateRegionMap[d.properties.name] === region)
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .attr("fill", "#ff0000")  // Red fill color
            .style("fill-opacity", 0.1);  // Semi-transparent
    }

    updateVis() {
        let vis = this;

        // Track current highlighted region
        let currentRegion = null;
        let tooltipFixed = false;

        const minPrice = d3.min(Object.values(vis.regionSummaries), d => d.avgPrice);
        const minVolume = d3.min(Object.values(vis.regionSummaries), d => d.totalVolume);

        const maxPrice = d3.max(Object.values(vis.regionSummaries), d => d.avgPrice);
        const maxVolume = d3.max(Object.values(vis.regionSummaries), d => d.totalVolume);

        vis.priceColorScale.domain([minPrice, maxPrice]);
        vis.volumeColorScale.domain([minVolume, maxVolume]);

        // Update states with current metric
        const scale = vis.selectedMetric === 'price' ? vis.priceColorScale : vis.volumeColorScale;

        const title = vis.selectedMetric === 'price' ? 'Average Price ($)' : 'Total Volume';

        // Update legend gradient
        const gradientStops = d3.range(0, 1.1, 0.1);
        const domain = scale.domain();

        d3.select("#legend-gradient").selectAll("stop")
            .data(gradientStops)
            .join("stop")
            .attr("offset", d => d * 100 + "%")
            .attr("stop-color", d => scale(domain[0] + (domain[1] - domain[0]) * d));

        // Update legend title
        vis.legendTitle.text(title);

        // Update legend axis
        const legendScale = d3.scaleLinear()
            .domain(domain)
            .range([0, 200]);

        const legendAxis = d3.axisBottom(legendScale)
            .tickValues([domain[0], domain[1]]) // Show only min (or 1 if 0) and max values
            .tickFormat(d => {
                if (vis.selectedMetric === 'price') {
                    return `$${d.toFixed(2)}`;
                } else {
                    // For volume, use compact notation (e.g., 1M, 2.5M)
                    return d3.format(".2~s")(d);
                }
            });

        vis.legendAxis.call(legendAxis);



        const states = vis.svg.selectAll(".state")
            .data(vis.usStates);

        // Update colors based on filtered data
        states.join("path")
            .attr("class", "state")
            .attr("d", vis.path)
            .attr("fill", d => {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                const regionData = vis.regionSummaries[region];

                if (vis.selectedRegion && region === vis.selectedRegion) {
                    return "#ff0000";

                }

                if (!region || !regionData) return "#ccc";

                return vis.selectedMetric === 'price'
                    ? vis.priceColorScale(regionData.avgPrice)
                    : vis.volumeColorScale(regionData.totalVolume);
            })
            .style("fill-opacity", d => {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                return (vis.selectedRegion && region === vis.selectedRegion) ? 0.6 : 1;
            })
            .on("click", function (event, d) {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                const regionData = vis.regionSummaries[region];
                console.log(regionData)
                if (region && vis.regionSummaries[region]) {
                    if (vis.selectedRegion === region) {
                        // If clicking the same region again, deselect it
                        vis.selectedRegion = null;
                        vis.updateTable();
                        // Reset all states to their original colors
                        vis.svg.selectAll(".state")
                            .attr("stroke", null)
                            .attr("stroke-width", null)
                            .attr("fill", d => {
                                const stateName = d.properties.name;
                                const region = vis.stateRegionMap[stateName];
                                const regionData = vis.regionSummaries[region];
                                if (!region || !regionData) return "#ccc";
                                return vis.selectedMetric === 'price'
                                    ? vis.priceColorScale(regionData.avgPrice)
                                    : vis.volumeColorScale(regionData.totalVolume);
                            })
                            .style("fill-opacity", 1);
                    } else {
                        // Select the new region
                        vis.selectedRegion = region;
                        vis.updateTable();
                        vis.highlightRegion(region);
                    }
                }
            })
            .on("mouseover", function (event, d) {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                if (region && vis.regionSummaries[region]) {
                    if (currentRegion !== region && region !== vis.selectedRegion) {
                        tooltipFixed = false;
                        // Only highlight if it's not the selected region
                        if (!vis.selectedRegion) {
                            vis.highlightRegion(region);
                        }
                        vis.showTooltip(region, event);
                    }
                }
            })
            .on("mousemove", function (event, d) {
                if (!tooltipFixed) {
                    vis.tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function (event, d) {
                const toElement = event.relatedTarget;
                if (!toElement || !toElement.classList.contains('state')) {
                    if (!vis.selectedRegion) {
                        vis.svg.selectAll(".state")
                            .attr("stroke", null)
                            .attr("stroke-width", null)
                            .attr("fill", d => {
                                const stateName = d.properties.name;
                                const region = vis.stateRegionMap[stateName];
                                const regionData = vis.regionSummaries[region];
                                if (!region || !regionData) return "#ccc";
                                return vis.selectedMetric === 'price'
                                    ? vis.priceColorScale(regionData.avgPrice)
                                    : vis.volumeColorScale(regionData.totalVolume);
                            })
                            .style("fill-opacity", 1);
                    } else {
                        vis.highlightRegion(vis.selectedRegion);
                    }
                    vis.tooltip.style("opacity", 0);
                    currentRegion = null;
                    tooltipFixed = false;
                }
            });

        vis.updateLegend(vis.selectedMetric);

        // Update state borders
        vis.svg.selectAll(".state-borders")
            .data([vis.stateBorders])
            .join("path")
            .attr("class", "state-borders")
            .attr("d", vis.path)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);

        // If there's a selected region, make sure it's highlighted
        if (vis.selectedRegion) {
            vis.highlightRegion(vis.selectedRegion);
        }

        // Update table
        vis.updateTable();
    }
    
    showTooltip(region, event) {
        let vis = this;
        const regionData = vis.regionSummaries[region];
        const dateStart = new Date(2015 + Math.floor(vis.startMonth / 12), vis.startMonth % 12);
        const dateEnd = new Date(2015 + Math.floor(vis.endMonth / 12), vis.endMonth % 12);

        vis.tooltip
            .style("opacity", 1)
            .html(`
                <div style="font-family: 'Patrick Hand'">
                    <strong>${region} Region</strong><br/>
                    <strong>Period: ${dateStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                              ${dateEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</strong><br/>
                    Average Price: $${regionData.avgPrice.toFixed(2)}<br/>
                    Total Volume: ${d3.format(",")(Math.round(regionData.totalVolume))}<br/>
                    Small Bags: ${d3.format(",")(Math.round(regionData.smallBags))}<br/>
                    Large Bags: ${d3.format(",")(Math.round(regionData.largeBags))}<br/>
                    XLarge Bags: ${d3.format(",")(Math.round(regionData.xLargeBags))}
                </div>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    initSlider() {
        let vis = this;

        const slider = document.getElementById('range-slider-region');
        const rangeValue = document.getElementById('range-value');
        let isDragging = false;
        let dragStartX = 0;
        let startValues = [];

        const MIN_RANGE = 2;

        function sliderToDataMonth(sliderValue) {
            const monthOffset = 0;
            const yearOffset = 2015;

            const sliderMonth = Math.round(sliderValue) - 1;
            const totalMonths = sliderMonth + monthOffset;

            const year = Math.floor(totalMonths / 12) + yearOffset;
            const month = totalMonths % 12;

            return { month, year };
        }

        function formatRangeDisplay(values) {
            const start = sliderToDataMonth(values[0]);
            const end = sliderToDataMonth(values[1]);

            const startDate = new Date(start.year, start.month);
            const endDate = new Date(end.year, end.month);

            return `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                    ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        }

        if (slider) {
            noUiSlider.create(slider, {
                start: [1, 1 + MIN_RANGE],
                connect: true,
                step: 1,
                range: {
                    'min': 1,
                    'max': 36
                },
                margin: MIN_RANGE,
                tooltips: false,
                format: {
                    to: value => Math.round(value),
                    from: value => Math.round(value)
                }
            });

            slider.noUiSlider.on('update', function (values) {
                rangeValue.textContent = formatRangeDisplay(values);
            });

            const connect = slider.querySelector('.noUi-connect');

            connect.addEventListener('mousedown', function (e) {
                isDragging = true;
                dragStartX = e.clientX;
                startValues = slider.noUiSlider.get().map(Number);
                connect.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', function (e) {
                if (!isDragging) return;

                const diff = e.clientX - dragStartX;
                const sliderRect = slider.getBoundingClientRect();
                const sliderWidth = sliderRect.width;
                const valueRange = 35;
                const pixelsPerValue = sliderWidth / valueRange;
                const valueDiff = Math.round(diff / pixelsPerValue);

                let newStart = startValues[0] + valueDiff;
                let newEnd = startValues[1] + valueDiff;

                if (newStart < 1) {
                    newStart = 1;
                    newEnd = newStart + (startValues[1] - startValues[0]);
                }
                if (newEnd > 36) {
                    newEnd = 36;
                    newStart = newEnd - (startValues[1] - startValues[0]);
                }

                if (newEnd - newStart < MIN_RANGE) {
                    if (valueDiff > 0) {
                        newStart = newEnd - MIN_RANGE;
                    } else {
                        newEnd = newStart + MIN_RANGE;
                    }
                }

                slider.noUiSlider.set([newStart, newEnd]);
            });

            document.addEventListener('mouseup', function () {
                if (isDragging) {
                    isDragging = false;
                    connect.style.cursor = 'grab';

                    const values = slider.noUiSlider.get().map(Number);
                    const startDate = sliderToDataMonth(values[0]);
                    const endDate = sliderToDataMonth(values[1]);

                    const startIndex = (startDate.year - 2015) * 12 + startDate.month;
                    const endIndex = (endDate.year - 2015) * 12 + endDate.month;

                    vis.updateTimeRange(startIndex, endIndex);
                }
            });

            slider.noUiSlider.on('change', function (values) {
                if (!isDragging) {
                    const vals = values.map(Number);
                    const startDate = sliderToDataMonth(vals[0]);
                    const endDate = sliderToDataMonth(vals[1]);

                    const startIndex = (startDate.year - 2015) * 12 + startDate.month;
                    const endIndex = (endDate.year - 2015) * 12 + endDate.month;

                    vis.updateTimeRange(startIndex, endIndex);
                }
            });
        }
    }

    wrangleData() {
        let vis = this;

        vis.filteredData = {};

        Object.entries(vis.data).forEach(([region, regionData]) => {
            const timeFilteredData = regionData.filter(d => {
                const date = new Date(d.date);
                const monthIndex = (date.getFullYear() - 2015) * 12 + date.getMonth();
                return monthIndex >= vis.startMonth && monthIndex <= vis.endMonth;
            });

            if (timeFilteredData.length > 0) {
                const avgPrice = d3.mean(timeFilteredData, d => d.averagePrice);
                const totalVolume = d3.sum(timeFilteredData, d => d.totalVolume);

                vis.regionStatesMap[region].forEach(state => {
                    vis.filteredData[state] = {
                        avgPrice: avgPrice,
                        totalVolume: totalVolume,
                        region: region,
                        timeRange: {
                            start: new Date(timeFilteredData[0].date),
                            end: new Date(timeFilteredData[timeFilteredData.length - 1].date)
                        }
                    };
                });
            }
        });

        vis.regionSummaries = {};
        Object.entries(vis.data).forEach(([region, regionData]) => {
            const timeFilteredData = regionData.filter(d => {
                const date = new Date(d.date);
                const monthIndex = (date.getFullYear() - 2015) * 12 + date.getMonth();
                return monthIndex >= vis.startMonth && monthIndex <= vis.endMonth;
            });

            vis.regionSummaries[region] = {
                avgPrice: d3.mean(timeFilteredData, d => d.averagePrice),
                totalVolume: d3.sum(timeFilteredData, d => d.totalVolume),
                smallBags: d3.sum(timeFilteredData, d => d.smallBags),
                largeBags: d3.sum(timeFilteredData, d => d.largeBags),
                xLargeBags: d3.sum(timeFilteredData, d => d.xLargeBags)
            };
        });

        vis.updateVis();
    }

    getStateName(feature) {
        return feature.properties.name;
    }

    updateTimeRange(start, end) {
        let vis = this;
        vis.startMonth = Math.round(start);
        vis.endMonth = Math.round(end);
        this.wrangleData();
    }

    update() {
        this.updateVis();
    }
}