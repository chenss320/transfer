var BYTE_SUFFICES =[ 'B', 'KB', 'MB', 'GB', 'TB', 'PB'];

var latestStamp = null;
var hourly_chart = null;
var title_to_use = loading_title
var status = "WAITING";

/*
 * Extracts data from XML ready of highcharts
 */
function extractData(data) {
    var newBytes =[];
    var newCount =[];
    var newLatestStamp = null;
    $(data).find("slice").each(
    function () {
        var timeStamp = xmlTimestamp2Date($(this).find("when_taken").text());
        if (null == latestStamp || timeStamp > latestStamp) {
            if (null == newLatestStamp) {
                newLatestStamp = timeStamp;
            }
            newBytes.push([timeStamp,
            parseInt($(this).find("bytes").text())]);
            newCount.push([timeStamp,
            parseInt($(this).find("count").text())]);
        }
    });
    return[newBytes, newCount, newLatestStamp];
}


/*
 * Displays updated values in the chart.
 */
function updateDisplayedData(data, quantity) {
    if ('transfers' == quantity) {
        title_to_use = 'Spade ' + quantity + ' from ' + $(data).find('name').text();
    } else {
        title_to_use = 'Spade ' + quantity + ' at ' + $(data).find('name').text();
    }
    var extractedData = extractData(data);
    if (null != extractedData[2]) {
        hourly_chart.setTitle({
            text: title_to_use
        }, {
            text: displayTimestamp(new Date(extractedData[2]))
        },
        false);
        for (var index = extractedData[0].length - 1; index >= 0;-- index) {
            for (var item = 0; 2 != item; item++) {
                hourly_chart.series[item].addPoint(extractedData[item][index],
                false,
                null != latestStamp);
            }
        }
        hourly_chart.redraw();
        latestStamp = extractedData[2];
    }
}


/*
 * Updates the current values in the chart.
 */
function updateChart(quantity,
instance) {
    if (localTest) {
        var countUrl = '../examples/hourly-' + quantity + '.xml'
    } else {
        var countUrl = '../' + instance + '/report/flows/10mins/' + quantity + '?span=24';
    }
    $.ajax({
        url: countUrl,
        success: function (data, textStatus, xmlHttpRequest) {
            status = "GOOD";
            updateDisplayedData(data, quantity);
            if (null != updateInterval) {
                setTimeout(function () {
                    updateChart(quantity,
                    instance);
                },
                updateInterval);
            }
        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            status = "FAILED";
            hourly_chart.setTitle({
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
function createChart(quantity,
instance) {
    return new Highcharts.Chart({
        chart: {
            renderTo: 'container',
            defaultSeriesType: 'column',
            events: {
                load: updateChart(quantity,
                instance)
            }
        },
        credits: {
            enabled: true,
            href: "http://nest.lbl.gov/products/spade/",
            text: 'Spade Data Management'
        },
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
            },
            shared: true
        },
        title: {
            text: title_to_use
        },
        subtitle: {
            text: loading_subtitle,
            useHTML: true
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis:[ {
            title: {
                text: 'Bytes',
                style: {
                    color: Highcharts.theme.colors[0]
                }
            },
            labels: {
                style: {
                    color: Highcharts.theme.colors[0]
                }
            }
        }, {
            title: {
                text: 'Files',
                style: {
                    color: Highcharts.theme.colors[1]
                }
            },
            labels: {
                style: {
                    color: Highcharts.theme.colors[1]
                }
            },
            opposite: true
        }],
        series:[ {
            name: 'size',
            data:[]
        }, {
            name: 'files',
            data:[],
            yAxis: 1
        }]
    });
};

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
    hourly_chart.setTitle({
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
    if (null != hourly_chart) {
        hourly_chart.setSize(chartWidth, chartHeight);
    }
});

hourly_chart = createChart(parseQuery()[ 'quantity'],
parseQuery()[ 'instance']);
var updateInterval = parseQuery()[ 'interval'] * 1000;
var awaiting_data_interval = setInterval(awaiting_data, 1000);