class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedYear = null;
        this.sortMetric = "avgVolume"; // Default sort by volume
        this.stateMapping = {
            'AL': 'Alabama',
            'AK': 'Alaska',
            'AZ': 'Arizona',
            'AR': 'Arkansas',
            'CA': 'California',
            'CO': 'Colorado',
            'CT': 'Connecticut',
            'DE': 'Delaware',
            'FL': 'Florida',
            'GA': 'Georgia',
            'HI': 'Hawaii',
            'ID': 'Idaho',
            'IL': 'Illinois',
            'IN': 'Indiana',
            'IA': 'Iowa',
            'KS': 'Kansas',
            'KY': 'Kentucky',
            'LA': 'Louisiana',
            'ME': 'Maine',
            'MD': 'Maryland',
            'MA': 'Massachusetts',
            'MI': 'Michigan',
            'MN': 'Minnesota',
            'MS': 'Mississippi',
            'MO': 'Missouri',
            'MT': 'Montana',
            'NE': 'Nebraska',
            'NV': 'Nevada',
            'NH': 'New Hampshire',
            'NJ': 'New Jersey',
            'NM': 'New Mexico',
            'NY': 'New York',
            'NC': 'North Carolina',
            'ND': 'North Dakota',
            'OH': 'Ohio',
            'OK': 'Oklahoma',
            'OR': 'Oregon',
            'PA': 'Pennsylvania',
            'RI': 'Rhode Island',
            'SC': 'South Carolina',
            'SD': 'South Dakota',
            'TN': 'Tennessee',
            'TX': 'Texas',
            'UT': 'Utah',
            'VT': 'Vermont',
            'VA': 'Virginia',
            'WA': 'Washington',
            'WV': 'West Virginia',
            'WI': 'Wisconsin',
            'WY': 'Wyoming'
        };
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 80, right: 200, bottom: 80, left: 120 };
        vis.width = 900 - vis.margin.left - vis.margin.right;
        vis.height = 600 - vis.margin.top - vis.margin.bottom;

        vis.container = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "state-cloud-container")
            .style("position", "relative")
            .style("background-color", "#ffffff")
            .style("border-radius", "8px")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
            .style("max-width", "100%")
            .style("overflow", "hidden");

        vis.container.append("h3")
            .style("text-align", "center")
            .style("font-family", "RockSlayers")
            .style("color", "#4a7337")
            .style("margin", "20px 0")
            .style("padding", "0 20px")
            .style("font-size", "24px")
            .text("State Avocado Market Overview");

        this.addYearSelector();
        this.addMetricToggle();

        vis.tooltip = d3.select("body").append("div")
            .attr("class", "state-tooltip")
            .style("position", "absolute")
            .style("opacity", "0")
            .style("background", "white")
            .style("padding", "12px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "6px")
            .style("font-family", "Patrick Hand")
            .style("font-size", "14px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

        vis.svg = vis.container.append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .style("display", "block")
            .style("margin", "0 auto");

        // Add clip path
        vis.svg.append("defs")
            .append("clipPath")
            .attr("id", "boundingBox")
            .append("rect")
            .attr("x", vis.margin.left)
            .attr("y", vis.margin.top)
            .attr("width", vis.width - vis.margin.left)
            .attr("height", vis.height - vis.margin.top);

        this.wrangleData();
    }

    addYearSelector() {
        let vis = this;
        const years = [...new Set(Object.values(vis.data)
            .flatMap(stateData => stateData.map(d => d.year)))].sort();

        const selectorContainer = vis.container.append("div")
            .style("text-align", "center")
            .style("margin", "20px 0");

        selectorContainer.append("label")
            .style("font-family", "Patrick Hand")
            .style("margin-right", "15px")
            .text("Select Year: ");

        selectorContainer.append("select")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("border-radius", "4px")
            .style("border", "1px solid #4a7337")
            .style("cursor", "pointer")
            .on("change", function() {
                vis.selectedYear = +this.value;
                vis.wrangleData();
            })
            .selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        vis.selectedYear = years[years.length - 1];
    }

    addMetricToggle() {
        let vis = this;
        vis.metricButton = vis.container.append("div")
            .style("text-align", "center")
            .style("margin", "10px 0")
            .append("button")
            .style("padding", "8px 15px")
            .style("font-family", "Patrick Hand")
            .style("cursor", "pointer")
            .style("background", "#4a7337")
            .style("color", "white")
            .style("border", "none")
            .style("border-radius", "5px")
            .text(`Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`)
            .on("click", () => {
                vis.sortMetric = vis.sortMetric === "avgPrice" ? "avgVolume" : "avgPrice";
                vis.metricButton.text(`Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}`);
                vis.wrangleData();
            });
    }

    wrangleData() {
        let vis = this;
        vis.wordData = Object.entries(vis.data)
            .filter(([state, _]) => state !== 'ALL')
            .map(([state, stateData]) => {
                const yearData = stateData.filter(d => d.year === vis.selectedYear);
                return {
                    text: vis.stateMapping[state] || state,
                    abbreviation: state,
                    avgPrice: d3.mean(yearData, d => d.averagePrice) || 0,
                    avgVolume: d3.mean(yearData, d => d.totalVolume) || 0
                };
            })
            .filter(d => d.avgPrice > 0)
            .sort((a, b) => b[vis.sortMetric] - a[vis.sortMetric]);

        vis.wordData.forEach((d, i) => {
            d.rank = i + 1;
        });

        const volumeScale = d3.scaleLog()
            .domain([d3.min(vis.wordData, d => d.avgVolume),
                d3.max(vis.wordData, d => d.avgVolume)])
            .range([12, 32]);

        vis.wordData.forEach(d => {
            d.size = volumeScale(d.avgVolume);
        });

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.svg.selectAll("*").remove();

        // Re-add clip path
        vis.svg.append("defs")
            .append("clipPath")
            .attr("id", "boundingBox")
            .append("rect")
            .attr("x", vis.margin.left)
            .attr("y", vis.margin.top)
            .attr("width", vis.width - vis.margin.left)
            .attr("height", vis.height - vis.margin.top);

        const layout = d3.layout.cloud()
            .size([vis.width - vis.margin.left - vis.margin.right,
                vis.height - vis.margin.top - vis.margin.bottom])
            .words(vis.wordData)
            .padding(8)
            .rotate(() => Math.random() * 90 - 45)
            .fontSize(d => d.size)
            .spiral("archimedean")
            .on("end", draw);

        layout.start();

        function draw(words) {
            const colorScale = d3.scaleSequential()
                .domain(d3.extent(vis.wordData, d => d.avgPrice).reverse())
                .interpolator(d3.interpolateRdBu);

            const centerX = vis.width / 2;
            const centerY = vis.height / 2;

            // Create container group with clip path
            const containerGroup = vis.svg.append("g")
                .attr("clip-path", "url(#boundingBox)");

            // Add background for word cloud
            containerGroup.append("rect")
                .attr("x", vis.margin.left)
                .attr("y", vis.margin.top)
                .attr("width", vis.width - vis.margin.left)
                .attr("height", vis.height - vis.margin.top)
                .attr("fill", "#f8f9fa");

            const group = containerGroup.append("g")
                .attr("transform", `translate(${centerX},${centerY})`);

            // Add word cloud text elements
            const texts = group.selectAll("text")
                .data(words)
                .enter()
                .append("text")
                .style("font-family", "Patrick Hand")
                .style("fill", d => colorScale(d.avgPrice))
                .style("cursor", "pointer")
                .attr("text-anchor", "middle")
                .attr("transform", d => {
                    const x = Math.max(-(vis.width/2 - vis.margin.left),
                        Math.min(vis.width/2 - vis.margin.right, d.x));
                    const y = Math.max(-(vis.height/2 - vis.margin.top),
                        Math.min(vis.height/2 - vis.margin.bottom, d.y));
                    return `translate(${x},${y})rotate(${d.rotate})`;
                })
                .attr("font-size", d => `${d.size}px`)
                .text(d => d.text)
                .style("opacity", 0);

            // Add interactions
            texts.on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("font-size", `${d.size * 1.2}px`)
                    .style("font-weight", "bold");

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <div style="font-family: Patrick Hand">
                            <strong>${d.text} (${d.abbreviation})</strong><br/>
                            Price: $${d.avgPrice.toFixed(2)}<br/>
                            Volume: ${d3.format(",")(Math.round(d.avgVolume))}<br/>
                            Rank by ${vis.sortMetric === "avgPrice" ? "Price" : "Volume"}: ${d.rank}/${vis.wordData.length}
                        </div>
                    `);
            })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("font-size", `${d.size}px`)
                        .style("font-weight", "normal");

                    vis.tooltip.style("opacity", 0);
                });

            // Create legend container
            const legendContainer = vis.svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${vis.width + vis.margin.left - 180}, ${vis.margin.top})`);

            // Add legend background
            legendContainer.append("rect")
                .attr("x", -10)
                .attr("y", -20)
                .attr("width", 170)
                .attr("height", 350)
                .attr("fill", "white")
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1)
                .attr("rx", 5);

            // Add legend title
            legendContainer.append("text")
                .attr("class", "legend-title")
                .attr("x", 0)
                .attr("y", 0)
                .style("font-family", "Patrick Hand")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text("Legend");

            // Price color legend
            const colorLegend = legendContainer.append("g")
                .attr("transform", "translate(0, 30)");

            colorLegend.append("text")
                .attr("x", 0)
                .attr("y", -5)
                .style("font-family", "Patrick Hand")
                .style("font-size", "14px")
                .text("Price Range");

            // Create gradient
            const gradient = vis.svg.append("defs")
                .append("linearGradient")
                .attr("id", "price-gradient")
                .attr("x1", "0%")
                .attr("x2", "0%")
                .attr("y1", "0%")
                .attr("y2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", colorScale(d3.max(vis.wordData, d => d.avgPrice)));

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", colorScale(d3.min(vis.wordData, d => d.avgPrice)));

            // Add gradient rectangle
            colorLegend.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", 100)
                .style("fill", "url(#price-gradient)")
                .style("stroke", "#ccc")
                .style("stroke-width", "1px");

// Add price labels
            const priceExtent = d3.extent(vis.wordData, d => d.avgPrice);
            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 10)
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .text(`$${priceExtent[1].toFixed(2)}`);

            colorLegend.append("text")
                .attr("x", 25)
                .attr("y", 95)
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .text(`$${priceExtent[0].toFixed(2)}`);

            // Size legend
            const sizeLegend = legendContainer.append("g")
                .attr("transform", "translate(0, 160)");

            sizeLegend.append("text")
                .attr("x", 0)
                .attr("y", -5)
                .style("font-family", "Patrick Hand")
                .style("font-size", "14px")
                .text("Volume Range");

            // Create size examples
            const volumeExtent = d3.extent(vis.wordData, d => d.avgVolume);
            const sizeScale = d3.scaleLog()
                .domain(volumeExtent)
                .range([12, 32]);

            [0.25, 0.5, 1].forEach((factor, i) => {
                const size = sizeScale(volumeExtent[0] + (volumeExtent[1] - volumeExtent[0]) * factor);
                const y = i * 35;

                sizeLegend.append("text")
                    .attr("x", 0)
                    .attr("y", y + 20)
                    .style("font-family", "Patrick Hand")
                    .style("font-size", `${size}px`)
                    .text("Aa");

                sizeLegend.append("text")
                    .attr("x", 35)
                    .attr("y", y + 20)
                    .style("font-family", "Patrick Hand")
                    .style("font-size", "12px")
                    .text(d3.format(".2s")(volumeExtent[0] + (volumeExtent[1] - volumeExtent[0]) * factor));
            });

            // Add explanation text
            legendContainer.append("text")
                .attr("x", 0)
                .attr("y", 280)
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .style("fill", "#666")
                .text("* Color indicates price");

            legendContainer.append("text")
                .attr("x", 0)
                .attr("y", 295)
                .style("font-family", "Patrick Hand")
                .style("font-size", "12px")
                .style("fill", "#666")
                .text("* Size indicates volume");

            // Animate words
            texts.transition()
                .delay((d, i) => i * 20)
                .duration(1000)
                .style("opacity", 1);
        }
    }
}