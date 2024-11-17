class MultiStates {

    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = data;
        this.initVis();
    }

    initVis(){

    }
    updateVis() {
        let vis = this;
        // Update visualization code...
    }
    update() {
        this.updateVis();
    }

    wrangleData() {
        // Data processing code...
        this.updateVis();
    }
}