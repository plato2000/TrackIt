//var currentPosition = {lat: -30, lng: 150}
var currentPosition;
var myLatLng;
var polyCoordinates;
var poly;
function update_map() {
  $.getJSON($SCRIPT_ROOT + '/updateMap', {}, function(data) {
    currentPosition = {lat: data.a, lng: data.b};
    myLatLng = {lat: data.a, lng: data.b};
  });
}

function get_data() {
      $.getJSON($SCRIPT_ROOT + '/data', {dt:"prevPoints"}, function(data) {
        //console.log(data.result);
        //alert(data.results);
        myLatLng = data.results.slice(-1)[0];
        //alert("getting_data : "+myLatLng);
        currentPosition = myLatLng;
  });
  return myLatLng;
}

function reset() {
      $.getJSON($SCRIPT_ROOT + '/reset', {}, function(data) {
        //alert("resetting?")
        //console.log(data.result);
        marker.setMap(null);
        poly.setPath([]);
        get_data();
        setTimeout(map.setCenter(myLatLng),100);
  });
}

function get_previous_points() {
  $.getJSON($SCRIPT_ROOT + '/data', {dt:"prevPoints"}, function(data) {
        //console.log(data.result);
        polyCoordinates = data.results;
        //alert("1"+myLatLng);
        // console.log(polyCoordinates);
        var path = poly.getPath();
        // add new point
        var arrayLength = polyCoordinates.length;
        for (var i = 0; i < arrayLength; i++) {
          path.push(new google.maps.LatLng(polyCoordinates[i].lat, polyCoordinates[i].lng));
          //Do something
        }
        poly.setPath(path);
  });
}

function real_init() {
  myLatLng = get_data();
  setTimeout(initMap,500);
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: myLatLng
  });
  // console.log(map);
  marker = new google.maps.Marker({
    position: myLatLng,
    map: map,
    title: 'Hello World!'
  });

  poly = new google.maps.Polyline({
    path: [],
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2
  });

  poly.setMap(map);
  get_previous_points();
  setLocationName("", 40.714224,-73.961452);
}

function center() {
  map.setCenter(myLatLng);
}

function locationCallback(id, lat, lng) {
  return function(results, status) {
    if (status !== google.maps.GeocoderStatus.OK) {
        if(status == "OVER_QUERY_LIMIT") {
          // console.log(status);
          setTimeout(function() {
            setLocationName(id, lat, lng);
          }, 300);
          return;
        }
        // alert(status + " " + results);
        if($(id).text() == "Loading...") {
          $(id).text("No name for location.");
        }
      }
      // This is checking to see if the Geoeode Status is OK before proceeding
      if (status == google.maps.GeocoderStatus.OK) {
          // console.log(results);
          var address = (results[0].formatted_address);
          //console.log("id: " + id);
          $(id).text(address);
          //console.log("address: " + address);
      }
  };
}


// Uses reverse geocoding to get human-readable name for coordinates
function setLocationName(id, lat, lng) {
    var latlng = new google.maps.LatLng(lat, lng);
    // This is making the Geocode request
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'latLng': latlng }, locationCallback(id, lat, lng));
}

