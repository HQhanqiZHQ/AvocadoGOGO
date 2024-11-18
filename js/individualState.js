class IndividualState {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Create title and container for the table
        vis.container = d3.select(vis.parentElement)
            .append("div")
            .attr("class", "state-price-container")
            .style("padding", "10px");

        // Add title
        vis.container.append("h3")
            .style("text-align", "center")
            .style("font-family", "RockSlayers")
            .style("color", "#4a7337")
            .text("Avocado Prices by State");

        // Create year selector
        this.addYearSelector();

        // Create table container
        vis.tableContainer = vis.container.append("div")
            .attr("class", "table-container")
            .style("max-height", "400px")
            .style("overflow-y", "auto")
            .style("margin-top", "20px");

        this.wrangleData();
    }

    addYearSelector() {
        let vis = this;

        // Get available years
        const years = [...new Set(Object.values(vis.data)
            .flatMap(stateData => stateData.map(d => d.year)))].sort();

        // Create selector container
        const selectorContainer = vis.container.append("div")
            .style("text-align", "center")
            .style("margin", "20px 0");

        // Add label
        selectorContainer.append("label")
            .style("font-family", "ChalkboyRegular")
            .style("margin-right", "10px")
            .text("Select Year: ");

        // Add select element
        selectorContainer.append("select")
            .style("padding", "5px 10px")
            .style("font-family", "ChalkboyRegular")
            .on("change", function () {
                vis.selectedYear = +this.value;
                vis.wrangleData();
            })
            .selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        // Set initial year
        vis.selectedYear = years[years.length - 1];
    }

    wrangleData() {
        let vis = this;

        // Process data for each state
        vis.tableData = Object.entries(vis.data).map(([state, stateData]) => {
            const yearData = stateData.filter(d => d.year === vis.selectedYear);

            const avgPrice = d3.mean(yearData, d => d.averagePrice);
            const avgVolume = d3.mean(yearData, d => d.totalVolume);

            return {
                state: state,
                avgPrice: avgPrice || 0,
                avgVolume: avgVolume || 0,
                hasData: yearData.length > 0
            };
        }).filter(d => d.hasData)  // Only keep states with data
            .sort((a, b) => b.avgPrice - a.avgPrice);  // Sort by price descending

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Create table
        const table = vis.tableContainer.selectAll("table").data([0]);
        const tableEnter = table.enter()
            .append("table")
            .style("width", "100%")
            .style("border-collapse", "collapse")
            .style("font-family", "ChalkboyRegular");

        // Update table header
        const header = tableEnter.append("thead")
            .append("tr");

        header.selectAll("th")
            .data(["State", "Average Price", "Average Volume"])
            .enter()
            .append("th")
            .style("background-color", "#4a7337")
            .style("color", "white")
            .style("padding", "10px")
            .text(d => d);

        // Update table body
        const tbody = table.merge(tableEnter).selectAll("tbody")
            .data([vis.tableData]);

        const tbodyEnter = tbody.enter()
            .append("tbody");

        // Update rows
        const rows = tbody.merge(tbodyEnter).selectAll("tr")
            .data(d => d);

        const rowsEnter = rows.enter()
            .append("tr")
            .style("cursor", "pointer")
            .style("transition", "background-color 0.3s");

        // Hover effect
        rowsEnter
            .on("mouseover", function () {
                d3.select(this).style("background-color", "#f0f7ed");
            })
            .on("mouseout", function () {
                d3.select(this).style("background-color", "white");
            });

        // Update cells
        const cells = rows.merge(rowsEnter).selectAll("td")
            .data(d => [
                d.state,
                `$${d.avgPrice.toFixed(2)}`,
                d3.format(",")(Math.round(d.avgVolume))
            ]);

        cells.enter()
            .append("td")
            .merge(cells)
            .style("padding", "8px")
            .style("border-bottom", "1px solid #ddd")
            .style("text-align", (d, i) => i === 0 ? "left" : "right")
            .text(d => d);

        // Exit
        rows.exit().remove();
        cells.exit().remove();
    }
}