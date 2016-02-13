/// The contents of the table row which gets added for each new package that is tracked
var DEFAULT_TR_CONTENTS = '<tr class="listRow" id="row{UUID}"><td><span class="glyphicon glyphicon-plus" aria-label="Expand"></span></td><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div><br /><div class="color-container"><input type="hidden" id="color{UUID}" value="{COLOR}"></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p><b>Current location: </b><span id="current{UUID}">{CURRENTLOCATION}</span></p></td><td id="etr{UUID}">{ETA}</td><td><a href="javascript:removeRow(\'{UUID}\')" class="btn btn-raised btn-danger">Stop Tracking</a></td></tr>';

/// The contents of the dropdown row for each package for additional data
var DEFAULT_DROPDOWN_CONTENTS = '<tr class="dropdown-row"><td colspan="7" id="dropdown{UUID}"><p><b>Starting location: </b><span id="start{UUID}">{STARTLOCATION}</span></p><p><b>Distance Remaining: </b><span id="dist{UUID}">{DISTANCE}</span></p><p><b>Destination: </b><span id="dest{UUID}">{DESTLOCATION}</span></p></td></tr>';


var packagesMonitored = [];
var packagesOnMap = [];

var delivered = [];

var packagePositions = {};

var destinations = {};

var colors = {};

var adminMode = false;

var mapLines = {};
var originMapMarkers = {};
var destinationMapMarkers = {};


var contentString1 = '<div id="content">' +
                        '<div id="siteNotice">' +
                        '</div>' +
                     '<h1 id="firstHeading" class="firstHeading">';
var contentString2 = '</h1>' +
                     '<div id="bodyContent">' +
                        '<p>' + 'Location:';
var contentString3 =    '<br>Here since: ';
var contentString4 =    '<br>Elevation: ';
var contentString5 =    '<br>ETR: ';
var contentString6 =    '</p>'+
                    '</div>'+
                    '</div>';


var infowindow;

/// Helper function for replaceAll, which uses regex
//  \param str The string for which to escape RegEx characters
//  \return String with regular expression characters escaped
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/// Replaces all occurrences of 'find' within string 'str' with 'replace'
//  \param str The string to search in
//  \param find The substring to replace
//  \param replace The string to replace find with
//  \return A string in which find is replaced with replace
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

/// Gets a random hex color
//  \return A random hex color of format #xxxxxx
function getRandomColor() {
    return '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
}

/// Uses DEFAULT_TR_CONTENTS and creates HTML for a new table row for a newly tracked package
//  \param uuid The uuid of the package being added to the table
//  \param name The name of the package being added to the table
//  \return An HTML string ready to be put into the webpage - replaced some things in it with real data
function populateRow(uuid, name) {
    if(!adminMode) {
        var newRow = DEFAULT_TR_CONTENTS;
    } else {
        //var newRow = ADMIN_TR_CONTENTS;
        var newRow = DEFAULT_TR_CONTENTS;
    }
    newRow = replaceAll(newRow, '{UUID}', uuid);
    newRow = replaceAll(newRow, '{NAME}', name);
    // Location is updated later, as reverse geocoding is not always instant
    newRow = replaceAll(newRow, '{CURRENTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{COLOR}', colors[uuid]);
    newRow = replaceAll(newRow, '{ETA}', "Loading...");
    return newRow;
}


/// Uses DEFAULT_DROPDOWN_CONTENTS and creates specific HTML for a dropdown row for a newly tracked package
//  \param uuid The uuid of the package for which to generate the dropdown
//  \return An HTML string ready to be put into the page
function populateDropdown(uuid) {
    var newDrop = DEFAULT_DROPDOWN_CONTENTS;
    newDrop = replaceAll(newDrop, '{UUID}', uuid);
    newDrop = replaceAll(newDrop, '{STARTLOCATION}', "Loading...");
    newDrop = replaceAll(newDrop, '{DESTLOCATION}', "Loading...");
    newDrop = replaceAll(newDrop, '{DISTANCE}', "Loading...");
    return newDrop;
}

