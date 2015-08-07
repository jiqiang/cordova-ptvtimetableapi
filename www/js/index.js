var Ptver = {
  View: {},
  Model: {},
  Collection: {},
  Helper: {
    afterRender: function() {
      if ($("ul.filter-list").length) {
        componentHandler.upgradeElement($("ul.filter-list")[0]);
      }

      if ($("[for='filter-switch']").length) {
        componentHandler.upgradeElement($("[for='filter-switch']")[0]);
      }
    }
  },

  appContainer: $("#container-view")
};

// Router.
Ptver.Router = Backbone.Router.extend({

  container: null,
  index: null,
  nearby_stops: null,
  broad_next_departures: null,

  routes: {
    "": "handleIndex",
    "nearby-stops": "handleNearbyStops",
    "broad-next-departures/:stopid/:transporttypeid": "handleBroadNextDepartures",
    "disruptions(/:mode)": "handleDisruptions"
  },

  initialize: function() {
    this.container = new Ptver.View.ContainerView();
  },

  handleIndex: function() {
    this.container.childView = null;
    this.container.render();
  },

  handleNearbyStops: function() {
    var that = this;
    navigator.geolocation.getCurrentPosition(function(position) {
      var endPoint = PTVTimetableAPI.stopsNearby(position.coords.latitude, position.coords.longitude);
      var stopsList = new NearbyStopsCollection();
      stopsList.url = endPoint;
      stopsList.reset();
      that.container.childView = new NearbyStopsView({collection: stopsList});
      that.container.render();
    });
  },

  handleBroadNextDepartures: function(stopid, transporttypeid) {
    var departures = new BroadNextDepartureCollection();
    departures.url = PTVTimetableAPI.broadNextDepartures(transporttypeid, stopid, 3);
    departures.reset();
    this.container.childView = new BroadNextDeparturesView({collection: departures});
    this.container.render();
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
    this.listenTo(this.collection, 'reset add change remove update sync', this.render, this);
    this.collection.fetch();
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
    this.listenTo(this.collection, 'reset add change remove update sync', this.render, this);
    this.collection.fetch();
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
    if (this.mode == null) {
      this.url = PTVTimetableAPI.disruptions([]);
      var that = this;
      this.fetch({remove: true}).then(function() {
        localStorage.ptver_disruptions = JSON.stringify(that.toJSON());
      });
    }
    else {
      var _dps = JSON.parse(localStorage.ptver_disruptions);
      this.reset(_.where(_dps, {mode: this.mode}));
    }
  },

  parse: function(response) {
    var _one_month_ago = moment().subtract(1, 'months');
    var _disruptions = _.reduce(response, function(memo, value, key) {
      _.each(value, function(v, k) {
        if (moment(v.publishedOn, moment.ISO_8601).isAfter(moment().subtract(1, 'months'))) {
          v.mode = key;
          v.publishedOn = moment(v.publishedOn, moment.ISO_8601).format("YYYY-MM-DD HH:mm:ss");
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

}());

$(".mdl-layout__drawer").on("click", function(e) {
  $(this).removeClass("is-visible");
});


