/*
 * Requests the digest(s) contain the requested identity.
 */
function requestDigest(mode) {
    var modeSpan = table.find('.history_mode');
	if ('ticket' == mode) {
		modeSpan.text(mode);
	} else {
		modeSpan.text('bundle');
	}
	var input = $('#history_request');
	input.blur();
	identity = input.val();
	if (null == identity || '' == identity) {
		return;
	}
	if (localTest) {
		var digestUrl = '../examples/' + mode + '-history.xml';
	} else {
		if ('ticket' == mode) {
			var digestUrl = '../' + resolveDeployment(parseQuery())
					+ '/report/ticket/' + identity + '/timestamps';
		} else {
			var digestUrl = '../' + resolveDeployment(parseQuery())
					+ '/report/bundle/' + identity + '/timestamps';
		}
	}
	$.ajax({
		url : digestUrl,
		success : function(data, textStatus, xmlHttpRequest) {
			displayDigests(identity, 'history_display', data, textStatus,
					xmlHttpRequest);
			refreshContents(requestDigest, mode);
		},
		error : function(xmlHttpRequest, textStatus, errorThrown) {
			failedDigest(identity, 'history_display', xmlHttpRequest,
					textStatus, errorThrown);
			refreshContents(requestDigest, mode);
		}
	});
}

function promptForHistory(prompt, mode, initial) {
	$("#search-button").click(function(event) {
		event.preventDefault();
		var query = $('#history_request');
		var value = query.val();
		if ('' == value) {
			query.css("color", "#aaa").val(prompt);
		} else if (prompt != value) {
			hideDigest('history_display');
			requestDigest(mode);
			refreshContents(requestDigest, mode);
		}
	});

	var input = $('#history_request');
	input.click(function() {
		if (prompt == $(this).val()) {
			$(this).val('').css("color", "#333");
		}
		if (null != timer) {
			clearTimeout(timer);
			timer = null;
		}
	});
	if (null == initial || '' == initial) {
		input.css("color", "#aaa").val(prompt);
	} else {
		input.val(initial).css("color", "#333");
		$("#search-button").click();
	}
}