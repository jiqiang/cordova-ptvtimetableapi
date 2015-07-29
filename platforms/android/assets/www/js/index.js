var PTVTimetableAPI = function(securityKey, developerId) {
    var date, baseUrl, healthCheckAPI;
    date = new Date();
    baseUrl = 'http://timetableapi.ptv.vic.gov.au';
    healthCheckAPI = '/v2/healthcheck';

    var _hash = function(request) {
        var shaObj = new jsSHA("SHA-1", "TEXT");
        shaObj.setHMACKey(securityKey, "TEXT");
        shaObj.update(request);
        return shaObj.getHMAC("HEX");
    }
    var _call = function(request, data) {
        data.devid = developerId;
        var signature = _hash(request + '?' + _httpBuildQuery(data));
        data.signature = signature;
        $.get(baseUrl + request, data, function(response) {
            console.log(response);
        }, 'json');
    }

    var _httpBuildQuery = function(data) {
        var ret = [];
        for (var d in data) {
            ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
        }
        return ret.join('&');
    }

    this.healthCheck = function() {
        var data = {timestamp: date.toISOString()};
        _call(healthCheckAPI, data);
    }
};

var api = new PTVTimetableAPI('3e644583-fced-11e4-9dfa-061817890ad2', '1000433');
api.healthCheck();

