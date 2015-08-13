var Ptviewer = {
  View: {},
  Model: {},
  Collection: {},
  Helper: {
    afterRender: function() {
      Ptviewer.loader.hide();
    }
  },

  appContainer: $("#container-view"),

  nearbyStopsTypes: ['bus','tram','train','nightrider','vline'],

  numOfBroadNextDepartures: 3,

  disruptionCategories: [
    {key: 'general', name: 'General'},
    {key: 'metro-bus', name: 'Metro bus'},
    {key: 'metro-tram', name: 'Metro tram'},
    {key: 'metro-train', name: 'Metro train'},
    {key: 'regional-bus', name: 'Regional bus'},
    {key: 'regional-coach', name: 'Regional coach'},
    {key: 'regional-train', name: 'Regional train'},
  ],

  loader: $("#ptviewer-loader"),

  connectionState: function (connection) {
    if (connection === undefined) {
      return 'Not in device';
    }

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';
    return states[connection.type];
  }
};

// Router.
Ptviewer.Router = Backbone.Router.extend({

  execute: function(callback, args, name) {

    Ptviewer.loader.show();

    this.handleHeaderActions(name);
    if (callback) callback.apply(this, args);
  },

  routes: {
    "debug": "handleDebug",
    "": "handleIndex",
    "nearby-stops-types": "handleNearbyStopsTypes",
    "nearby-stops/:transport_type": "handleNearbyStops",
    "broad-next-departures/:stopid/:transporttypeid": "handleBroadNextDepartures",
    "disruptions": "handleDisruptionCategories",
    "disruptions(/:mode)": "handleDisruptions"
  },

  initialize: function() {
    Ptviewer.headerActionView = new Ptviewer.View.HeaderActionsView();
  },

  handleHeaderActions: function(name) {
    if (name == "handleIndex") {
      $("#home-ptviewer, #back-ptviewer").hide();
    } else {
      $("#home-ptviewer, #back-ptviewer").show();
    }
  },

  handleDebug: function() {
    new Ptviewer.View.DebugView();
  },

  handleIndex: function() {
    new Ptviewer.View.IndexView();
  },

  handleNearbyStops: function(transport_type) {
    navigator.geolocation.getCurrentPosition(function(position) {
      localStorage.ptviewer_device_latitude = position.coords.latitude;
      localStorage.ptviewer_device_longitude = position.coords.longitude;
      var stopsList = new NearbyStopsCollection({transport_type: transport_type, latitude: position.coords.latitude, longitude: position.coords.longitude});
      var nearbyStopsView = new Ptviewer.View.NearbyStopsView({collection: stopsList});
      stopsList.fetch();
    });
  },

  handleNearbyStopsTypes: function() {
    new Ptviewer.View.NearbyStopsTypesView();
  },

  handleBroadNextDepartures: function(stopid, transporttypeid) {
    var departures = new BroadNextDepartureCollection({transportTypeId: transporttypeid, stopId: stopid});
    var broadNextDepartureView = new Ptviewer.View.BroadNextDeparturesView({collection: departures});
    departures.fetch();
  },

  handleDisruptionCategories: function() {
    new Ptviewer.View.DisruptionCategoriesView();
  },

  handleDisruptions: function(mode) {
    var disruptions = new DisruptionsCollection({mode: mode});
    var disruptionsView = new Ptviewer.View.DisruptionsView({collection: disruptions});
    disruptions.populate();
  }
});

// Index view.
Ptviewer.View.IndexView = Backbone.View.extend({

  el: $("#container-view"),

  template: _.template($("#index-template").html()),

  initialize: function() {
    this.render();
  },

  render: function() {
    var that = this;
    // Always perform API health check.
    $.get(PTVTimetableAPI.healthCheck(), function(response) {
      if (_.every(response, _.identity)) {
        that.$el.html(that.template({}));
      }
      else {
        that.$el.html(_.template($("#ptv-service-down-template").html()));
      }
    });
    Ptviewer.Helper.afterRender();
  }
});

// Index view.
Ptviewer.View.HeaderActionsView = Backbone.View.extend({

  el: $("#header-actions"),

  hideHeaderButton: false,

  template: _.template($("#header-actions-template").html()),

  events: {
    "click #home-ptviewer": "onClickHeaderHomeButton",
    "click #back-ptviewer": "onClickHeaderBackButton",
    "click #refresh-ptviewer": "onClickHeaderRefreshButton"
  },

  onClickHeaderHomeButton: function(e) {
    Ptviewer.router.navigate("", {trigger: true, replace: true});
  },

  onClickHeaderBackButton: function(e) {
    window.history.back();
  },

  onClickHeaderRefreshButton: function(e) {
    Backbone.history.loadUrl();
  },

  initialize: function(options) {
    this.render();
  },

  render: function() {
    this.$el.html(this.template({}));
  }
});

// Nearby stops.
var NearbyStop = Backbone.Model.extend({
  defaults: {
    suburb: null,
    transport_type: null,
    stop_id: null,
    location_name: null,
    lat: null,
    lon: null,
    distance: null
  }
});

var NearbyStopsCollection = Backbone.Collection.extend({
  model: NearbyStop,
  transport_type: null,
  url: null,

  initialize: function(options) {
    this.transport_type = options.transport_type;
    this.url = PTVTimetableAPI.stopsNearby(options.latitude, options.longitude);
  },

  parse: function(response) {

    var _stopList = _.pluck(response, 'result');

    _stopList = _.where(_stopList, {transport_type: this.transport_type});

    return _stopList;
  }
});

