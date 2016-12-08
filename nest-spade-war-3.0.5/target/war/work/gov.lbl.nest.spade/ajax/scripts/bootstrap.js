// Load JavaScript files in sequence.
var scriptLoader = {
	_loadScript : function(url, callback) {
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		if (callback) {
			script.onreadystatechange = function() {
				if (this.readyState == 'loaded')
					callback();
			};
			script.onload = callback;
		}
		head.appendChild(script);
	},

	load : function(items, iteration) {
		if (!iteration)
			iteration = 0;
		if (items[iteration]) {
			scriptLoader._loadScript(items[iteration], function() {
				scriptLoader.load(items, iteration + 1);
			});
		}
	}
};

// Associative array in which the URL's query parameters are stored.
var query_map = null;

// Function to fill query's associative array.
function parseQuery() {
	if (null != query_map) {
		return query_map;
	}
	var query_string = window.location.search.substring(1,
			window.location.search.length);
	var queries = query_string.split("&");
	query_map = new Array();
	for (index in queries) {
		var query_item = queries[index].split("=");
		query_map[query_item[0]] = unescape(query_item[1]);
	}
	if (null != query_defaults) {
		for ( var key in query_defaults) {
			if (null == query_map[key]) {
				query_map[key] = query_defaults[key];
			}
		}
	}
	return query_map;
}

// Resolves the deployment element of URLs.
function resolveDeployment(queries) {
	if (null == queries) {
		// Old behavior
		if ('' == window.location.search) {
			var pathArray = window.location.pathname.split('/');
			var deployment = pathArray[pathArray.length - 2];
			if ('pages' == deployment) {
				return "local";
			}
			return deployment;
		}
		return window.location.search.substring(1,
				window.location.search.length);
	}
	var deployment = parseQuery()['instance'];
	if (null == deployment) {
		var pathArray = window.location.pathname.split('/');
		var deployment = pathArray[pathArray.length - 2];
		if ('pages' == deployment) {
			return "local";
		}
	}
	return deployment;
}

// Variable holding refresh timer.
var timer = null;

// Refreshes the contents of the page
function refreshContents(fn, quantity) {
	var updateInterval = parseQuery()['interval'];
	if (null == updateInterval || 0 >= updateInterval) {
		return;
	}
	if (null != timer) {
		clearTimeout(timer);
		timer = null;
	}
	timer = setTimeout(function() {
		fn(quantity);
	}, updateInterval * 1000);
}

// Starts loading of daily placements plot.
function dailyPlacementsLoaded() {
	var conjunction;
	if (null == window.location.search || '' == window.location.search) {
		conjunction = '?';
	} else {
		conjunction = window.location.search + '&';
	}
	$('#daily_placements_plot').attr('src',
			'chart.html' + window.location.search);
}
