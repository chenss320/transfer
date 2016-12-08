/*
 * Builds arrays that can be used in the chart.
 * 
 * param : data the XML document from which to extract the data.
 */
function buildArrays(data, quantity) {
	categories = [];
	total = [];
	executing = [];
	pending = [];
	suspended = [];
	$(data).find(quantity).each(function() {
		categories.push($(this).children('name').text());
		total.push(parseInt($(this).attr('total')));
		executing.push(parseInt($(this).children('executing').text()));
		pending.push(parseInt($(this).children('pending').text()));
		suspended.push(parseInt($(this).children('suspended').text()));
	});
	return [ categories, suspended, pending, executing, total ];
}

/*
 * Displays updated values in the chart.
 */
function updateDisplayedData(data, quantity) {
	var arrays = buildArrays(data, quantity);
	chartHeight = 192 + 32 * arrays[0].length;
	$('#container').height(chartHeight);
	var prefix;
	var suffix;
	if ('totals' == quantity) {
		prefix = 'Total ';
		suffix = '';
		chart1.xAxis[0].axisTitle.attr({
			text : $(data).find('totals>name').text()
		});
	} else {
		prefix = '';
		suffix = ' instance ' + $(data).find('totals>name').text();
		chart1.series[0].xAxis.setCategories(arrays[0], false);
	}
	chart1.setTitle({
		text : prefix + 'Counts for SPADE' + suffix
	}, {
		text : displayTimestamp(new Date(xmlTimestamp2Date($(data).find(
				"timestamp").text())))
	});
	chart1.series[0].setData(arrays[1], false);
	chart1.series[1].setData(arrays[2], false);
	chart1.series[2].setData(arrays[3], false);
	chart1.series[3].setData(arrays[4], false);
	chart1.setSize(chartWidth, chartHeight);
}

/*
 * Updates the current values in the chart.
 */
function updateChart(quantity) {
	var updateInterval = parseQuery()['interval'];
	if (null == updateInterval || 0 >= updateInterval) {
		return;
	}
	updateInterval = updateInterval * 1000;
	if (localTest) {
		var countUrl = "../examples/application-counts.1.xml";
	} else {
		var countUrl = '../' + resolveDeployment(parseQuery())
				+ '/report/counts';
	}
	$.ajax({
		url : countUrl,
		success : function(data, textStatus, xmlHttpRequest) {
			updateDisplayedData(data, quantity);
			refreshContents(updateChart, quantity);
		},
		error : function(xmlHttpRequest, textStatus, errorThrown) {
			if ('' != errorThrown) {
				alert(errorThrown);
			} else {
				alert(textStatus);
			}
			refreshContents(updateChart, quantity);
		}
	});
};

/*
 * Creates the chart that will display the current counts.
 */
function createChart(quantity) {
	return new Highcharts.Chart({
		chart : {
			renderTo : 'container',
			defaultSeriesType : 'bar',
			events : {
				load : updateChart(quantity)
			}
		},
		credits : {
			enabled : true,
			href : "http://nest.lbl.gov/products/spade/",
			text : 'Spade Data Management'
		},
		title : {
			text : 'Total Counts for SPADE'
		},
		subtitle : {
			text : 'Loading ...'
		},
		xAxis : {
			title : {
				text : 'Activity',
				style : {
					color : Highcharts.theme.colors[0]
				}
			},
			labels : {
				style : {
					minWidth : '140px'
				}
			}
		},
		yAxis : [ {
			title : {
				text : 'counts',
				style : {
					color : Highcharts.theme.colors[0]
				}
			},
			labels : {
				style : {
					color : Highcharts.theme.colors[0]
				}
			}
		}],
		series : [ {
			name : 'suspended'
		}, {
			name : 'pending'
		}, {
			name : 'executing'
		}, {
			name : 'total'
		} ]
	});
}

var chartWidth = $(window).width() - 16;
var chartHeight = 224;

$(window).resize(function() {
	chartWidth = $(window).width() - 16;
	chart1.setSize(chartWidth, chartHeight);
});