/// Adds a new row to the table in the page
//  It picks a random color, adds a checkbox for map display, populates a row, and calls the asynchronous
//  Google Maps reverse geocoding lookup for the coordinates for current location, starting location, and destination.
//
//  \param uuid The uuid of the package for which to add a row to the table on the page
//  \param name The name of the package for which to add a row to the table on the page
//  \param start The starting coordinates for the package that is being added to the table
//  \param current The current coordinates for the package
//  \param destination The destination coordinates for the package
function addRow(uuid, name, start, current, dest) {
    var rowToAdd = populateRow(uuid, name);
    var dropDown = populateDropdown(uuid);
    // Adds row to table
    $('#packageTable > tbody:last-child').append(rowToAdd + "\n" + dropDown);
    // Material design JS loads proper styling for checkboxes (has to be loaded every time)
    $.material.checkbox();

    if(packagesOnMap.indexOf(uuid) > -1) {
        $("#checkbox" + uuid).prop("checked", true);
        //console.log("Status of " + "#checkbox" + uuid + ": " + $("#checkbox" + uuid).prop("checked"));
    }

    // Loads color picker
    $("#color" + uuid).minicolors({
        theme: 'default',
        changedelay: 100,
        change: function(value, opacity) {
            // console.log("value: " + value);
            colors[uuid] = value;
            if(uuid in destinationMapMarkers) {
                destinationMapMarkers[uuid].setIcon(pinSymbol(value));
            }
            if(uuid in originMapMarkers) {
                originMapMarkers[uuid].setIcon(pinSymbol(value));
            }
            if(uuid in mapLines) {
                mapLines[uuid].setOptions({strokeColor: value});
            }
            map.setZoom(map.getZoom());
        }

    });

    console.log("uuid: " + uuid);
    $(".dropdown-row").hide();

    // Puts locations in after row is already in (asynchronous)
    setLocationName("#current" + uuid, current);
    setLocationName("#start" + uuid, start);
    setLocationName("#dest" + uuid, dest);
}

// Removes row from table and monitored packages list
function removeRow(uuid) {
    packagesMonitored.splice($.inArray(uuid, packagesMonitored), 1);
    $("#row" + uuid).remove();
    changeMapDisplay(uuid, false);
    //if(packagesOnMap.indexOf(uuid) > -1) {
    //    // console.log("changing display of " + uuid);
    //    changeMapDisplay(uuid, false);
    //}
    packagesOnMap.splice($.inArray(uuid, packagesOnMap), 1);
    if(!adminMode) {
        $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
        $.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
    }
}


/// Adds package to table, monitored list after it's entered into text entry box
//  Does lookup to server's /data with dt=isValidUUID to perform a serverside check for if the uuid entered is valid
//  This is done asynchronously and if it is invalid, it shows an alert and if not, it adds the package to the monitored
//  list of packages.
function addPackageFromTextInput() {
    var uuid = $("#newPackage").val();
    $.ajax({
        type: 'GET',
        url: $SCRIPT_ROOT + '/data',
        dataType: 'json',
        success: function(data) {
            var isValidUUID = data.results;
            if(isValidUUID) {
                $("#newPackage").val("");
                packagesMonitored.push(uuid);
                addPackage(uuid);
            } else {
                $("#invalidUUIDAlert").show();
                $("#invalidUUIDAlert").fadeTo(2000, 500).slideUp(500, function(){
                    $("#invalidUUIDAlert").hide();
                });
            }
        },
        data: {"dt":"isValidUUID", "uuid":uuid},
        async: true
    });
}

/// Generic function to get package data from UUID and add to table. This is used by the load function and the adminLoad
//  function and can be used for loading a list of tracked packages from the server as well.
//  \param uuid The uuid of the package being added to the tracked list
function addPackage(uuid) {
    if(!adminMode) {
        $.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
    }
    $.ajax({
        type: 'GET',
        url: $SCRIPT_ROOT + '/data',
        dataType: 'json',
        success: function(data) {
            var name = data.name;
            var start_coords = new google.maps.LatLng(data.start_coords[0], data.start_coords[1]);
            var end_coords = new google.maps.LatLng(data.end_coords[0], data.end_coords[1]);
            var curr_coords = new google.maps.LatLng(data.curr_coords[0], data.curr_coords[1]);
            destinations[uuid] = end_coords;
            colors[uuid] = getRandomColor();
            addRow(uuid, name, start_coords, curr_coords, end_coords)
            updateData();
        },
        data: {"dt":"initialData", "uuid":uuid},
        async: true
    });
}


