
//var myLatLng = {lat: -25.363, lng: 131.044};
//
//var polyCoordinates = [
//  {lat: -25.363, lng: 131.044}
//];
//var poly;
//while (!myLatLng) {]
//}

function initMap() {
  //alert("2"+myLatLng);
  myLatLng = get_data();

  if (myLatLng == null) {
    myLatLng = get_data();
    alert("u dun gufed")
  }
  //alert(myLatLng);
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: get_data()
  });
  console.log(map);
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
}

