var $SCRIPT_ROOT = {{ request.script_root|tojson|safe }};

//var currentPosition = {lat: -30, lng: 150}
var currentPosition;
var myLatLng;
var polyCoordinates;
var poly;
function update_map() {
    $.getJSON($SCRIPT_ROOT + '/updateMap', {}, function(data) {
      //console.log(data.result);
      currentPosition = {lat: data.a, lng: data.b};
      myLatLng = {lat: data.a, lng: data.b};
});
}
/*
function get_data() {
      $.getJSON($SCRIPT_ROOT + '/data', {dt:"startingPoint"}, function(data) {
        //console.log(data.result);
        myLatLng = {lat: data.a, lng: data.b};
        //alert("1"+myLatLng);
        currentPosition = myLatLng;
        polyCoordinates = [];
        console.log(polyCoordinates);
  });
}
*/
function get_data() {
  $.getJSON($SCRIPT_ROOT + '/data', {dt:"prevPoints"}, function(data) {
    //console.log(data.result);
    //alert(data.results);
    myLatLng = data.results.slice(-1)[0];
    alert("1"+myLatLng);
    currentPosition = myLatLng;
  });
  return myLatLng;
}

function reset() {
  $.getJSON($SCRIPT_ROOT + '/reset', {}, function(data) {
    alert("resetting?")
    //console.log(data.result);
    marker.setMap(null);
    poly.setPath(null);
  });
}

function get_previous_points() {
  $.getJSON($SCRIPT_ROOT + '/data', {dt:"prevPoints"}, function(data) {
    //console.log(data.result);
    polyCoordinates = data.results;
    //alert("1"+myLatLng);
    console.log(polyCoordinates);
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