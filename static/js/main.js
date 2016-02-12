var DEFAULT_TR_CONTENTS = '<tr class="listRow" id="row{UUID}"><td><span class="glyphicon glyphicon-plus" aria-label="Expand"></span></td><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div><br /><div class="color-container"><input type="hidden" id="color{UUID}" value="{COLOR}"></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p><b>Current location: </b><span id="current{UUID}">{CURRENTLOCATION}</span></p></td><td id="etr{UUID}">{ETA}</td><td><a href="javascript:removeRow(\'{UUID}\')" class="btn btn-raised btn-danger">Stop Tracking</a></td></tr>';
//var ADMIN_TR_CONTENTS =     '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div><br /><div class="color-container"><input type="hidden" id="color{UUID}" value="{COLOR}"></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p><b>Starting location: </b><span id="start{UUID}">{STARTLOCATION}</span></p><p><b>Current location: </b><span id="current{UUID}">{CURRENTLOCATION}</span></p><p><b>Destination: </b><span id="dest{UUID}">{DESTLOCATION}</span></p></td><td id="etr{UUID}">{ETA}</td><td></td></tr>';
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


var contentString1 = '<div id="content">'+
     '<div id="siteNotice">'+
     '</div>'+
     '<h1 id="firstHeading" class="firstHeading">';
var contentString2 = '</h1>'+
     '<div id="bodyContent"><p>'+
     'Location:';
var contentString3 = '<br>Here since: ';
var contentString4 = '<br>Elevation: ';
var contentString5 = '<br>ETR: ';
var contentString6 = '</p>'+
     '</div>'+
     '</div>';


var infowindow;

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

function populateDropdown(uuid) {
    var newDrop = DEFAULT_DROPDOWN_CONTENTS;
    newDrop = replaceAll(newDrop, '{UUID}', uuid);
    newDrop = replaceAll(newDrop, '{STARTLOCATION}', "Loading...");
    newDrop = replaceAll(newDrop, '{DESTLOCATION}', "Loading...");
    newDrop = replaceAll(newDrop, '{DISTANCE}', "Loading...");
    return newDrop;
}

// Adds a new row to the table in the page
function addRow(uuid, name, start, current, dest) {
    rowToAdd = populateRow(uuid, name);
    dropDown = populateDropdown(uuid);
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
    if(packagesOnMap.indexOf(uuid) > -1) {
        // console.log("changing display of " + uuid);
        changeMapDisplay(uuid, false);
    }
    packagesOnMap.splice($.inArray(uuid, packagesOnMap), 1);
    if(!adminMode) {
        $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
        $.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
    }
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
// last versions of index, concat because they change in a loop
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

function distCallback(index) {
    return function(data) {
        $("#dist" + packagesMonitored[index]).text(Math.round(data.results / 100) / 10 + " km");
    }
}

function etrCallback(index) {
    return function(data) {
        $("#etr" + packagesMonitored[index]).text(moment().add(data.results, 'seconds').calendar());
    }
}

// Gets new points from server
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

// Adds a list of packages to the table and sets conditions according to arrays passed to it
function writePackages(packageList, mapList) {
    packagesMonitored = packageList;
    packagesOnMap = mapList;
    // console.log("mapList: " + packagesOnMap);
    for (var i = 0; i < packageList.length; i++) {
        // console.log("adding package " + packageList[i]);
        addPackage(packageList[i]);
    }
}

// Toggles mode between admin mode and regular user
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
    if(!checked) {
        packagesOnMap.splice($.inArray(id, packagesOnMap), 1);
        mapLines[id].setMap(null);
        destinationMapMarkers[id].setMap(null);
        originMapMarkers[id].setMap(null);
    } else {
        packagesOnMap.push(id);
    }
    if(!adminMode) {
        $.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
    }
    updateData();
}

function infoWindowCallback(destination, index) {
    return function() {
        if(!destination) {
            infowindow.setContent('<div id="content"><p>' + packagesOnMap[index] + '</p></div>');
            infowindow.open(map, originMapMarkers[packagesOnMap[index]]);
        } else {
            infowindow.setContent('<div id="content"><p>'+packagesOnMap[index]+'</p></div>');
            infowindow.open(map, destinationMapMarkers[packagesOnMap[index]]);
        }
    };
}

