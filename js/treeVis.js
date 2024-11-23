class TreeVis {

    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = data;
        this.trunkHeight = 100;
        this.trunkWidth = 20;
        this.leafRadius = 30;
        this.initVis();
    }

    initVis(){
        console.log(this.data);
        let vis = this;

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

        vis.svg.append("text")
            .attr("class", "vis-title")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-family", "RockSlayers")
            .style("font-size", "24px")
            .text("Avocado Tree");

        vis.treeGroup = vis.svg.append("g")
            .attr("class", "tree-group");

        vis.barChartGroup = vis.svg.append("g")
            .attr("class", "bar-chart-group")
            .attr("transform", `translate(0,${vis.height + 50})`);
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
            .attr("y", vis.height - vis.trunkHeight)
            .attr("width", vis.trunkWidth)
            .attr("height", vis.trunkHeight)
            .attr("fill", "#8B4513");

        vis.treeGroup.selectAll(".branch")
            .data(vis.displayData.clusters)
            .join("path")
            .attr("class", "branch")
            .attr("d", d => {
                const startX = vis.width / 2;
                const startY = vis.height - vis.trunkHeight;
                return `M ${startX} ${startY} Q ${d.x} ${startY - vis.trunkHeight * 0.5} ${d.x} ${d.y + vis.leafRadius}`;
            })
            .attr("stroke", "#8B4513")
            .attr("fill", "none")
            .attr("stroke-width", 4);

        const leafGroups = vis.treeGroup.selectAll(".leaf-group")
            .data(vis.displayData.clusters)
            .join("g")
            .attr("class", "leaf-group");

        leafGroups.selectAll("circle")
            .data(d => [d])
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", vis.leafRadius)
            .attr("fill", "#228B22")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("fill", "#90EE90");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("fill", "#228B22");
            })
            .on("click", function(event, d) {
                vis.selectedCluster = (vis.selectedCluster === d.id) ? null : d.id;
                vis.updateBarChart();

                // Update selection visuals
                vis.treeGroup.selectAll("circle")
                    .attr("stroke", d => d.id === vis.selectedCluster ? "black" : "none")
                    .attr("stroke-width", 2);
            });

        // Add labels to clusters
        leafGroups.selectAll("text")
            .data(d => [d])
            .join("text")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "white")
            .attr("pointer-events", "none")
            .text(d => d.name);
    }

    updateBarChart(){

    }
}