/// Converts data results from server to Google Maps coordinates, elevation, and time
//  \param results An array of dictionaries of coordinates, elevation, and time
//  \return An array of dictionaries of Google Maps LatLng objects, elevation, and time
function convertUpdateResults(results) {
    //console.log(results);
    var newResults = [];
    for(var i = 0; i < results.length; i++) {
        newResults.push(
            {
                "coords": new google.maps.LatLng(results[i]['coords'][0], results[i]['coords'][1]),
                "ele": results[i]['ele'],
                "time": results[i]['time']
            }
        );
        // console.log("results[i]['coords']: " + results[i]['coords']);
    }
    return newResults;
}

/// Used to reset scope because this is called from an asynchronous function. Without this, it would always use the
//  last versions of index, concat because they change in a loop.
//  \param index The index in packagesMonitored of the package being updated
//  \param concat Whether to concatenate the results to the end of the array of package positions or to make a new array
function updateCallback(index, concat) {
    return function(data) {
        if(concat) {
            packagePositions[packagesMonitored[index]] = packagePositions[packagesMonitored[index]].concat(convertUpdateResults(data.results));
        } else {
            packagePositions[packagesMonitored[index]] = convertUpdateResults(data.results);
        }
        // console.log("i: " + index);
        // console.log("packagesMonitored[i]: " + packagesMonitored[index]);
        // console.log("packagePositions[^]: " + packagePositions[packagesMonitored[index]]);
        if(data.results.length > 0) {
            setLocationName("#current" + packagesMonitored[index], packagePositions[packagesMonitored[index]].slice(-1)[0]['coords']);
        }
    };
}

/// The callback function for the check if a package is delivered. It calls the updateCallback
//  in order to update the data, since even if it is now delivered, we may not have the latest data. After one run of
//  this with a delivered package, this will not be called again on that package.
//  \param index The index in packagesMonitored of the package being updated
//  \param concat Whether to concatenate the results to the end of the array of package positions or to make a new array
function deliveryCheckCallback(index, concat) {
    return function(data){
        if(data.results) {
            delivered.push(packagesMonitored[index]);
        }
        $.getJSON($SCRIPT_ROOT + '/data', {
            "dt": "getNewPoints",
            "uuid": packagesMonitored[index],
            "time": packagePositions[packagesMonitored[index]].slice(-1)[0]['time']
        }, updateCallback(index, concat));
    };
}

/// The callback function for the receiving of the distance remaining for the package to reach its destination.
//  \param index The index in packagesMonitored of the package being updated
function distCallback(index) {
    return function(data) {
        $("#dist" + packagesMonitored[index]).text(Math.round(data.results / 100) / 10 + " km");
    }
}


/// The callback function for the receiving of the time remaining for the package to reach its destination.
//  \param index The index in packagesMonitored of the package being updated
function etrCallback(index) {
    return function(data) {
        $("#etr" + packagesMonitored[index]).text(moment().add(data.results, 'seconds').calendar());
    }
}

/// Gets new points from server. It performs checks for delivery status, etr, and distance remaining. Then it updates
//  the map after all new data is received.
// TODO: get this to work for only one uuid at a time with optional arg
function updateData() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(!(delivered.indexOf(packagesMonitored[i]) > -1)) {
            if (packagesMonitored[i] in packagePositions) {
                $.ajax({
                    type: 'GET',
                    url: $SCRIPT_ROOT + '/data',
                    dataType: 'json',
                    success: deliveryCheckCallback(i, true),
                    data: {"dt":"isDelivered", "uuid":packagesMonitored[i]},
                    async: true
                });
            } else {
                $.getJSON($SCRIPT_ROOT + '/data', {
                    "dt": "getNewPoints",
                    "uuid": packagesMonitored[i],
                    "time": 0
                }, updateCallback(i, false));
            }
            // console.log("getting etr for " + packagesMonitored[i]);
            $.getJSON($SCRIPT_ROOT + '/data', {
                "dt": "getETR",
                "uuid": packagesMonitored[i]
            }, etrCallback(i));
            $.getJSON($SCRIPT_ROOT + '/data', {
                "dt": "getDistance",
                "uuid": packagesMonitored[i]
            }, distCallback(i));
        } else {
            // console.log(packagesMonitored[i] + " is delivered");
            $("#etr" + packagesMonitored[i]).text("Delivered");
            $("#dist" + packagesMonitored[i]).text("0 km");
        }
    }
    updateMap();
}