Ptviewer.View.NearbyStopsView = Backbone.View.extend({
  el: Ptviewer.appContainer,

  template: _.template($("#nearby-stops-template").html()),

  initialize: function() {
    this.listenTo(this.collection, 'sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({nearby_stops: this.collection.toJSON()}));
    Ptviewer.Helper.afterRender();
  }
});

Ptviewer.View.NearbyStopsTypesView = Backbone.View.extend({

  el: $("#container-view"),

  template: _.template($("#nearby-stops-types-template").html()),

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(this.template({}));
    Ptviewer.Helper.afterRender();
  }
});

// Broad next departures.
var BroadNextDeparture = Backbone.Model.extend({
  defaults: {
    line_id: null,
    line_name: null,
    direction_id: null,
    direction_name: null,
    transport_type: null,
    scheduled_time: null,
  }
});

var BroadNextDepartureCollection = Backbone.Collection.extend({

  model: BroadNextDeparture,

  transportTypeId: null,

  stopId: null,

  url: null,

  initialize: function(options) {
    this.transportTypeId = options.transportTypeId;
    this.stopId = options.stopId;
    this.url = PTVTimetableAPI.broadNextDepartures(this.transportTypeId, this.stopId, Ptviewer.numOfBroadNextDepartures)
  },

  parse: function(response) {
    var departures = _.reduce(response.values, function(memo, item) {
      memo.push({
        line_id: item.platform.direction.line.line_id,
        line_name: item.platform.direction.line.line_name,
        direction_id: item.platform.direction.direction_id,
        direction_name: item.platform.direction.direction_name,
        transport_type: item.run.transport_type,
        scheduled_time: moment(item.time_timetable_utc, moment.ISO_8601).format("HH:mm:ss")
      });
      return memo;
    }, []);

    var departures_sort = _.sortBy(
      _.sortBy(departures, function(i) {
        return i.direction_id;
      }), function(i) {
      return i.line_id;
    });

    return departures_sort;
  }
});

  Ptviewer.View.BroadNextDeparturesView = Backbone.View.extend({

  el: Ptviewer.appContainer,

  mapContainerWidth: null,

  mapContainerHeight: null,

  template: _.template($("#broad-next-departures-template").html()),

  initialize: function() {
    var that = this;
    this.listenTo(this.collection, 'sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({broad_next_departures: this.collection.toJSON()}));
    Ptviewer.Helper.afterRender();
  }

});

// Disruptions.
var Disruption = Backbone.Model.extend({
  defaults: {
    mode: null,
    title: null,
    url: null,
    description: null,
    publishedOn: null,
  }
});

var DisruptionsCollection = Backbone.Collection.extend({

  mode: null,

  model: Disruption,

  url: null,

  initialize: function(options) {
    this.mode = options.mode;
  },

  populate: function() {
    this.url = PTVTimetableAPI.disruptions([this.mode]);
    var that = this;
    this.fetch({remove: true});
  },

  parse: function(response) {
    var _one_month_ago = moment().subtract(1, 'months');
    var _disruptions = _.reduce(response, function(memo, value, key) {
      _.each(value, function(v, k) {
        if (moment(v.publishedOn, moment.ISO_8601).isAfter(moment().subtract(1, 'months'))) {
          v.mode = key;
          v.publishedOn = moment(v.publishedOn, moment.ISO_8601).format("MMM D h:mmA");
          memo.push(v);
        }
      });
      return memo;
    }, []);

    return _disruptions;
  }
});

Ptviewer.View.DisruptionsView = Backbone.View.extend({

  el: Ptviewer.appContainer,

  template: _.template($("#disruptions-template").html()),

  initialize: function() {
    this.listenTo(this.collection, 'reset sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({disruptions: this.collection.toJSON()}));
    Ptviewer.Helper.afterRender();
  }
});

Ptviewer.View.DisruptionCategoriesView = Backbone.View.extend({

  el: $("#container-view"),

  template: _.template($("#disruption-categories-template").html()),

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(this.template({}));
    Ptviewer.Helper.afterRender();
  }
});

Ptviewer.View.DebugView = Backbone.View.extend({
  el: $("#container-view"),

  template: _.template($("#ptviewer-debug-template").html()),

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(this.template({connectionState: Ptviewer.connectionState(navigator.connection)}));
    Ptviewer.Helper.afterRender();
  }
});

Ptviewer.View.NoInternetView = Backbone.View.extend({
  el: $("#container-view"),

  template: _.template($("#ptviewer-no-internet-template").html()),

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(this.template({}));
    Ptviewer.Helper.afterRender();
  }
});

(function() {

    FastClick.attach(document.body);

    document.addEventListener('deviceready', function () {
      StatusBar.overlaysWebView( false );
      StatusBar.backgroundColorByHexString('#ffffff');
      StatusBar.styleDefault();

      document.addEventListener("offline", function() {
        navigator.notification.alert(
          "Device is offline",
          function() { new Ptviewer.View.NoInternetView(); },
          "Alert",
          "OK"
        );
      }, false);
    }, false);

    // Start router.
    Ptviewer.router = new Ptviewer.Router();
    Backbone.history.start();

}());

$(".mdl-layout__drawer").on("click", function(e) {
  $(this).removeClass("is-visible");
});


