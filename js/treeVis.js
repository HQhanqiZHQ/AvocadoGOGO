class TreeVis {

    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = data;
        this.trunkHeight = 200;
        this.trunkWidth = 40;
        this.leafSize = 30; // Base size for scaling the leaf
        this.initVis();
    }

    initVis(){
        let vis = this;

        const container = d3.select(vis.parentElement).node().getBoundingClientRect();
        vis.margin = { top: 0, right: 100, bottom: 100, left: 80 };
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

        // Define leaf shape as a path
        const defs = vis.svg.append("defs");

        // Create leaf path template
        defs.append("path")
            .attr("id", "leafTemplate")
            .attr("d", `
                M 0,-95
                C 8,-95 30,-85 40,-50
                C 45,-30 45,0 40,30
                C 35,60 15,85 0,90
                C -15,85 -35,60 -40,30
                C -45,0 -45,-30 -40,-50
                C -30,-85 -8,-95 0,-95
                M 0,-95
                L 0,90`)
            .attr("transform", "scale(0.25)");

        // Create gradients for each season
        const gradients = {
            spring: ['#90EE90', '#32CD32'],
            summer: ['#228B22', '#006400'],
            fall: ['#DAA520', '#B8860B'],
            winter: ['#87CEEB', '#4682B4']
        };

        Object.entries(gradients).forEach(([season, colors]) => {
            const gradient = defs.append("linearGradient")
                .attr("id", `${season}-gradient`)
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("style", `stop-color:${colors[0]};stop-opacity:1`);

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("style", `stop-color:${colors[1]};stop-opacity:1`);
        });

        vis.treeGroup = vis.svg.append("g")
            .attr("class", "tree-group");

        vis.barChartGroup = vis.svg.append("g")
            .attr("class", "bar-chart-group")
            .attr("transform", `translate(20,${vis.height * 0.9})`);

        // Create tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        vis.wrangleData();
    }

    wrangleData(){
        let vis = this;

        // Here you can process your data if needed
        // vis.displayData = vis.data;

        vis.clusters = {
            spring: { id: 1, name: "Spring", x: 100, y: 100, values: [] },
            summer: { id: 2, name: "Summer", x: 200, y: 80, values: [] },
            fall: { id: 3, name: "Fall", x: 300, y: 100, values: [] },
            winter: { id: 4, name: "Winter", x: 400, y: 90, values: [] }
        };

        Object.keys(vis.data).forEach(region => {
            vis.data[region].forEach(entry => {
                // Parse date string
                const date = new Date(entry.date);
                const month = date.getMonth(); // 0-11

                // Categorize by season and count entries
                if (month >= 2 && month <= 4) {
                    // Spring (March to May)
                    vis.clusters.spring.values.push({
                        name: region,
                        value: entry.value || 1
                    });
                } else if (month >= 5 && month <= 7) {
                    // Summer (June to August)
                    vis.clusters.summer.values.push({
                        name: region,
                        value: entry.value || 1
                    });
                } else if (month >= 8 && month <= 10) {
                    // Fall (September to November)
                    vis.clusters.fall.values.push({
                        name: region,
                        value: entry.value || 1
                    });
                } else {
                    // Winter (December to February)
                    vis.clusters.winter.values.push({
                        name: region,
                        value: entry.value || 1
                    });
                }
            });
        });

        // Convert clusters object to array for D3
        vis.displayData = {
            clusters: Object.values(vis.clusters).map(cluster => ({
                ...cluster,
                values: cluster.values.reduce((acc, curr) => {
                    const existing = acc.find(item => item.name === curr.name);
                    if (existing) {
                        existing.value += curr.value;
                    } else {
                        acc.push({ ...curr });
                    }
                    return acc;
                }, [])
            }))
        };
        vis.updateVis();
    }

    updateVis(){
        let vis = this;

        // Draw tree trunk
        vis.treeGroup.selectAll(".trunk")
            .data([1])
            .join("rect")
            .attr("class", "trunk")
            .attr("x", (vis.width - vis.trunkWidth) / 2)
            .attr("y", vis.height*3/4 - vis.trunkHeight)
            .attr("width", vis.trunkWidth)
            .attr("height", vis.trunkHeight)
            .attr("fill", "#8B4513");

        function generateLeafPositions(centerX, centerY, radius, count = 50) {
            const positions = [];
            // const radius = 80; // Maximum radius from center
            const minDistance = 4; // Minimum distance between leaf centers

            // Helper function to check if a new position would overlap too much
            function isTooClose(newPos, existingPositions) {
                return existingPositions.some(pos => {
                    const dx = newPos.x - pos.x;
                    const dy = newPos.y - pos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    return distance < minDistance;
                });
            }

            // First generate all positions
            let attempts = 0;
            const maxAttempts = 300;

            while (positions.length < count && attempts < maxAttempts * count) {
                // Generate random position within a circle
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * radius;

                const newPosition = {
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r,
                    scale: 0.8 + Math.random() * 0.4
                };

                if (positions.length === 0 || !isTooClose(newPosition, positions)) {
                    positions.push(newPosition);
                }

                attempts++;
            }

            // Then compute angles for each position relative to center
            const finalPositions = positions.map(pos => {
                // Calculate angle from position to center point (0,0)
                const angleToCenter = Math.atan2(-pos.y, -pos.x) * 180 / Math.PI;

                return {
                    dx: pos.x,
                    dy: pos.y,
                    rotate: angleToCenter + 90, // Add 90 because leaf is vertical
                    scale: pos.scale
                };
            });

            return {
                x: centerX,
                y: centerY,
                positions: finalPositions
            };
        }

        // Create leaf clusters
        const leafClusters = {
            spring: generateLeafPositions(vis.width * 0.25, vis.height * 0.35, 60),
            summer: generateLeafPositions(vis.width * 0.4, vis.height * 0.22, 80),
            fall: generateLeafPositions(vis.width * 0.6, vis.height * 0.22, 80),
            winter: generateLeafPositions(vis.width * 0.75, vis.height * 0.35, 70)
        };

        vis.treeGroup.selectAll(".branch")
            .data(vis.displayData.clusters)
            .join("path")
            .attr("class", "branch")
            .attr("d", d => {
                const cluster = leafClusters[d.name.toLowerCase()];
                const startX = vis.width / 2;
                const startY = vis.height*3/4 - vis.trunkHeight;
                return `M ${startX} ${startY} Q ${cluster.x}  ${startY - vis.trunkHeight * 0.5}  ${cluster.x} ${cluster.y + 30}`;
            })
            .attr("stroke", "#8B4513")
            .attr("fill", "none")
            .attr("stroke-width", 4);

        const leafGroups = vis.treeGroup.selectAll(".leaf-group")
            .data(vis.displayData.clusters)
            .join("g")
            .attr("class", "leaf-group")
            .attr("transform", d => {
                const cluster = leafClusters[d.name.toLowerCase()];
                return `translate(${cluster.x},${cluster.y})`;
            });

        // Add leaves to each cluster
        leafGroups.each(function(d) {
            const group = d3.select(this);
            const season = d.name.toLowerCase();
            const cluster = leafClusters[season];

            cluster.positions.forEach((pos, i) => {
                group.append("use")
                    .attr("href", "#leafTemplate")
                    .attr("class", "leaf")
                    .attr("transform", `translate(${pos.dx},${pos.dy}) rotate(${pos.rotate}) scale(${vis.leafSize/40})`)
                    .attr("fill", `url(#${season}-gradient)`)
                    .attr("stroke", "#2F4F4F")
                    .attr("stroke-width", 0.5)
                    .style("cursor", "pointer")
                    .on("mouseover", function(event) {
                        d3.select(this.parentNode).selectAll(".leaf")
                            .attr("stroke-width", 1);

                        vis.tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.9);
                        vis.tooltip.html(`${d.name}`)
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this.parentNode).selectAll(".leaf")
                            .attr("stroke-width", 0.5);

                        vis.tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    })
                    .on("click", function() {
                        vis.selectedCluster = (vis.selectedCluster === d.id) ? null : d.id;
                        leafGroups.each(function(d) {
                            d3.select(this).selectAll(".leaf")
                                .attr("stroke-width", d.id === vis.selectedCluster ? 1.5 : 0.5)
                                .attr("stroke", d.id === vis.selectedCluster ? "#000" : "#2F4F4F");
                        });
                        vis.updateBarChart();
                    });
            });

            // Add season label
            group.append("text")
                .attr("class", "season-label")
                .attr("x", 0)
                .attr("y", 50)
                .attr("text-anchor", "middle")
                .style("font-family", "RockSlayers")
                .style("font-size", "16px")
                .style("pointer-events", "none")
                .text(d.name);
        });
    }

    updateBarChart() {
        let vis = this;

        // Map cluster IDs to seasons
        const seasonMap = {
            1: 'spring',
            2: 'summer',
            3: 'fall',
            4: 'winter'
        };

        // Define seasons and their corresponding months
        const seasons = {
            spring: { months: [2, 3, 4], name: "Spring", order: 1 },
            summer: { months: [5, 6, 7], name: "Summer", order: 2 },
            fall: { months: [8, 9, 10], name: "Fall", order: 3 },
            winter: { months: [11, 0, 1], name: "Winter", order: 4 }
        };

        // Initialize selectedSeasons if not exists
        if (!vis.selectedSeasons) {
            vis.selectedSeasons = new Set();
        }

        // Add or remove selected season
        const currentSeason = seasonMap[vis.selectedCluster];
        if (currentSeason) {
            if (vis.selectedSeasons.has(currentSeason)) {
                vis.selectedSeasons.delete(currentSeason);
            } else {
                vis.selectedSeasons.add(currentSeason);
            }
        }

        if (vis.selectedSeasons.size === 0) {
            // Clear the chart if no seasons selected
            vis.barChartGroup.selectAll("*")
                .transition()
                .duration(200)
                .style("opacity", 0)
                .remove();
            return;
        }

        // Get selected seasons in chronological order
        const orderedSelectedSeasons = Array.from(vis.selectedSeasons)
            .sort((a, b) => seasons[a].order - seasons[b].order);

        const years = [2015, 2016, 2017];

        // Function to check if a date belongs to a season
        const isInSeason = (date, seasonMonths) => {
            const month = date.getMonth();
            return seasonMonths.includes(month);
        };

        // Prepare data for each year and selected season
        const yearlyData = years.map(year => {
            const seasonVolumes = {};

            orderedSelectedSeasons.forEach(season => {
                const seasonMonths = seasons[season].months;
                let totalVolume = 0;

                Object.values(vis.data).forEach(regionData => {
                    const yearSeasonData = regionData.filter(d => {
                        const date = new Date(d.date);
                        return date.getFullYear() === year && isInSeason(date, seasonMonths);
                    });

                    totalVolume += d3.sum(yearSeasonData, d => d.totalVolume);
                });

                seasonVolumes[season] = totalVolume;
            });

            return {
                year: year,
                seasons: seasonVolumes
            };
        });

        // Set up scales
        const xScale = d3.scaleBand()
            .domain(years.map(String))
            .range([0, vis.width])
            .padding(0.2);

        const seasonScale = d3.scaleBand()
            .domain(orderedSelectedSeasons)
            .range([0, xScale.bandwidth()])
            .padding(0.05);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(yearlyData, d =>
                d3.max(Object.values(d.seasons))
            )])
            .range([150, 0]);

        // Season colors
        const seasonColors = {
            spring: "#90EE90",
            summer: "#228B22",
            fall: "#DAA520",
            winter: "#87CEEB"
        };

        // Create/Update axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d => d3.format(".2s")(d));

        // Update X axis
        if (vis.barChartGroup.select('.x-axis').empty()) {
            vis.barChartGroup.append("g")
                .attr("class", "x-axis")
                .attr("transform", "translate(0,150)")
                .call(xAxis);
        } else {
            vis.barChartGroup.select('.x-axis')
                .transition()
                .duration(250)
                .call(xAxis);
        }

        // Update Y axis
        if (vis.barChartGroup.select('.y-axis').empty()) {
            vis.barChartGroup.append("g")
                .attr("class", "y-axis")
                .call(yAxis);
        } else {
            vis.barChartGroup.select('.y-axis')
                .transition()
                .duration(250)
                .call(yAxis);
        }

        // Update title
        const title = vis.barChartGroup.selectAll('.chart-title')
            .data([1]);

        title.enter()
            .append("text")
            .attr("class", "chart-title")
            .merge(title)
            .attr("x", vis.width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .text("Total US Volume by Season and Year");

        // Update y-axis label
        const yLabel = vis.barChartGroup.selectAll('.y-axis-label')
            .data([1]);

        yLabel.enter()
            .append("text")
            .attr("class", "y-axis-label")
            .merge(yLabel)
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -75)
            .attr("text-anchor", "middle")
            .text("Total Volume");

        const barData = [];
        yearlyData.forEach(yearData => {
            orderedSelectedSeasons.forEach(season => {
                barData.push({
                    year: yearData.year,
                    season: season,
                    value: yearData.seasons[season]
                });
            });
        });

        // Update bars with sequential transitions
        const bars = vis.barChartGroup.selectAll(".volume-bar")
            .data(barData, d => `${d.year}-${d.season}`);

        // First transition: Remove old bars
        const exitTransition = bars.exit()
            .transition()
            .duration(150)
            .style("opacity", 0)
            .remove();

        // Second transition: Shrink existing bars width
        const updateWidthTransition = bars.transition()
            .delay(150)  // Wait for exit transition
            .duration(150)
            .attr("x", d => xScale(d.year.toString()) + seasonScale(d.season))
            .attr("width", seasonScale.bandwidth());

        // Third transition: Update height of existing bars
        const updateHeightTransition = bars.transition()
            .delay(300)  // Wait for width transition
            .duration(150)
            .attr("y", d => yScale(d.value))
            .attr("height", d => 150 - yScale(d.value))
            .attr("fill", d => seasonColors[d.season]);

        // Fourth transition: Add new bars
        const enterBars = bars.enter()
            .append("rect")
            .attr("class", "volume-bar")
            .attr("x", d => xScale(d.year.toString()) + seasonScale(d.season))
            .attr("width", seasonScale.bandwidth())
            .attr("y", 150)  // Start from bottom
            .attr("height", 0)  // Start with height 0
            .attr("fill", d => seasonColors[d.season])
            .attr("opacity", 0)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("opacity", 0.8);

                // Get the position of the current bar
                const barX = parseFloat(d3.select(this).attr("x")) +
                    parseFloat(d3.select(this).attr("width"))/2;
                const barY = parseFloat(d3.select(this).attr("y"));

                // Get the position relative to the page
                const svgRect = vis.svg.node().getBoundingClientRect();
                const tooltipX = svgRect.left + barX + vis.margin.left;
                const tooltipY = svgRect.top + barY + vis.margin.top;

                vis.tooltip.transition()
                    .duration(100)
                    .style("opacity", .9);
                vis.tooltip.html(`
    <span class="label">Year:</span> <span class="value">${d.year}</span><br/>
    <span class="label">Season:</span> <span class="value">${seasons[d.season].name}</span><br/>
    <span class="label">Total US Volume:</span> <span class="value">${d3.format(",")(Math.round(d.value))}</span>
`)
                    .style("left", `${event.pageX}px`)  // Use event.pageX for horizontal position
                    .style("top", `${event.pageY - 10}px`); // 10px offset for spacing
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("opacity", 1);

                vis.tooltip.transition()
                    .duration(200)
                    .style("opacity", 0);
            });

        // Add new bars with delay
        enterBars.transition()
            .delay(450)  // Wait for previous transitions
            .duration(150)
            .attr("opacity", 1)
            .transition()
            .duration(150)
            .attr("y", d => yScale(d.value))
            .attr("height", d => 150 - yScale(d.value));

        // Update legend with sequential transitions
        const legendGroup = vis.barChartGroup.selectAll('.legend')
            .data([1])
            .join('g')
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 10}, 0)`);

        const legendItems = legendGroup.selectAll('.legend-item')
            .data(orderedSelectedSeasons, d => d);

        // Remove old legend items
        legendItems.exit()
            .transition()
            .duration(150)
            .style("opacity", 0)
            .remove();

        // Add new legend items with delay
        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("opacity", 0)
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendEnter.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => seasonColors[d]);

        legendEnter.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d => seasons[d].name);

        // Transition new legend items with delay
        legendEnter.transition()
            .delay(450)
            .duration(150)
            .attr("opacity", 1);

        // Update existing legend positions
        legendItems.transition()
            .delay(300)
            .duration(150)
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        // Update axes with transitions
        vis.barChartGroup.select('.x-axis')
            .transition()
            .delay(300)
            .duration(150)
            .call(xAxis);

        vis.barChartGroup.select('.y-axis')
            .transition()
            .delay(300)
            .duration(150)
            .call(yAxis);
    }

}