/// Sets the monitored packages list to the list it receives (for loading from cookies or another source like the
//  server). It does the same for the packages on the map list.
//  \param packageList The new list of UUIDs of packages
//  \param mapList The new list of UUIDs of packages on the map
function writePackages(packageList, mapList) {
    packagesMonitored = packageList;
    packagesOnMap = mapList;
    // console.log("mapList: " + packagesOnMap);
    for (var i = 0; i < packageList.length; i++) {
        // console.log("adding package " + packageList[i]);
        addPackage(packageList[i]);
    }
}

/// Toggles mode between admin mode and regular user. For now, this is not done with any type of secure communication
//  between the server and client - this could be done later with login tokens. As of now, the admin status is just a
//  JavaScript variable and can be changed with a simple function call. Obviously this will change later.
function changeAdminMode() {
    for(var i = 0; i < packagesOnMap.length; i++) {
        // console.log("removing row " + packagesOnMap[i]);
        removeRow(packagesOnMap[i]);
    }
    adminMode = !adminMode;
    if(!adminMode) {
        $("#loginButton").html("Log in&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        $("#deliveredPackagesButton").html("");
        $("#undeliveredPackagesButton").html("");
        $("#listBody").html("");
        loadFunction();
    } else {
        $("#loginButton").html("Log out&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        $("#deliveredPackagesButton").html("<a href='javascript:addDeliveredPackages()'>Track delivered packages</a>");
        $("#undeliveredPackagesButton").html("<a href='javascript:addUndeliveredPackages()'>Track undelivered packages</a>");
        $("#listBody").html("");
        //adminLoad();
    }
}

/// Creates a path for the map pin of a given hex color
//  \param color The hex color in format #xxxxxx of the pin symbol to be generated
function pinSymbol(color) {
    return {
        //path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#000',
        strokeWeight: 2,
        scale: 1,
        labelOrigin: new google.maps.Point(0, -30)
    };
}

/// Changes visibility of package on map. Called onclick of checkbox on table and on load if package is supposed to be
//  on map.
//  \param id The UUID of the package being changed
//  \param checked Whether or not the checkbox is currently checked (checked for display, unchecked for no display)
function changeMapDisplay(id, checked) {
    // console.log(id);
    // If package is no longer displayed
    if(!checked) {
        // Remove package from on map list
        packagesOnMap.splice($.inArray(id, packagesOnMap), 1);
        // Remove map line from the map
        mapLines[id].setMap(null);
        // Remove markers from map
        destinationMapMarkers[id].setMap(null);
        originMapMarkers[id].setMap(null);
    } else {
        // Put package on the map list
        packagesOnMap.push(id);
    }
    // Doesn't store in cookies if in admin mode so on logout it doesn't keep all the packages
    if(!adminMode) {
        $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
    }
    // Updates data and map to reflect changes if new package added to the map list
    updateData();
}

/// The callback function for the infoWindow for clicking on the map marker
//  \param destination Whether or not the infoWindow is for the destination (to determine where to place the window)
//  \param index The index of the package in packagesOnMap
function infoWindowCallback(destination, index) {
    return function() {
        if(!destination) {
            infowindow.setContent('<div id="content"><p>' + packagesOnMap[index] + '</p></div>');
            infowindow.open(map, originMapMarkers[packagesOnMap[index]]);
        } else {
            infowindow.setContent('<div id="content"><p>' + packagesOnMap[index] + '</p></div>');
            infowindow.open(map, destinationMapMarkers[packagesOnMap[index]]);
        }
    };
}

/// Updates the map view with new coordinates for the line and markers.
//
function updateMap() {
    for (var i = 0; i < packagesOnMap.length; i++) {

        // If the Polyline does not already exist, make a new one
        if (!(packagesOnMap[i] in mapLines)) {
            mapLines[packagesOnMap[i]] = new google.maps.Polyline({
                path: [],
                geodesic: true,
                strokeColor: colors[packagesOnMap[i]],
                strokeOpacity: 1.0,
                strokeWeight: 3
            });
        }
        mapLines[packagesOnMap[i]].setMap(map);

        // If the destination map marker does not already exist, make a new one
        if (!(packagesOnMap[i] in destinationMapMarkers)) {
            destinationMapMarkers[packagesOnMap[i]] = new google.maps.Marker({
                position: destinations[packagesOnMap[i]],
                animation: null,
                title: packagesOnMap[i] + "'s Destination Marker",
                icon: pinSymbol(colors[packagesOnMap[i]]),
                label: {
                    text: 'B'
                }
            });

            // Display an infoWindow with the UUID of the package onclick for the marker
            destinationMapMarkers[packagesOnMap[i]].addListener('click', infoWindowCallback(true, i));
        }
        destinationMapMarkers[packagesOnMap[i]].setMap(map);

        // If there is a starting coordinate and the origin map marker does not exist, make a new one
        if (packagePositions[packagesOnMap[i]] != undefined) {
            if(!(packagesOnMap[i] in originMapMarkers)) {
                originMapMarkers[packagesOnMap[i]] = new google.maps.Marker({
                    position: packagePositions[packagesOnMap[i]][0]['coords'],
                    animation: null,
                    title: packagesOnMap[i] + "'s Origin Marker",
                    icon: pinSymbol(colors[packagesOnMap[i]]),
                    label: {
                        text: 'A'
                    }
                });

                // Display an infoWindow with the UUID of the package onclick for the marker
                originMapMarkers[packagesOnMap[i]].addListener('click', infoWindowCallback(false, i));
                
            }
            originMapMarkers[packagesOnMap[i]].setMap(map);

            // Update the Polyline with new points that are not on it already (by number of points)
            var currentPath = mapLines[packagesOnMap[i]].getPath();
            for (var j = currentPath.length; j < packagePositions[packagesOnMap[i]].length; j++) {
                currentPath.push(packagePositions[packagesOnMap[i]][j]['coords']);
            }
            mapLines[packagesOnMap[i]].setPath(currentPath);
        }
    }
}

/// Callback function for setLocationName. It calls itself in a few seconds if there were too many queries in a short
//  period of time - like if many packages were loaded at once.
//
//  \param id The HTML id of the element to set the new location to
//  \param latlng A Google Maps LatLng object for which to perform reverse geocoding
function locationCallback(id, latlng) {
    return function (results, status) {
        if (status !== google.maps.GeocoderStatus.OK) {
            // console.log("status: " + status + " id: " + id);
            if (status == "OVER_QUERY_LIMIT") {
                // console.log(status);
                setTimeout(function () {
                    setLocationName(id, latlng);
                }, 5000);
                return;
            }
            if ($(id).text() == "Loading...") {
                $(id).text("No name for location.");
            }
        }
        // This is checking to see if the Geocoder Status is OK before proceeding
        if (status == google.maps.GeocoderStatus.OK) {
            // console.log(results);
            var address = (results[0].formatted_address);
            //console.log("id: " + id);
            $(id).text(address);
            //console.log("address: " + address);
        }
    };
}

/// Uses reverse geocoding to get human-readable name for coordinates. It calls the locationCallback to wait for the
//  Google Maps server to respond.
//  \param id The HTML id of the element to set the new location to
//  \param latlng A Google Maps LatLng object for which to perform reverse geocoding
function setLocationName(id, latlng) {
    // console.log("lat: " + latlng.lat() + " lng: " + latlng.lng());
    // This is making the Geocode request
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'latLng': latlng}, locationCallback(id, latlng));
}


