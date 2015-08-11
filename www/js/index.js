var Ptver = {
  View: {},
  Model: {},
  Collection: {},
  Helper: {
    afterRender: function() {}
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
  ]
};

// Router.
Ptver.Router = Backbone.Router.extend({

  container: null,
  index: null,
  nearby_stops: null,
  broad_next_departures: null,

  routes: {
    "": "handleIndex",
    "nearby-stops-types": "handleNearbyStopsTypes",
    "nearby-stops/:transport_type": "handleNearbyStops",
    "broad-next-departures/:stopid/:transporttypeid": "handleBroadNextDepartures",
    "disruptions": "handleDisruptionCategories",
    "disruptions(/:mode)": "handleDisruptions"
  },

  initialize: function() {
    this.container = new Ptver.View.ContainerView();
  },

  handleIndex: function() {
    this.container.childView = null;
    this.container.render();
  },

  handleNearbyStops: function(transport_type) {
    navigator.geolocation.getCurrentPosition(function(position) {
      localStorage.ptver_device_latitude = position.coords.latitude;
      localStorage.ptver_device_longitude = position.coords.longitude;
      var stopsList = new NearbyStopsCollection({transport_type: transport_type, latitude: position.coords.latitude, longitude: position.coords.longitude});
      var nearbyStopsView = new NearbyStopsView({collection: stopsList});
      stopsList.fetch();
    });
  },

  handleNearbyStopsTypes: function() {
    var template = _.template($("#nearby-stops-types-template").html());
    $("#container-view").html(template({}));
  },

  handleBroadNextDepartures: function(stopid, transporttypeid) {
    var departures = new BroadNextDepartureCollection({transportTypeId: transporttypeid, stopId: stopid});
    var broadNextDepartureView = new BroadNextDeparturesView({collection: departures});
    departures.fetch();
  },

  handleDisruptionCategories: function() {
    var template = _.template($("#disruption-categories-template").html());
    $("#container-view").html(template({}));
  },

  handleDisruptions: function(mode) {
    var disruptions = new DisruptionsCollection({mode: mode});
    var disruptionsView = new DisruptionsView({collection: disruptions});
    disruptions.populate();
  }
});

// Container view.
Ptver.View.ContainerView = Backbone.View.extend({

  el: $("#container-view"),

  template: _.template($("#index-template").html()),

  childView: null,

  render: function() {
    var that = this;

    // Always perform API health check.
    $.get(PTVTimetableAPI.healthCheck(), function(response) {

      if (_.every(response, _.identity)) {

        if (that.childView == null) {
          that.$el.html(that.template({}));
        }
        else {
          that.$el.html(that.childView.$el);
        }

      }
      else {
        that.$el.html(_.template($("#ptv-service-down-template").html()));
      }
    });
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

var NearbyStopsView = Backbone.View.extend({
  el: Ptver.appContainer,

  template: _.template($("#nearby-stops-template").html()),

  initialize: function() {
    this.listenTo(this.collection, 'sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({nearby_stops: this.collection.toJSON()}));
    Ptver.Helper.afterRender();
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
    this.url = PTVTimetableAPI.broadNextDepartures(this.transportTypeId, this.stopId, Ptver.numOfBroadNextDepartures)
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

var BroadNextDeparturesView = Backbone.View.extend({

  el: Ptver.appContainer,

  mapContainerWidth: null,

  mapContainerHeight: null,

  template: _.template($("#broad-next-departures-template").html()),

  initialize: function() {
    var that = this;
    this.listenTo(this.collection, 'sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({broad_next_departures: this.collection.toJSON()}));
    Ptver.Helper.afterRender();
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

var DisruptionsView = Backbone.View.extend({

  el: Ptver.appContainer,

  template: _.template($("#disruptions-template").html()),

  initialize: function() {
    this.listenTo(this.collection, 'reset sync', this.render, this);
  },

  render: function() {
    this.$el.html(this.template({disruptions: this.collection.toJSON()}));
    Ptver.Helper.afterRender();
  }
});

(function() {
    document.addEventListener('deviceready', function () {
        StatusBar.overlaysWebView( false );
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();
        navigator.geolocation.getCurrentPosition(function(position) {

        });
    }, false);

    // Start router.
    Ptver.router = new Ptver.Router();
    Backbone.history.start();

    $("#refresh-ptviewer").on("click", function(e) {
      var _route = Backbone.history.getFragment();
      Ptver.router.navigate(_route, {trigger: true, replace: true});
    });

}());

$(".mdl-layout__drawer").on("click", function(e) {
  $(this).removeClass("is-visible");
});


