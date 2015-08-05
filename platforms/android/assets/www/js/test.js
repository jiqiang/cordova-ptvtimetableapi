// Router.
var appRouter = Backbone.Router.extend({

  container: null,
  index: null,
  nearby_stops: null,
  broad_next_departures: null,

  routes: {
    "": "handleIndex",
    "nearby-stops": "handleNearbyStops",
    "broad-next-departures/:stopid/:transporttypeid": "handleBroadNextDepartures"
  },

  initialize: function() {
    $("#preloader").hide();
    this.container = new ContainerView();
  },

  handleIndex: function() {
    this.container.childView = null;
    this.container.render();
  },

  handleNearbyStops: function() {
    $("#preloader").show();
    var that = this;
    navigator.geolocation.getCurrentPosition(function(position) {
      var endPoint = PTVTimetableAPI.stopsNearby(position.coords.latitude, position.coords.longitude);
      var stopsList = new NearbyStopsCollection();
      stopsList.url = endPoint;
      stopsList.reset();
      that.container.childView = new NearbyStopsView({collection: stopsList});
      that.container.render();
      $("#preloader").hide();
    });
  },

  handleBroadNextDepartures: function(stopid, transporttypeid) {
    $("#preloader").show();
    var departures = new BroadNextDepartureCollection();
    departures.url = PTVTimetableAPI.broadNextDepartures(transporttypeid, stopid, 3);
    departures.reset();
    this.container.childView = new BroadNextDeparturesView({collection: departures});
    this.container.render();
    $("#preloader").hide();
  }

});

// Container view.
var ContainerView = Backbone.View.extend({

  el: $("#container-view"),

  template: _.template($("#index-template").html()),

  childView: null,

  render: function() {
    if (this.childView == null) {
      this.$el.html(this.template({}));
    }
    else {
      this.$el.html(this.childView.$el);
    }
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
  url: null,
  parse: function(response) {

    var _stopList = _.reduce(response, function(memo, item) {
      memo.push(item.result);
      return memo;
    }, []);

    _stopList = _.sortBy(_stopList, "transport_type");
    return _stopList;
  }
});

var NearbyStopsView = Backbone.View.extend({

  template: _.template($("#nearby-stops-template").html()),
  initialize: function() {
    this.listenTo(this.collection, 'reset add change remove', this.render, this);
    this.collection.fetch();
  },
  render: function() {
    this.$el.html(this.template({nearby_stops: this.collection.toJSON()}));
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
  url: null,
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

  template: _.template($("#broad-next-departures-template").html()),
  initialize: function() {
    this.listenTo(this.collection, 'reset add change remove', this.render, this);
    this.collection.fetch();
  },
  render: function() {
    this.$el.html(this.template({broad_next_departures: this.collection.toJSON()}));
  }
});

// Start router.
router = new appRouter();
Backbone.history.start();


(function() {
    document.addEventListener('deviceready', function () {
        StatusBar.overlaysWebView( false );
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();

        navigator.geolocation.getCurrentPosition(function(position) {

        });

    }, false);
}());

$(".mdl-layout__drawer").on("click", function(e) {
  $(this).removeClass("is-visible");
});
