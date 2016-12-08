var BYTE_SUFFICES =[ 'B', 'KB', 'MB', 'GB', 'TB', 'PB'];

var latestStamp = null;
var daily_chart = null;
var title_to_use = loading_title
var status = "WAITING";


/*
 * Displays updated values in the chart.
 */
function updateDisplayedData(data, quantity) {
    daily_chart.destory;
    title_to_use = data.subject
    createChart(quantity, parseQuery()[ 'instance'], data);
}


/*
 * Updates the current values in the chart.
 */
function updateChart(quantity,
instance) {
    if (localTest) {
        var countUrl = '../examples/daily-' + quantity + '.json'
    } else {
        var countUrl = '../' + instance + '/report/flows/daily/' + quantity
    }
    $.ajax({
        url: countUrl,
		dataType:"json",
        success: function (data, textStatus, xmlHttpRequest) {
            status = "GOOD";
            updateDisplayedData(data, quantity);
        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            status = "FAILED";
            daily_chart.setTitle({
                text: title_to_use
            }, {
                text: 'Data failure (' + errorThrown + ') on ' + displayTimestamp(new Date()),
                useHTML: false
            });
            if (null != updateInterval) {
                setTimeout(function () {
                    updateChart(quantity,
                    instance);
                },
                updateInterval);
            }
        }
    });
};


/*
 * Creates the chart that will display the current counts.
 */
function createChart(quantity, instance, data) {
    if (null == data) {
        events = {
            load: updateChart(quantity,
            instance)
        };
        series =[ {
            tooltip: {
                valueDecimals: 2
            }
        },
        {
            type: 'column',
            tooltip: {
                valueDecimals: 0
            },
            yAxis: 1
        }];
        subtitle = {
            text: loading_subtitle,
            useHTML: true
        };
    } else {
        events = null;
        series =[ {
            data: data.bytes,
            tooltip: {
                valueDecimals: 2
            }
        },
        {
            type: 'column',
            data: data.count,
            tooltip: {
                valueDecimals: 0
            },
            yAxis: 1
        }];
        subtitle = null;
    }
    return new Highcharts.StockChart({
        chart: {
            renderTo: 'container',
            alignTicks: false,
            events: events
        },
        rangeSelector: {
            selected: 0
        },
        title: {
            text: title_to_use
        },
        subtitle: subtitle,
        
        tooltip: {
            formatter: function () {
                var s = '<b>' + Highcharts.dateFormat('%A, %b %e, %Y', this.x) + '</b>';
                $.each(this.points, function (i, point) {
                    if (point.series.name.indexOf('size', point.series.name.length - 4) !== -1) {
                        var decimal = 0;
                        var index = 0;
                        var value = point.y;
                        while (value > 1024 && index < BYTE_SUFFICES.length -1) {
                            decimal = 2;
                            index += 1;
                            value = value / 1024;
                        }
                        s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + ': ' + value.toFixed(decimal) + ' ' + BYTE_SUFFICES[index];
                    } else {
                        s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + ': ' + point.y;
                    }
                });
                return s;
            }
        },
        
        yAxis:[ {
            title: {
                text: 'Bytes'
            },
            height: 150,
            lineWidth: 2
        },
        {
            title: {
                text: 'Files'
            },
            top: 250,
            height: 50,
            offset: 0,
            lineWidth: 2
        }],
        
        series: series
    });
}


// Function to update loading progress.
function awaiting_data() {
    if ("WAITING" != status) {
        clearInterval(awaiting_data_interval);
        return;
    }
    dots = loading_subtitle;
    if (-1 == dots.indexOf("&nbsp;")) {
        dots = dots.replace(/\./g, '&nbsp;');
    }
    dots = dots.replace(/&nbsp;/, '.');
    loading_subtitle = dots;
    daily_chart.setTitle({
        text: title_to_use
    }, {
        text: loading_subtitle,
        useHTML: true
    });
}


var chartWidth = $(window).width() - 16;
var chartHeight = 400 - 16;
$(window).resize(function () {
    chartWidth = $(window).width() - 16
    if (null != daily_chart) {
        daily_chart.setSize(chartWidth, chartHeight);
    }
});

daily_chart = createChart(parseQuery()[ 'quantity'], parseQuery()[ 'instance'], null);
var updateInterval = parseQuery()[ 'interval'] * 1000;
var awaiting_data_interval = setInterval(awaiting_data, 1000);