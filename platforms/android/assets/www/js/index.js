$(document).ajaxStart(function() {$.mobile.loading('show');});

$(document).ajaxStop(function() {$.mobile.loading('hide');});

window.setInterval(function() {
    var date = new Date();
    $(document).find("div[data-role='header'] > h1").html(moment().format("HH:mm:ss"));
}, 1000);

$(document).on('click', 'div.do-back', function(e) {
    $.mobile.back();
});

$(document).on('click', 'div.do-refresh', function(e) {
    $.mobile.loading("show");
    navigator.geolocation.getCurrentPosition(saveToLocalStorage);
});

var saveToLocalStorage = function(position) {
    localStorage.latitude = position.latitude;
    localStorage.longitude = position.longitude;
    $.mobile.loading("hide");
}

var PTVTimetableAPI_old = function(securityKey, developerId) {
    var date, baseUrl, healthCheckAPI;
    date = new Date();
    baseUrl = 'http://timetableapi.ptv.vic.gov.au';
    healthCheckAPI = '/v2/healthcheck';
    stopsNearbyAPI = '/v2/nearme/latitude/@lat/longitude/@long';
    broadNextDeparturesAPI = '/v2/mode/@mode/stop/@stop/departures/by-destination/limit/@limit';

    var _hash = function(request) {
        var shaObj = new jsSHA("SHA-1", "TEXT");
        shaObj.setHMACKey(securityKey, "TEXT");
        shaObj.update(request);
        return shaObj.getHMAC("HEX");
    };

    var _call = function(request, data) {
        data.devid = developerId;
        var signature = _hash(request + '?' + _httpBuildQuery(data));
        data.signature = signature;
        return {url: baseUrl + request, data: data};
    };

    var _httpBuildQuery = function(data) {
        var ret = [];
        for (var d in data) {
            ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
        }
        return ret.join('&');
    };

    this.healthCheck = function() {
        var data = {timestamp: date.toISOString()};
        var _api = healthCheckAPI;
        return _call(_api, data);
    };

    this.stopsNearby = function(lat, lng) {
        var _api = stopsNearbyAPI.replace(/@lat/g, lat).replace(/@long/g, lng);
        return _call(_api, {});
    };

    this.broadNextDepartures = function(mode, stop, limit) {
        var _api = broadNextDeparturesAPI.replace(/@mode/g, mode).replace(/@stop/g, stop).replace(/@limit/g, limit);
        return _call(_api, {});
    };
};

var showIndexOptions = function(latitude, longitude) {
    var indexOptions = [
        ['find train stops nearby', '#stopsnearby'],
        ['show page two', '#two']
    ];

    var list = $('<ul>').attr('data-role', 'listview').appendTo($('#index-options'));
    _.each(indexOptions, function(i) {
        var li = $('<li>').appendTo(list);
        var a = $('<a>').attr('href', i[1]).text(i[0]).appendTo(li);
    });

    $("[data-role='listview']").listview().listview('refresh');
}

$(document).on('pagecontainershow', function(event, ui){

    var api = new PTVTimetableAPI('3e644583-fced-11e4-9dfa-061817890ad2', '1000433');

    if (ui.toPage[0].id == "index") {
        if ($('#index-options ul').length > 0) {
            return;
        }

        $.mobile.loading('show');

        if (localStorage.latitude != undefined && localStorage.longitude != undefined) {
            showIndexOptions(localStorage.latitude, localStorage.longitude);
            $.mobile.loading('hide');
        }
        else {
            navigator.geolocation.getCurrentPosition(function(position) {
                localStorage.latitude = position.coords.latitude;
                localStorage.longitude = position.coords.longitude;

                showIndexOptions(localStorage.latitude, localStorage.longitude);

                $.mobile.loading('hide');
            });
        }
    }
    else if (ui.toPage[0].id == "stopsnearby") {

        if ($('#stops-nearby ul').length > 0) {
            return;
        }

        $.mobile.loading('show');

        var _healthCheck = api.healthCheck();
        $.get(_healthCheck.url, _healthCheck.data, function(response) {}).then(function(healthCheckResponse) {
            if (_.reduce(healthCheckResponse, function(memo, status) { return memo && status; }, true)) {
                console.log('pass health check');
                var _stopsNearby = api.stopsNearby(localStorage.latitude, localStorage.longitude);
                return $.get(_stopsNearby.url, _stopsNearby.data, function(response) {

                    var trainStops = _.filter(response, function(obj) {
                        return obj.result.transport_type == 'train';
                    });

                    var list = $('<ul>').attr('data-role', 'listview').appendTo($('#stops-nearby'));
                    _.each(trainStops, function(obj) {
                        var li = $('<li>').attr('data-stop-id', obj.result.stop_id).appendTo(list);
                        var a = $('<a>').attr('href', '#two').text(obj.result.location_name).appendTo(li);
                    });

                    $("[data-role='listview']").listview().listview('refresh');

                })
            }
            else {
                console.log('health check failed');
            }
        }).then(function(nearbyStops) {
            var trainStops = _.filter(nearbyStops, function(obj) {
                return obj.result.transport_type == 'train';
            });
            var _broadNextDepartures = api.broadNextDepartures(0, trainStops[0].result.stop_id, 2);
            return $.get(_broadNextDepartures.url, _broadNextDepartures.data, function(response) {
                console.log('find broad next departures');
                var broadNextDepartures = _.filter(response.values, function(obj) {
                    return obj.platform.direction.direction_id == 0;
                });

                console.log(broadNextDepartures);
            })
        }).done(function() {
            $.mobile.loading('hide');
        });

    }
});

$(document).on('pagecontainerbeforehide', function(event, ui) {
    if (ui.prevPage[0].id == "one") {
        if (typeof(Storage) !== 'undefined') {
            localStorage.securityKey = ui.prevPage.find("input[name='security_key']").val();
            localStorage.developerId = ui.prevPage.find("input[name='developer_id']").val();
        }
    }
});

(function() {
    document.addEventListener('deviceready', function () {
        StatusBar.overlaysWebView( false );
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();
        refreshLocation();
    }, false);
}());





//'3e644583-fced-11e4-9dfa-061817890ad2', '1000433'
