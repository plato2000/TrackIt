var DEFAULT_TR_CONTENTS =   '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div><br /><div class="color-container"><input type="hidden" id="color{UUID}" value="{COLOR}"></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p>Starting location: <span id="start{UUID}">{STARTLOCATION}</span></p><p>Current location: <span id="current{UUID}">{CURRENTLOCATION}</span></p><p>Destination: <span id="dest{UUID}">{DESTLOCATION}</span></p></td><td><a href="javascript:removeRow(\'{UUID}\')" class="btn btn-raised btn-danger">Stop Tracking</a></td></tr>';
var ADMIN_TR_CONTENTS =     '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div><br /><div class="color-container"><input type="hidden" id="color{UUID}" value="{COLOR}"></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p>Starting location: <span id="start{UUID}">{STARTLOCATION}</span></p><p>Current location: <span id="current{UUID}">{CURRENTLOCATION}</span></p><p>Destination: <span id="dest{UUID}">{DESTLOCATION}</span></p></td><td></td></tr>';

var packagesMonitored = [];
var packagesOnMap = [];

var adminList = [];
var adminMapPackages = [];

var packagePositions = {};
var adminPackagePositions = {};

var destinations = {};

var colors = {};

var adminMode = false;

var mapLines = {};
var originMapMarkers = {};
var destinationMapMarkers = {};


// Helper function for replaceAll, which uses regex
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// Replaces all occurrences of 'find' within string 'str' with 'replace'
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// Gets a random hex color
function getRandomColor() {
    return '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
}

// Uses DEFAULT_TR_CONTENTS and creates HTML for a new table row which
function populateRow(uuid, name) {
    var newRow = DEFAULT_TR_CONTENTS;
    newRow = replaceAll(newRow, '{UUID}', uuid);
    newRow = replaceAll(newRow, '{NAME}', name);
    // Location is updated later, as reverse geocoding is not always instant
    newRow = replaceAll(newRow, '{CURRENTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{STARTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{DESTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{COLOR}', colors[uuid]);
    return newRow;
}

// Like populateRow, but for admin mode which doesn't have a delete button
function populateAdminRow(uuid, name) {
    var newRow = ADMIN_TR_CONTENTS;
    newRow = replaceAll(newRow, '{UUID}', uuid);
    newRow = replaceAll(newRow, '{NAME}', name);
    newRow = replaceAll(newRow, '{CURRENTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{STARTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{DESTLOCATION}', "Loading...");
    newRow = replaceAll(newRow, '{COLOR}', colors[uuid]);
    return newRow;
}

// Adds a new row to the table in the page
function addRow(uuid, name, start, current, dest) {
    if(adminMode) {
        rowToAdd = populateAdminRow(uuid, name);
    } else {
        rowToAdd = populateRow(uuid, name);
    }
    // Adds row to table
    $('#packageTable > tbody:last-child').append(rowToAdd);
    // Material design JS loads proper styling for checkboxes (has to be loaded every time)
    $.material.checkbox();

    // Loads color picker
    $("#color" + uuid).minicolors({
        theme: 'bootstrap',
        changedelay: 100,
        change: function(value, opacity) {
            console.log("value: " + value);
            colors[uuid] = value;
            if(uuid in destinationMapMarkers) {
                destinationMapMarkers[uuid].setIcon(pinSymbol(value));
            }
            if(uuid in mapLines) {
                mapLines[uuid].setOptions({strokeColor: value});
            }
            map.setZoom(map.getZoom());
        }

    });

    console.log("uuid: " + uuid);
    // Puts locations in after row is already in (asynchronous)
    setLocationName("#start" + uuid, start);
    setLocationName("#current" + uuid, current);
    setLocationName("#dest" + uuid, dest);
}

// Removes row from table and monitored packages list
function removeRow(uuid) {
    packagesMonitored.splice($.inArray(uuid, packagesMonitored), 1);
    $("#row" + uuid).remove();
    packagesOnMap.splice($.inArray(uuid, packagesOnMap), 1);
    $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
    $.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
}


// Adds package to table, monitored list after it's entered into text entry box
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

