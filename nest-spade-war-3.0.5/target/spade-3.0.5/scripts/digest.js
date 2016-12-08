var millsInMin = 60 * 1000;
var millsInHour = 60 * millsInMin;

/*
 * Converts an XML timestamp into a JavaScript date
 *
 * param : timestamp
 *           The XML timestamp to convert.
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
        sign = - 1;
    }
    return result + (sign * ((parseInt(z[1] + z[2], 10) * millsInHour) + (parseInt(z[4] + z[5], 10) * millsInMin)));
}


/*
 * Creates a displayable string from a timestamp.
 */
function displayTimestamp(timestamp) {
    var dayName =[ 'Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat'];
    var monthName =[ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var hours = timestamp.getHours();
    if (hours < 10) {
        hours = "0" + hours;
    }
    var minutes = timestamp.getMinutes();
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    return dayName[timestamp.getDay()] + ', ' + monthName[timestamp.getMonth()] + ' ' + timestamp.getDate() + ' ' + timestamp.getFullYear() + ', ' + hours + ':' + minutes;
}


/*
 * Resolves the deployment element of URLs.
 */
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
        return window.location.search.substring(1, window.location.search.length);
    }
    var deployment = parseQuery()[ 'deployment']
    if (null == deployment) {
        var pathArray = window.location.pathname.split('/');
        var deployment = pathArray[pathArray.length - 2];
        if ('pages' == deployment) {
            return "local";
        }
    }
    return deployment;
}


/*
 * Create a set of table rows for the suppied digest
 */
function createGroupForDigest(digest, group, ncols) {
    if ('issued' == group || 'revoked' == group) {
        var timestamp = new Date();
        var entries = $(digest).find(group).find('change');
    } else {
        var timestamp = null;
        var entries = $(digest).find(group).find('item');
    }
    if (0 != entries.length) {
        $.fn.reverse =[].reverse;
        entries.reverse();
    }
    var result = '';
    entries.each(function () {
        if (null == timestamp) {
            var displayedItem = $(this).text();
            var displayedTime = '&nbsp;';
        } else {
            var displayedItem = $(this).find('item').text();
            timestamp.setTime(xmlTimestamp2Date($(this).find('time').text()));
            var displayedTime = displayTimestamp(timestamp)
        }
        if (1 != ncols) {
            var timeElement = '<td\
            class="digest-' + group + '-time">' + displayedTime + '</td>\
            '
        }
        result = result.concat('<tr>\
        <td\
        class="digest-' + group + '-item' + ncols + '">' + displayedItem + '</td>\
        ' + timeElement + '</tr>');
    });
    return result;
}


/*
 * Creates a new table body for the supplied digest
 */
function createBodyForDigest(digest, ncols) {
    var body = '<tbody>';
    body = body + createGroupForDigest(digest, 'existing', ncols);
    body = body + createGroupForDigest(digest, 'issued', ncols);
    body = body + createGroupForDigest(digest, 'pending', ncols);
    body = body + createGroupForDigest(digest, 'revoked', ncols);
    body = body + '</tbody>';
    return body;
}


/*
 * Displays the contents of the supplied digest in a table.
 */
function displayDigest(item, tableId, title, digest, ncols) {
    var table = $('#' + tableId);
    var subject = table.find('.digest-subject');
    var displayedTitle = null;
    var digestSubject = digest.find('subject').text();
    if (null == title) {
        if (0 == digestSubject.length) {
            displayedTitle = item;
        } else {
            displayedTitle = digestSubject.text();
        }
    } else {
        displayedTitle = title;
    }
    subject.text(displayedTitle);
    if (0 == digestSubject.length) {
        subject.parent().removeAttr('colspan');
        table.find('tbody').replaceWith(createBodyForNoDigest('No data is available for this item'));
    } else {
        if (1 != ncols) {
            subject.parent().attr('colspan', ncols);
        } else {
            subject.parent().removeAttr('colspan');
        }
        
        table.find('tbody').replaceWith(createBodyForDigest(digest, ncols));
        table.find('.digest-pending-time').each(function () {
        });
    }
    
    var panel = table.parent();
    if (! panel.hasClass('showing')) {
        panel.show();
        panel.addClass('showing');
    }
}


/*
 * Displays the contents of the supplied list of digests in a series of tables.
 */
function displayDigests(item, tableId, data, textStatus, xmlHttpRequest) {
    digests = $(data).find("digest");
    if (0 == digests.length) {
        failedDigest(item, tableId, xmlHttpRequest, textStatus, null);
        return;
    }
    if (1 == digests.length) {
        ncols = 2;
        displayDigest(item, tableId, item, digests, ncols);
        return;
    }
    var subject = $('#' + tableId + ' thead tr th .digest-subject');
    subject.parent().removeAttr('colspan');
    subject.text(item);
    var table = $('#' + tableId);
    var body = '<tbody style="font-size:1.34em;">';
    digests.each(function () {
        var digestSubject = $(this).find('subject');
        ncols = 2;
        if (1 == ncols) {
            var colattr = '';
        } else {
            colattr = ' colspan="' + ncols + '"'
        }
        body = body + '<tr>\
        <td>\
        <table class="digest-display">\
        <thead>\
        <tr>\
        <th' + colattr + '><span class="digest-subject">' + digestSubject.text() + '</span></th>\
        </tr>\
        </thead>\
        ' + createBodyForDigest($(this), ncols) + '\
        </table>\
        </td>\
        <tr>\
        ';
    });
    body = body + '</tbody>';
    table.find('tbody').replaceWith(body);
    
    var panel = table.parent();
    if (! panel.hasClass('showing')) {
        panel.show();
        panel.addClass('showing');
    }
}


/*
 * Creates a new table body for when there is no digest available
 */
function createBodyForNoDigest(message) {
    var body = '<tbody>\
    <tr>\
    <td class="digest-not-available">' + message + '</td>\
    </tr>\
    </tbody>';
    return body;
}


/*
 * Displays informationm about a failed digest request.
 */
function failedDigest(item, tableId, xmlHttpRequest, textStatus, errorThrown) {
    table = $('#' + tableId);
    subject = table.find('.digest-subject');
    subject.parent().removeAttr('colspan');
    subject.text(item);
    if (xmlHttpRequest.status) {
        table.find('tbody').replaceWith(createBodyForNoDigest('No data is available for this item'));
    } else {
        table.find('tbody').replaceWith(createBodyForNoDigest('Failed to get data for this item'));
    }
    
    var panel = table.parent();
    if (! panel.hasClass('showing')) {
        panel.show();
        panel.addClass('showing');
    }
}

/*
 * Hides the Digest that is currently displayed.
 */
function hideDigest(tableId) {
    table = $('#' + tableId);
    var panel = table.parent();
    if (panel.hasClass('showing')) {
        panel.hide();
        panel.removeClass('showing');
    }
}