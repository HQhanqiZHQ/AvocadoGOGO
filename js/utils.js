// Data processing utilities
const utils = {
    // Calculate average price by region
    getAveragePriceByRegion: (data) => {
        const grouped = d3.group(data, d => d.region);
        return Array.from(grouped, ([region, values]) => ({
            region,
            averagePrice: d3.mean(values, d => d.averagePrice)
        }));
    },

    // Calculate seasonal trends
    getSeasonalTrends: (data) => {
        const grouped = d3.group(data,
            d => d.date.getMonth(),
            d => d.type
        );

        return Array.from(grouped, ([month, typeGroup]) => ({
            month,
            conventional: d3.mean(typeGroup.get('conventional'), d => d.averagePrice) || 0,
            organic: d3.mean(typeGroup.get('organic'), d => d.averagePrice) || 0
        }));
    },

    // Format price for display
    formatPrice: (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    },

    // Format large numbers
    formatNumber: (number) => {
        return new Intl.NumberFormat('en-US').format(number);
    },

    // Get color scale for prices
    getPriceColorScale: () => {
        return d3.scaleSequential()
            .interpolator(d3.interpolateGreens);
    },

    // Calculate week-over-week price changes
    calculatePriceChanges: (data) => {
        const sorted = data.sort((a, b) => a.date - b.date);
        return sorted.map((d, i) => ({
            ...d,
            priceChange: i === 0 ? 0 : d.averagePrice - sorted[i - 1].averagePrice
        }));
    },

    // Get date range for filtering
    getDateRange: (data) => {
        return [
            d3.min(data, d => d.date),
            d3.max(data, d => d.date)
        ];
    },

    // Calculate volume distribution by type
    getVolumeDistribution: (data) => {
        return data.reduce((acc, d) => {
            if (!acc[d.type]) {
                acc[d.type] = {
                    small: 0,
                    large: 0,
                    xlarge: 0
                };
            }
            acc[d.type].small += d.smallBags;
            acc[d.type].large += d.largeBags;
            acc[d.type].xlarge += d.xLargeBags;
            return acc;
        }, {});
    }
};