// Generic function to get package data from UUID and add to table
function addPackage(uuid) {
    $.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
    $.ajax({
        type: 'GET',
        url: $SCRIPT_ROOT + '/data',
        dataType: 'json',
        success: function(data) {
            var name = data.name;
            // TODO: Convert coords to google maps LatLng
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

// Used to reset scope because this is called from an asynchronous function. Without this, it would always use the
// last versions of index, concat, and admin because they change in a loop
function updateCallback(index, concat, admin) {
    return function(data) {
        if(admin) {
            if(concat) {
                adminPackagePositions[adminList[index]].concat(convertUpdateResults(data.results));
            } else {
                adminPackagePositions[adminList[index]] = convertUpdateResults(data.results);
            }
            // console.log("i: " + index);
            // console.log("adminList[i]: " + adminList[index]);
            // console.log("adminPackagePositions[^]: " + adminPackagePositions[adminList[index]]);
            setLocationName("#current" + adminList[index], adminPackagePositions[adminList[index]].slice(-1)[0]['coords']);
        } else {
            if(concat) {
                packagePositions[packagesMonitored[index]].concat(convertUpdateResults(data.results));
            } else {
                packagePositions[packagesMonitored[index]] = convertUpdateResults(data.results);
            }
            // console.log("i: " + index);
            // console.log("packagesMonitored[i]: " + packagesMonitored[index]);
            // console.log("packagePositions[^]: " + packagePositions[packagesMonitored[index]]);
            setLocationName("#current" + packagesMonitored[index], packagePositions[packagesMonitored[index]].slice(-1)[0]['coords']);

        }
    };
}

// Gets new points from server
function updateData() {
    if(!adminMode) {
        for(var i = 0; i < packagesMonitored.length; i++) {
            if(packagesMonitored[i] in packagePositions) {
                $.getJSON($SCRIPT_ROOT + '/data', {"dt": "getNewPoints", "uuid": packagesMonitored[i], "time": packagePositions[packagesMonitored[i]].slice(-1)[0]['time']}, updateCallback(i, true, false));
            } else {
                $.getJSON($SCRIPT_ROOT + '/data', {"dt": "getNewPoints", "uuid": packagesMonitored[i], "time": 0}, updateCallback(i, false, false));
            }
        }
    } else {
        for(var i = 0; i < adminList.length; i++) {
            if(adminList[i] in adminPackagePositions) {
                // console.log("adminList[i] in adminPackagePositions. adminList[i]: " + adminList[i]);
                $.getJSON($SCRIPT_ROOT + '/data', {"dt": "getNewPoints", "uuid": adminList[i], "time": adminPackagePositions[adminList[i]].slice(-1)[0]['time']}, updateCallback(i, true, true));
            } else {
                // console.log("adminList[i] not in adminPackagePositions. adminList[i]: " + adminList[i]);
                $.getJSON($SCRIPT_ROOT + '/data', {"dt": "getNewPoints", "uuid": adminList[i], "time": 0}, updateCallback(i, false, true));
            }
        }
    }
    updateMap();
}

// Adds a list of packages to the table and sets conditions according to arrays passed to it
function writePackages(packageList, mapList) {
    packagesMonitored = packageList;
    packagesOnMap = mapList;
    for (var i = 0; i < packageList.length; i++) {
        addPackage(packageList[i]);
    }
    for(i = 0; i < mapList.length; i++) {
        $("#checkbox" + mapList[i]).prop("checked", true);
    }
}

// Toggles mode between admin mode and regular user
function changeAdminMode() {
    if(adminMode) {
        $("#loginButton").html("Log in&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        adminMode = false;
        $("#listBody").html("");
        loadFunction();
    } else {
        $("#loginButton").html("Log out&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        adminMode = true;
        $("#listBody").html("");
        adminLoad();

    }
}

// Creates the map in the "map" div after google maps api loads
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 2,
        center: {lat: 0, lng: 0},
        minZoom: 2
    });
}

// Creates a path for the map pin of a given hex color
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

// Changes visibility of package on map.
function changeMapDisplay(id, checked) {
    // console.log(id);
    if(!adminMode) {
        if(!checked) {
            packagesOnMap.splice($.inArray(id, packagesOnMap), 1);
            mapLines[id].setMap(null);
            destinationMapMarkers[id].setMap(null);
            originMapMarkers[id].setMap(null);
        } else {
            packagesOnMap.push(id);
        }
        $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
    } else {
        if(!checked) {
            adminMapPackages.splice($.inArray(id, adminMapPackages), 1);
            mapLines[id].setMap(null);
            destinationMapMarkers[id].setMap(null);
            originMapMarkers[id].setMap(null);
        } else {
            adminMapPackages.push(id);
        }
    }
    updateData();
}

// Updates the map view with new coordinates for the line and markers
// TODO: Read as google maps LatLng after change above
function updateMap() {
    if (!adminMode) {
        for (var i = 0; i < packagesOnMap.length; i++) {
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
            if (!(packagesOnMap[i] in destinationMapMarkers)) {
                destinationMapMarkers[packagesOnMap[i]] = new google.maps.Marker({
                    position: destinations[packagesOnMap[i]],
                    map: map,
                    animation: null,
                    title: packagesOnMap[i] + "'s Destination Marker",
                    icon: pinSymbol(colors[packagesOnMap[i]]),
                    label: {
                        text: 'B'
                    }
                });
            }
            if (packagePositions[packagesOnMap[i]] != undefined && !(packagesOnMap[i] in originMapMarkers)) {
                originMapMarkers[packagesOnMap[i]] = new google.maps.Marker({
                    position: packagePositions[packagesOnMap[i]][0]['coords'],
                    map: map,
                    animation: null,
                    title: packagesOnMap[i] + "'s Origin Marker",
                    icon: pinSymbol(colors[packagesOnMap[i]]),
                    label: {
                        text: 'A'
                    }
                });
            }
            var currentPath = mapLines[packagesOnMap[i]].getPath();
            for (var j = currentPath.length; j < packagePositions[packagesOnMap[i]].length; j++) {
                currentPath.push(packagePositions[packagesOnMap[i]][j]['coords']);
            }
            mapLines[packagesOnMap[i]].setPath(currentPath);
        }
    } else {
        for (var i = 0; i < adminMapPackages.length; i++) {
            // console.log(adminMapPackages[i] in mapLines);
            if (!(adminMapPackages[i] in mapLines)) {
                // console.log(adminMapPackages[i] in mapLines);
                mapLines[adminMapPackages[i]] = new google.maps.Polyline({
                    path: [],
                    geodesic: true,
                    strokeColor: colors[adminMapPackages[i]],
                    strokeOpacity: 1.0,
                    strokeWeight: 3
                });
            }
            mapLines[adminMapPackages[i]].setMap(map);
            if (!(adminMapPackages[i] in destinationMapMarkers)) {
                destinationMapMarkers[adminMapPackages[i]] = new google.maps.Marker({
                    position: destinations[adminMapPackages[i]],
                    map: map,
                    animation: null,
                    title: adminMapPackages[i] + "'s Marker",
                    icon: pinSymbol(colors[adminMapPackages[i]]),
                    label: {
                        text: 'B'
                    }
                });
            }
            if (adminPackagePositions[adminMapPackages[i]] != undefined && !(adminMapPackages[i] in originMapMarkers)) {
                originMapMarkers[adminMapPackages[i]] = new google.maps.Marker({
                    position: adminPackagePositions[adminMapPackages[i]][0]['coords'],
                    map: map,
                    animation: null,
                    title: packagesOnMap[i] + "'s Origin Marker",
                    icon: pinSymbol(colors[adminMapPackages[i]]),
                    label: {
                        text: 'A'
                    }
                });
            }
            var currentPath = mapLines[adminMapPackages[i]].getPath();
            for (var j = currentPath.length; j < adminPackagePositions[adminMapPackages[i]].length; j++) {
                // console.log("i: " + i + " j: " + j);
                // console.log("adminPackagePositions[adminMapPackages[i]]: " + adminPackagePositions[adminMapPackages[i]]);
                currentPath.push(adminPackagePositions[adminMapPackages[i]][j]['coords']);
            }
            mapLines[adminMapPackages[i]].setPath(currentPath);
        }
    }
}

// Callback function for setLocationName
function locationCallback(id, latlng) {
    return function (results, status) {
        if (status !== google.maps.GeocoderStatus.OK) {
            if (status == "OVER_QUERY_LIMIT") {
                // console.log(status);
                setTimeout(function () {
                    setLocationName(id, latlng);
                }, 300);
                return;
            }
            // alert(status + " " + results);
            if ($(id).text() == "Loading...") {
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
function setLocationName(id, latlng) {
    // console.log("lat: " + latlng.lat() + " lng: " + latlng.lng());
    // This is making the Geocode request
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'latLng': latlng}, locationCallback(id, latlng));
}

// Adds everything on the admin list of UUIDS to the table
function adminLoad() {
    $.getJSON($SCRIPT_ROOT + '/data', {"dt": "adminUUIDList"}, function(data) {
        adminList = data.results;
        for (var i = 0; i < adminList.length; i++) {
            addPackage(adminList[i]);
        }
    });
}

// For page load and mode toggle - gets data from cookies and adds to list
function loadFunction() {
    if (typeof $.cookie('packagesOnMap') == 'undefined') {
        $.cookie('packagesMonitored', '[]');
    }
    if (typeof $.cookie('packagesOnMap') == 'undefined') {
        $.cookie('packagesOnMap', '[]');
    }
    writePackages(JSON.parse($.cookie("packagesMonitored")), JSON.parse($.cookie("packagesOnMap")));
}

// Starts everything after page is fully loaded
$(document).ready(function() {
    loadFunction();
    setInterval(updateData, 10000);
});






