var millsInMin = 60 * 1000;
var millsInHour = 60 * millsInMin;

/*
 * Converts an XML timestamp into a JavaScript date
 * 
 * param : timestamp The XML timestamp to convert.
 */
function xmlTimestamp2Date(timestamp) {
	var x = timestamp.split('T');
	var y = x[0].split('-');
	var endSeconds = x[1].search("[^0-9:]");
	var w = x[1].slice(0, endSeconds).split(':');
	var result = Date.UTC(y[0], y[1] - 1, y[2], w[0], w[1], w[2]);
	if (-1 == endSeconds) {
		return result;
	}
	var v = x[1].slice(endSeconds);
	var endMillis = v.search("[^\.0-9:]");
	if (-1 == endMillis) {
		var z = v;
	} else {
		var z = v.slice(endMillis);
	}
	if ('Z' == z[0]) {
		return result;
	}
	var sign = 1;
	if ('+' == z[0]) {
		sign = -1;
	}
	return result
			+ (sign * ((parseInt(z[1] + z[2], 10) * millsInHour) + (parseInt(
					z[4] + z[5], 10) * millsInMin)));
}

var ACTIVITY_STATE_PREFIX = 'activity-running-';

/*
 * Requests a possible change in the state of an application/activity.
 * 
 * param : event The UI event that triggered the invocation.
 */
function requestChange(event) {
	event.preventDefault();
	nameOfChange = $(this).attr('name');
	if ('application-running' == nameOfChange) {
		updatePage([ $(this).val() == 'off', null ]);
	} else if (0 == nameOfChange.indexOf(ACTIVITY_STATE_PREFIX)) {
		var activity = nameOfChange.substring(ACTIVITY_STATE_PREFIX.length,
				nameOfChange.length);
		updatePage([ $(this).val() == 'off', activity ]);
	}
}

/*
 * Creates a list element for this specified activity
 */
function createActivityElement(nameElement, list) {
	var name = nameElement.text();
	var element = '<li><div><span class="activity-name">'
			+ name
			+ '</span><span\
    style="float:right;top:-8px;position:relative;"><select\
    name="activity-running-'
			+ name
			+ '" data-mini="true" data-role="slider"\
    disabled="disabled">\
    <option value="off">Off</option>\
    <option value="on">On</option>\
    </select>\
    </span></div></li>';
	list.append(element);
	return list.find('select[name="' + ACTIVITY_STATE_PREFIX + name + '"]');
}

/*
 * Updates the list of activities and their current states.
 * 
 * param : data The data from which to extract the current states.
 */
function updateActivityStates(data) {
	var list = $('#activity-states');
	if (0 == list.length) {
		return;
	}
	var loads = $(data).find('activity');
	if (0 == loads.length) {
		var templateItem = $('select[name="activity-loading"]');
		if (0 != templateItem) {
			templateItem.parent().parent().find('.activity-name').text(
					'No Activities');
		}
		return;
	}
	loads.each(function() {
		var name = $(this).children('name');
		var select = $('select[name="activity-running-' + name.text() + '"]');
		var value;
		if ('false' != $(this).children('suspended').text()) {
			value = 'off';
		} else {
			value = 'on';
		}
		if (0 == select.length) {
			var templateItem = $('select[name="activity-loading"]');
			if (0 != templateItem.length) {
				templateItem.parent().parent().parent().remove();
			}
			select = createActivityElement(name, list);
			select.val(value).slider().slider('enable').slider('refresh');
			select.on('slidestop', requestChange);
		} else if (select.val() != value) {
			select.val(value).slider('refresh');
		}
	});
	list.listview('refresh');
}

/*
 * Updates the current status of the application.
 * 
 * param : data The data from which to extract the current state.
 */
function updateApplicationState(data) {
	$(data).find('loads>totals').each(function() {
		var select = $('select[name="application-running"]');
		var value;
		if ('false' != $(this).children('suspended').text()) {
			value = 'off';
		} else {
			value = 'on';
		}
		if (select.val() != value) {
			select.val(value).slider('refresh');
		}
	});
}

/*
 * Converts a DiskSpace elemtn in to a displayable value
 */
var diskUnits = [ 'bytes', 'KB', 'MB', 'GB', 'TB' ];
function diskSpace2String(diskSpace) {
	var value = Number(diskSpace.text());
	var units = diskSpace.find('units');
	var scale = 0;
	if (0 != units.length) {
		var index = 0;
		while (diskUnits.length != scale) {
			if (diskUnits[index] == units) {
				scale = index;
			}
			index++;
		}
	}
	if (diskUnits.length == scale) {
		return value + units;
	}
	var lastUnit = diskUnits.length - 1;
	while (value > 512 && lastUnit != scale) {
		value = value / 1024;
		scale = scale + 1;
	}
	if (1 > value) {
		return value.toFixed(2) + diskUnits[scale];
	}
	if (10 > value) {
		return value.toFixed(1) + diskUnits[scale];
	}
	return value.toFixed(0) + diskUnits[scale];
}

