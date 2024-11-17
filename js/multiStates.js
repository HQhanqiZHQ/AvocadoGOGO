class MultiStates {

    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = data;
        this.initVis();
    }

    initVis(){
        console.log(this.data);

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
            .text("Avocado Price Map");

        // Initialize map projection
        vis.projection = d3.geoAlbersUsa()
            .translate([vis.width / 2, vis.height / 2])
            .scale(vis.width);

        vis.path = d3.geoPath()
            .projection(vis.projection);

        // Create color scales
        vis.priceColorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, 3]); // Typical price range

        vis.volumeColorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, 1000000]); // Adjust based on your volume range

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

        vis.regionStatesMap = {
            'BaltimoreWashington': ['Maryland', 'Virginia', 'District of Columbia'],
            'GreatLakes': ['Wisconsin', 'Illinois', 'Michigan', 'Indiana', 'Ohio'],
            'HartfordSpringfield': ['Connecticut', 'Massachusetts'],
            'Midsouth': ['Tennessee', 'Kentucky'],
            'NewOrleansMobile': ['Louisiana', 'Mississippi', 'Alabama'],
            'Northeast': ['New York', 'New Jersey', 'Pennsylvania'],
            'NorthernNewEngland': ['Maine', 'New Hampshire', 'Vermont'],
            'Plains': ['Minnesota', 'Iowa', 'Missouri', 'Kansas', 'Nebraska', 'South Dakota', 'North Dakota'],
            'SouthCentral': ['Texas', 'Oklahoma', 'Arkansas'],
            'Southeast': ['North Carolina', 'South Carolina', 'Georgia', 'Florida'],
            'West': ['California', 'Nevada', 'Oregon', 'Washington', 'Idaho', 'Montana', 'Wyoming', 'Utah', 'Colorado'],
            'WestTexNewMexico': ['New Mexico', 'West Texas']
        };
        vis.stateRegionMap = {};
        Object.entries(vis.regionStatesMap).forEach(([region, states]) => {
            states.forEach(state => {
                vis.stateRegionMap[state] = region;
            });
        });

        // Load US map data
        Promise.all([
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
            d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
        ]).then(([us]) => {
            vis.usStates = topojson.feature(us, us.objects.states).features;
            vis.stateBorders = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
            vis.wrangleData();
        });
    }

    wrangleData() {
        // Data processing code...

        let vis = this;

        vis.filteredData = {};

        Object.entries(vis.data).forEach(([region, regionData]) => {
            const filteredRegionData = regionData.filter(d => {
                const matchesYear = d.year === +vis.selectedYear;
                const matchesType = vis.selectedType === 'all' || d.type === vis.selectedType;
                return matchesYear && matchesType;
            });

            if (filteredRegionData.length > 0) {
                const avgPrice = d3.mean(filteredRegionData, d => d.averagePrice);
                const totalVolume = d3.sum(filteredRegionData, d => d.totalVolume);

                // Apply the same values to all states in the region
                vis.regionStatesMap[region].forEach(state => {
                    vis.filteredData[state] = {
                        avgPrice: avgPrice,
                        totalVolume: totalVolume,
                        region: region
                    };
                });
            }
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        // Update visualization code...
        const states = vis.svg.selectAll(".state")
            .data(vis.usStates);

        function highlightRegion(region) {
            vis.svg.selectAll(".state")
                .filter(d => vis.stateRegionMap[d.properties.name] === region)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);
        }

        function removeHighlight() {
            vis.svg.selectAll(".state")
                .attr("stroke", null)
                .attr("stroke-width", null);
        }
        states.join("path")
            .attr("class", "state")
            .attr("d", vis.path)
            .attr("fill", d => {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                const stateData = vis.filteredData[stateName];

                if (!stateData || !region) return "#ccc";

                return vis.selectedMetric === 'price'
                    ? vis.priceColorScale(stateData.avgPrice)
                    : vis.volumeColorScale(stateData.totalVolume);
            })
            .on("mouseover", function(event, d) {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                const stateData = vis.filteredData[stateName];
                // console.log(stateName,region, stateData )
                if (region) {
                    // Highlight all states in the region
                    highlightRegion(region);

                    // Show tooltip
                    vis.tooltip
                        .style("opacity", 1)
                        .html(`
                            <div style="font-family: ChalkboyRegular">
                                <strong>${region} Region</strong><br/>
                                <em>Includes ${stateName}</em><br/>
                                Average Price: $${stateData.avgPrice.toFixed(2)}<br/>
                                Total Volume: ${d3.format(",")(Math.round(stateData.totalVolume))}
                            </div>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function() {
                removeHighlight();
                vis.tooltip.style("opacity", 0);
            });

        // Add state borders
        vis.svg.selectAll(".state-borders")
            .data([vis.stateBorders])
            .join("path")
            .attr("class", "state-borders")
            .attr("d", vis.path)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);


    }
    update() {
        this.updateVis();
    }


}