/// Adds undelivered packages to packages monitored list if they aren't already there
//
function addUndeliveredPackages() {
    $.getJSON($SCRIPT_ROOT + '/data', {"dt": "undeliveredPackages"}, function(data) {
        // console.log(data.results);
        for(var i = 0; i < data.results.length; i++) {
            if(packagesMonitored.indexOf(data.results[i]) < 0) {
                packagesMonitored.push(data.results[i]);
                addPackage(data.results[i]);
            }
        }
    });
}

/// Adds delivered packages to packages monitored list if they aren't already there
//
function addDeliveredPackages() {
    $.getJSON($SCRIPT_ROOT + '/data', {"dt": "deliveredPackages"}, function(data) {
        // console.log(data.results);
        for(var i = 0; i < data.results.length; i++) {
            if(delivered.indexOf(data.results[i]) < 0) {
                delivered.push(data.results[i]);
            }
            if(packagesMonitored.indexOf(data.results[i]) < 0) {
                packagesMonitored.push(data.results[i]);
                addPackage(data.results[i]);
            }
        }
    });
}

/// Selects all for display on map
//
function selectAll() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) < 0) {
            //packagesOnMap.push(packagesMonitored[i]);
            $("#checkbox" + packagesMonitored[i]).prop("checked", true);
            changeMapDisplay(packagesMonitored[i], true);
        }
    }
}

