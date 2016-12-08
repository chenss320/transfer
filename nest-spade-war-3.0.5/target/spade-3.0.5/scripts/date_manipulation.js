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
    if ( '' == x) {
        return null;
    }
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
 *
 * param : timestamp
 *           The JavaScript timestamp to convert.
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