// Updates the map view with new coordinates for the line and markers
function updateMap() {
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
                animation: null,
                title: packagesOnMap[i] + "'s Destination Marker",
                icon: pinSymbol(colors[packagesOnMap[i]]),
                label: {
                    text: 'B'
                }
            });

            destinationMapMarkers[packagesOnMap[i]].addListener('click', infoWindowCallback(true, i));
        }
        destinationMapMarkers[packagesOnMap[i]].setMap(map);
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

                originMapMarkers[packagesOnMap[i]].addListener('click', infoWindowCallback(false, i));
                
            }
            originMapMarkers[packagesOnMap[i]].setMap(map);
            var currentPath = mapLines[packagesOnMap[i]].getPath();
            for (var j = currentPath.length; j < packagePositions[packagesOnMap[i]].length; j++) {
                currentPath.push(packagePositions[packagesOnMap[i]][j]['coords']);
            }
            mapLines[packagesOnMap[i]].setPath(currentPath);
        }
    }
}

// Callback function for setLocationName
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

// Uses reverse geocoding to get human-readable name for coordinates
function setLocationName(id, latlng) {
    // console.log("lat: " + latlng.lat() + " lng: " + latlng.lng());
    // This is making the Geocode request
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'latLng': latlng}, locationCallback(id, latlng));
}

//// Adds everything on the admin list of UUIDS to the table
//function adminLoad() {
//    $.getJSON($SCRIPT_ROOT + '/data', {"dt": "adminUUIDList"}, function(data) {
//        // console.log(data.results);
//        packagesMonitored = data.results;
//        // console.log(packagesMonitored);
//        writePackages(packagesMonitored, []);
//    });
//}

// Adds undelivered packages to packages monitored list if they aren't already there
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

// Adds delivered packages to packages monitored list if they aren't already there
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

// Selects all for display on map
function selectAll() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) < 0) {
            //packagesOnMap.push(packagesMonitored[i]);
            $("#checkbox" + packagesMonitored[i]).prop("checked", true);
            changeMapDisplay(packagesMonitored[i], true);
        }
    }
}

// Unselects all packages for display on map
function selectNone() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) > -1) {
            $("#checkbox" + packagesMonitored[i]).prop("checked", false);
            changeMapDisplay(packagesMonitored[i], false);
        }
    }
    //packagesOnMap = [];
}

// Selects all delivered packages for display on map
function selectDelivered() {
    for(var i = 0; i < delivered.length; i++) {
        if(packagesOnMap.indexOf(delivered[i]) < 0) {
            $("#checkbox" + delivered[i]).prop("checked", true);
            changeMapDisplay(delivered[i], true);
        }
    }
}

// Selects all undelivered packages for display on map
function selectUndelivered() {
    for(var i = 0; i < packagesMonitored.length; i++) {
        if(packagesOnMap.indexOf(packagesMonitored[i]) < 0 && delivered.indexOf(packagesMonitored[i]) < 0) {
            //packagesOnMap.push(packagesMonitored[i]);
            $("#checkbox" + packagesMonitored[i]).prop("checked", true);
            changeMapDisplay(packagesMonitored[i], true);
        }
    }
}

// For page load and mode toggle - gets data from cookies and adds to list
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

// for testing purposes
function clearCookies() {
    $.cookie('packagesOnMap', '[]');
    $.cookie('packagesMonitored', '[]');
}


// Creates the map in the "map" div after google maps api loads and does other onload things
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

$(document).ready(function() {
   if($(window).width() > 765) {
        $("#selectButtons").addClass("btn-group-justified");
   }
});

$(window).on('resize', function() {
    if($(window).width() > 765) {
        $('#selectButtons').addClass('btn-group-justified');
    } else {
        $('#selectButtons').removeClass('btn-group-justified');
    }
});

$(function() {
    $(".dropdown-row").hide();
    $("table").click(function(event) {
        event.stopPropagation();
        var target = $(event.target);
        if ( target.closest("td").attr("colspan") > 1 ) {
            console.log("target.closest('td') has colspan > 1");
            //target.slideUp();
            target.parent().hide();
            console.log("target.parent: " + target.parent().html());
            target.closest("tr").prev().find("td:first").html('<span class="glyphicon glyphicon-plus" aria-label="Expand">');
        } else {
            //target.closest("tr").next().show();
            console.log("target.closest.next: " + target.closest("tr").next());
            if (target.closest("tr").next().find("td:first").html().indexOf("glyphicon-plus") > -1) {
                target.closest("tr").next().show();
                target.closest("tr").next().find("td:first").html('<span class="glyphicon glyphicon-minus" aria-label="Collapse">');
            } else {
                target.closest("tr").next().hide();
                target.closest("tr").next().find("td:first").html('<span class="glyphicon glyphicon-plus" aria-label="Expand">');
            }
        }
    });
});