/// Unselects all packages for display on map
//
function selectNone() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) > -1) {
            $("#checkbox" + packagesMonitored[i]).prop("checked", false);
            changeMapDisplay(packagesMonitored[i], false);
        }
    }
    //packagesOnMap = [];
}

/// Selects all delivered packages for display on map
//
function selectDelivered() {
    for(var i = 0; i < delivered.length; i++) {
        if(packagesOnMap.indexOf(delivered[i]) < 0) {
            $("#checkbox" + delivered[i]).prop("checked", true);
            changeMapDisplay(delivered[i], true);
        }
    }
}

/// Selects all undelivered packages for display on map
//
function selectUndelivered() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) < 0 && delivered.indexOf(packagesMonitored[i]) < 0) {
            //packagesOnMap.push(packagesMonitored[i]);
            $("#checkbox" + packagesMonitored[i]).prop("checked", true);
            changeMapDisplay(packagesMonitored[i], true);
        }
    }
}

/// For page load and mode toggle - gets data from cookies and adds to list
//
function loadFunction() {
    if (typeof $.cookie('packagesOnMap') == 'undefined') {
        $.cookie('packagesMonitored', '[]');
    }
    if (typeof $.cookie('packagesOnMap') == 'undefined') {
        $.cookie('packagesOnMap', '[]');
    }
    console.log("packagesMonitored: " +$.cookie("packagesMonitored") );
    writePackages(JSON.parse($.cookie("packagesMonitored")), JSON.parse($.cookie("packagesOnMap")));
}

/// For testing purposes - clears cookies for packagesOnMap and packagesMonitored
//
function clearCookies() {
    $.cookie('packagesOnMap', '[]');
    $.cookie('packagesMonitored', '[]');
}


/// Creates the map in the "map" div after google maps api loads and does other onload things
//
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 2,
        center: {lat: 0, lng: 0},
        minZoom: 2
    });
    infowindow = new google.maps.InfoWindow({
        content: "hello"
    });
    loadFunction();
    setInterval(updateData, 10000);
    $.fn.modal.Constructor.DEFAULTS.keyboard = false;
}


/// Makes buttons for placing things on map a justified button group if window is large
//
$(document).ready(function() {
   if($(window).width() > 765) {
        $("#selectButtons").addClass("btn-group-justified");
   }
});

/// Makes sure button group for placing things on map is justified or not depending on the window size
//
$(window).on('resize', function() {
    if($(window).width() > 765) {
        $('#selectButtons').addClass('btn-group-justified');
    } else {
        $('#selectButtons').removeClass('btn-group-justified');
    }
});



/// Manages dropdown rows - hides and shows, changes icon at beginning
//
$(function() {
    $(".dropdown-row").hide();
    $("table").click(function(event) {
        event.stopPropagation();
        var target = $(event.target);
        if ( target.closest("td").attr("colspan") > 1 ) {
            //console.log("target.closest('td') has colspan > 1");
            //target.slideUp();
            target.closest("td").parent().hide();
            //console.log("target.parent: " + target.parent().html());
            target.closest("tr").prev().find("td:first").html('<span class="glyphicon glyphicon-plus" aria-label="Expand">');
        } else {
            //target.closest("tr").next().show();
            //console.log("target.closest.next: " + target.closest("tr").next().html());
            if (target.closest("tr").find("td:first").html().indexOf("glyphicon-plus") > -1) {
                target.closest("tr").next().show();
                target.closest("tr").find("td:first").html('<span class="glyphicon glyphicon-minus" aria-label="Collapse">');
            } else {
                target.closest("tr").next().hide();
                target.closest("tr").find("td:first").html('<span class="glyphicon glyphicon-plus" aria-label="Expand">');
            }
        }
    });
});


