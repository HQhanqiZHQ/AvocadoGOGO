# AvocadoGOGO - Interactive Avocado Market Analysis

## Live Demo
Visit our live deployment: [AvocadoGOGO ](https://hqhanqizhq.github.io/AvocadoGOGO/)

## Description
An interactive data visualization platform that analyzes avocado price trends and consumption patterns across the United States. The project features multiple visualizations including seasonal distributions, price analysis, and regional comparisons.

## Features
- Seasonal distribution visualization
- Interactive price trend analysis
- State-by-state consumption patterns
- Regional comparison tool
- Price-volume correlation analysis

## Local Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Local web server

### Installation
1. Clone the repository
```bash
git clone https://github.com/hqhanqizhq/AvocadoGOGO.git
cd AvocadoGOGO
```

2. Start a local server
```bash
# Using Python 3
python -m http.server 8000

# Or using Python 2
python -m SimpleHTTPServer 8000
```

3. Access the application
```
http://localhost:8000
```

## Dependencies
### Core Libraries
- D3.js v7.0.0
- Bootstrap v5.2.2
- noUiSlider v14.7.0
- D3-cloud

### CDN Links
```html
<!-- Bootstrap -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- D3.js -->
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://d3js.org/d3-scale-chromatic.v1.min.js"></script>
<script src="https://d3js.org/topojson.v2.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.7.0/nouislider.min.js"></script>


<!-- noUiSlider -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.7.0/nouislider.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/14.7.0/nouislider.min.js"></script>
```

## Project Structure
```
avocadogogo/
├── css/
│   ├── style.css      # Main styles
│   └── custom.css     # Custom visualization styles
├── js/
│   ├── main.js        # Main application logic
│   ├── utils.js       # Utility functions
│   ├── correlationVis.js
│   ├── dataRegionMoldify.js
│   ├── individualState.js
│   ├── multiStates.js
│   ├── priceVis.js
│   ├── setupImage.js # Centralizes Image URL Management
│   └── treeVis.js
├── img/
│   └── icons/         # UI icons
├── font/             # Custom fonts
└── index.html        # Main entry point
```

## Data Source
Data provided by the Hass Avocado Board Statistics(https://hassavocadoboard.com/), offering comprehensive information about avocado prices and sales volumes across the United States.
The dataset includes 13 variables and 18249 observations. The variables are ```Date```, ```AveragePrice```, ```Total Volume```, avocado volume of three different sizes (```4046```, ```4225```, ```4770```), ```Total Bags```, ```Small Bags```, ```Large Bags```, ```XL Large Bags```, ```type```(organic/conventional), ```year```, ```region```(a mix of state name and city name, we preprocessed this in our codes).
## Authors
- **Hanqi(Hanna) Zeng** - *Data Engineer*
- **Tianshu(Rose) Luo** - *Data Scientist*

## License
This project is licensed under the MIT License

## Acknowledgments
- Hass Avocado Board for the dataset
- D3.js community
- Bootstrap team