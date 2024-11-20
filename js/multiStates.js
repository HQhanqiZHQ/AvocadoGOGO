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
            'BaltimoreWashington': ['Maryland', 'Virginia', 'District of Columbia', 'West Virginia'],
            'GreatLakes': ['Wisconsin', 'Illinois', 'Michigan', 'Indiana', 'Ohio'],
            'HartfordSpringfield': ['Connecticut', 'Massachusetts'],
            'Midsouth': ['Tennessee', 'Kentucky'],
            'NewOrleansMobile': ['Louisiana', 'Mississippi', 'Alabama'],
            'Northeast': ['New York', 'New Jersey', 'Pennsylvania'],
            'NorthernNewEngland': ['Maine', 'New Hampshire', 'Vermont'],
            'Plains': ['Minnesota', 'Iowa', 'Missouri', 'Kansas', 'Nebraska', 'South Dakota', 'North Dakota'],
            'SouthCentral': ['Texas', 'Oklahoma', 'Arkansas'],
            'Southeast': ['North Carolina', 'South Carolina', 'Georgia', 'Florida'],
            'West': ['California', 'Nevada', 'Oregon', 'Washington', 'Idaho', 'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona'],
            'WestTexNewMexico': ['New Mexico', 'Texas'],
            'California':['California']

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
            // vis.usStates = topojson.feature(us, us.objects.states).features;
            vis.usStates = topojson.feature(us, us.objects.states).features
                .filter(d => {
                    const state = vis.getStateName(d);  // Implement this helper function
                    return state !== 'Alaska' && state !== 'Hawaii';
                });
            vis.stateBorders = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
            vis.wrangleData();
        });
        vis.getStateName = function(feature) {
            // You'll need to implement this based on your data structure
            // It should return the state name from the feature properties
            return feature.properties.name;
        };
    }

    initSlider() {
        let vis = this;
        const slider = document.getElementById('range-slider-region');
        const rangeValue = document.getElementById('range-value');
        let isDragging = false;
        let dragStartX = 0;
        let startValues = [];

        const MIN_RANGE = 5;

        function sliderToDataMonth(sliderValue) {
            const monthOffset = 11; // December = 11 (0-based)
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

            slider.noUiSlider.on('update', function(values) {
                rangeValue.textContent = formatRangeDisplay(values);
            });

            const connect = slider.querySelector('.noUi-connect');

            connect.addEventListener('mousedown', function(e) {
                isDragging = true;
                dragStartX = e.clientX;
                startValues = slider.noUiSlider.get().map(Number);
                connect.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', function(e) {
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

            document.addEventListener('mouseup', function() {
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

            slider.noUiSlider.on('change', function(values) {
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
        // Data processing code...

        let vis = this;

        vis.filteredData = {};

        Object.entries(vis.data).forEach(([region, regionData]) => {
            // Filter data by time range
            const timeFilteredData = regionData.filter(d => {
                const date = new Date(d.date);
                const monthIndex = (date.getFullYear() - 2015) * 12 + date.getMonth();
                return monthIndex >= vis.startMonth && monthIndex <= vis.endMonth;
            });

            if (timeFilteredData.length > 0) {
                // Calculate averages and totals for the filtered time period
                const avgPrice = d3.mean(timeFilteredData, d => d.averagePrice);
                const totalVolume = d3.sum(timeFilteredData, d => d.totalVolume);

                // Apply the same values to all states in the region
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

    updateVis() {
        let vis = this;

        // Track current highlighted region
        let currentRegion = null;
        let tooltipFixed = false;

        const states = vis.svg.selectAll(".state")
            .data(vis.usStates);

        // Helper function to highlight region
        function highlightRegion(region) {
            vis.svg.selectAll(".state")
                .filter(d => vis.stateRegionMap[d.properties.name] === region)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);
        }

        // Helper function to remove highlight
        function removeHighlight() {
            vis.svg.selectAll(".state")
                .attr("stroke", null)
                .attr("stroke-width", null);
        }

        // Helper function to show tooltip with updated info
        function showTooltip(region, event) {
            // console.log(region)
            if (!tooltipFixed || currentRegion !== region) {
                const regionData = vis.regionSummaries[region];
                if (!regionData) return;

                const dateStart = new Date(2015, vis.startMonth % 12);
                const dateEnd = new Date(2015 + Math.floor(vis.endMonth / 12), vis.endMonth % 12);

                vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="font-family: ChalkboyRegular">
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

                tooltipFixed = true;
                currentRegion = region;
            }
        }

        // Update colors based on filtered data
        states.join("path")
            .attr("class", "state")
            .attr("d", vis.path)
            .attr("fill", d => {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                const regionData = vis.regionSummaries[region];

                if (!region || !regionData) return "#ccc";

                return vis.selectedMetric === 'price'
                    ? vis.priceColorScale(regionData.avgPrice)
                    : vis.volumeColorScale(regionData.totalVolume);
            })
            .on("mouseover", function(event, d) {
                const stateName = d.properties.name;
                const region = vis.stateRegionMap[stateName];
                console.log(d)
                if (region && vis.regionSummaries[region]) {
                    if (currentRegion !== region) {
                        tooltipFixed = false;
                        highlightRegion(region);
                        showTooltip(region, event);
                    }
                }
            })
            .on("mousemove", function(event, d) {
                const region = vis.stateRegionMap[d.properties.name];
                if (region === currentRegion) {
                    return;
                }
            })
            .on("mouseout", function(event, d) {
                const toElement = event.relatedTarget;
                if (!toElement || !toElement.classList.contains('state')) {
                    removeHighlight();
                    vis.tooltip.style("opacity", 0);
                    currentRegion = null;
                    tooltipFixed = false;
                } else {
                    const newRegion = vis.stateRegionMap[toElement.__data__.properties.name];
                    if (newRegion !== currentRegion) {
                        removeHighlight();
                        vis.tooltip.style("opacity", 0);
                        currentRegion = null;
                        tooltipFixed = false;
                    }
                }
            });

        // Update state borders
        vis.svg.selectAll(".state-borders")
            .data([vis.stateBorders])
            .join("path")
            .attr("class", "state-borders")
            .attr("d", vis.path)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);

        // Update color scales based on filtered data
        const maxPrice = d3.max(Object.values(vis.regionSummaries), d => d.avgPrice);
        const maxVolume = d3.max(Object.values(vis.regionSummaries), d => d.totalVolume);

        vis.priceColorScale.domain([0, maxPrice]);
        vis.volumeColorScale.domain([0, maxVolume]);
    }

    updateTimeRange(start, end) {
        this.startMonth = Math.round(start);
        this.endMonth = Math.round(end);
        console.log(this.endMonth, this.startMonth)
        this.wrangleData();
    }

    update() {
        this.updateVis();
    }


}