/*
 * Updates the web pages load displays.
 * 
 * param : data The application-loal data to use in the update.
 */
function updateDisplayedData(data) {
	var name = $(data).find('loads>totals>name').text();
	if ($('#application-instance').text() != name) {
		$('#application-instance').text(name);
		$('select[name="application-running"]').slider('enable').slider(
				'refresh').on('slidestop', requestChange);
	}
	disk = $(data).find('disk-load');
	if (0 != disk.length) {
		$('#disk-spade').text(
				diskSpace2String(disk.find('free')) + '/'
						+ diskSpace2String(disk.find('minimum')));
	}
	date = new Date();
	date.setTime(xmlTimestamp2Date($(data).find('timestamp').text()));
	$('#last-update').text(date.toString());
	updateApplicationState(data);
	updateActivityStates(data);
}

/*
 * Send a request to update the application status
 * 
 * param : args[0] If not 'null' then this will be used to set the new value of
 * suspend for the application.
 * 
 * param : args[1] If not 'null' then this will be used as the name of the
 * activity, otherwise the while application is used.
 */
function updatePage(args) {
	var suspend = args[0];
	var activity = args[1];

	var data = null;
	var httpType = "GET";
	var mediaType = 'application/xml';
	var activityUrl;
	if (null == suspend) {
		if (localTest) {
			activityUrl = '../examples/application-running.xml';
		} else {
			activityUrl = '../' + resolveDeployment(parseQuery())
					+ '/report/loads';
		}
	} else {
		if (localTest) {
			if (suspend && null != activity) {
				if ('archiver-spool' == activity) {
					activityUrl = '../examples/activity-suspended-' + activity
							+ '.xml';
				} else {
					activityUrl = '../examples/application-running.xml';
				}
			} else {
				if (suspend) {
					activityUrl = '../examples/application-suspended.xml';
				} else {
					activityUrl = '../examples/application-running.xml';
				}
			}
		} else {
			var action;
			if (suspend) {
				action = 'suspend';
			} else {
				action = 'resume';
			}
			if (null == activity) {
				activityUrl = '../' + resolveDeployment(parseQuery())
						+ '/command/' + action;
			} else {
				activityUrl = '../' + resolveDeployment(parseQuery())
						+ '/command/activities/' + action;
				data = '<?xml version="1.0"?><activities><activity>' + activity
						+ '</activity></activities>';
				mediaType = 'application/gov.lbl.nest.spade.rs.Activities+xml';
			}
			httpType = "POST";
		}
	}
	$.ajax({
		url : activityUrl,
		success : function(data, textStatus, xmlHttpRequest) {
			updateDisplayedData(data);
			refreshContents(updatePage, [ null, activity ]);
		},
		error : function(xmlHttpRequest, textStatus, errorThrown) {
			if (suspend && 'Not Found' == errorThrown) {
				alert('Not authorized');
				refreshContents(updatePage, [ null, activity ]);
				return;
			}
			if ('' == errorThrown) {
				alert(textStatus);
			} else {
				alert(errorThrown);
			}
			refreshContents(updatePage, [ null, activity ]);
		},
		contentType : mediaType,
		data : data,
		type : httpType
	});
}

/*
 * Toggles whether the activity statuses are shown or hidden.
 */
function toggleActivitiesTable(event) {
	activites = $("#activity-table");
	if (activites.hasClass('showing')) {
		activites.removeClass('showing');
		activites.toggle('blind');
	} else {
		activites.addClass('showing');
		activites.toggle('blind');
	}
}

/*
 * Requests a command be executed by the SPADE application.
 * 
 * param : event The UI event that triggered the invocation.
 */
function executeCommand(event) {
	var command = $(this);
	command.attr('disabled', 'disabled').button('refresh');
	if (localTest) {
		alert('waiting for command ' + command.attr("id"));
		command.removeAttr("disabled").button('refresh');
	} else {
		commandUrl = '../' + resolveDeployment(parseQuery()) + '/command/'
				+ $(this).attr('id');
		$.ajax({
			url : commandUrl,
			success : function(data, textStatus, xmlHttpRequest) {
				command.removeAttr("disabled").button('refresh');
			},
			error : function(xmlHttpRequest, textStatus, errorThrown) {
				if ('Not Found' == errorThrown) {
					alert('Not authorized');
					return;
				}
				if ('' == errorThrown) {
					alert(textStatus);
				} else {
					alert(errorThrown);
				}
			},
			type : "POST"
		});
	}
}

$('#spade-actions :button').each(function() {
	$(this).click(executeCommand).removeAttr("disabled");
	$(this).button('refresh');
});
$('#activity-toggle').click(toggleActivitiesTable);

$(document).delegate('[data-role="page"]', 'pageinit', function() {
	updatePage([ null, null ]);
});

updatePage([ null, null ]);