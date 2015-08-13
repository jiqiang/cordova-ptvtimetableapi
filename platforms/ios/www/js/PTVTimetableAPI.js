var PTVTimetableAPI = {

    _developerId: '1000433',

    _securityKey: '3e644583-fced-11e4-9dfa-061817890ad2',

    _transport_types: {'train': 0, 'tram': 1, 'bus': 2, 'vline': 3, 'nightrider': 4},

    _baseUrl: 'http://timetableapi.ptv.vic.gov.au',

    _healthCheckAPI: '/v2/healthcheck',

    _stopsNearbyAPI: '/v2/nearme/latitude/@lat/longitude/@long',

    _broadNextDeparturesAPI: '/v2/mode/@mode/stop/@stop/departures/by-destination/limit/@limit',

    _disruptionsAPI: '/v2/disruptions/modes/@modes',


    _hash: function(request) {
        var shaObj = new jsSHA("SHA-1", "TEXT");
        shaObj.setHMACKey(this._securityKey, "TEXT");
        shaObj.update(request);
        return shaObj.getHMAC("HEX");
    },

    _call: function(request, data) {
        data.devid = this._developerId;
        var signature = this._hash(request + '?' + this._httpBuildQuery(data));
        data.signature = signature;

        return this._baseUrl + request + '?' + _.reduce(data, function(memo, value, key) {
          memo.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
          return memo;
        }, []).join('&');

    },

    _httpBuildQuery: function(data) {
        return _.reduce(data, function(memo, value, key) {
          memo.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
          return memo;
        }, []).join('&');
    },

    setSecurityKey: function(securityKey) {
        this._securityKey = securityKey;
    },

    setDeveloperId: function(developerId) {
        this._developerId = developerId;
    },

    get_transport_type_id: function(tt) {
      return _.propertyOf(this._transport_types)(tt);
    },

    healthCheck: function() {
        var data = {timestamp: moment().format()};
        var _api = this._healthCheckAPI;
        return this._call(_api, data);
    },

    stopsNearby: function(lat, lng) {
        var _api = this._stopsNearbyAPI.replace(/@lat/g, lat).replace(/@long/g, lng);
        return this._call(_api, {});
    },

    broadNextDepartures: function(mode, stop, limit) {
        var _api = this._broadNextDeparturesAPI.replace(/@mode/g, mode).replace(/@stop/g, stop).replace(/@limit/g, limit);
        return this._call(_api, {});
    },

    disruptions: function(modes) {
        if (!_.isArray(modes) || modes.length == 0) {
            modes = [
                'general',
                'metro-bus',
                'metro-train',
                'metro-tram',
                'regional-bus',
                'regional-coach',
                'regional-train'
            ];
        }
        var _api = this._disruptionsAPI.replace(/@modes/g, modes.join(','));
        return this._call(_api, {});
    }
};
