(function() {
    document.addEventListener('deviceready', function () {
        StatusBar.overlaysWebView( false );
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();


    }, false);
}());

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
    e.preventDefault();
    navigator.geolocation.getCurrentPosition(
        function(position) {
            alert(position.coords.latitude + ',' + position.coords.longitude);
        },
        function(error) {
            console.log(error);
        });
});

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
        return {url: baseUrl + request, data: data};
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
        return _call(healthCheckAPI, data);
    }
};

var APIHealthStatus = Backbone.Model.extend({
    defaults: {
        clientClockOK: false,
        databaseOK: false,
        memcacheOK: false,
        securityTokenOK: false,
    }
});

var APIHealthStatusView = Backbone.View.extend({
    el: $('#ptv-timetable-api-health-status'),

    template: _.template($('#ptv-timetable-api-health-status-tmpl').html()),

    initialize: function() {
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
    }
});

$(document).on('pagecontainershow', function(event, ui){
    if (ui.toPage[0].id == "two") {

        var api = new PTVTimetableAPI(localStorage.securityKey, localStorage.developerId);
        var _healthCheck = api.healthCheck();
        Backbone.ajax({
            dataType: "json",
            url: _healthCheck.url,
            data: _healthCheck.data,
            success: function(response) {
                var healthStatus = new APIHealthStatus(response);
                var healthStatusView = new APIHealthStatusView({model: healthStatus});
                healthStatusView.render();
            }
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

//'3e644583-fced-11e4-9dfa-061817890ad2', '1000433'
