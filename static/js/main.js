var DEFAULT_TR_CONTENTS = '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p>Starting location: <span id="start{UUID}">{STARTLOCATION}</span></p><p>Current location: <span id="current{UUID}">{CURRENTLOCATION}</span></p><p>Destination: <span id="dest{UUID}">{DESTLOCATION}</span></p></td><td><a href="javascript:removeRow(\'{UUID}\')" class="btn btn-raised btn-danger">Stop Tracking</a></td></tr>';
var ADMIN_TR_CONTENTS = '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)" id="checkbox{UUID}"></label></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}"><p>Starting location: <span id="start{UUID}">{STARTLOCATION}</span></p><p>Current location: <span id="current{UUID}">{CURRENTLOCATION}</span></p><p>Destination: <span id="dest{UUID}">{DESTLOCATION}</span></p></td><td></td></tr>';

var packagesMonitored = [];
var packagesOnMap = [];

var adminList = [];
var adminMapPackages = [];

var adminMode = false;

// For testing purposes, remove later
var isValidUUID = true;


function getLocationName(lat, lon) {

	return "Washington, DC";
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function populateRow(uuid, name) {
	var newRow = DEFAULT_TR_CONTENTS;
	newRow = replaceAll(newRow, '{UUID}', uuid);
	newRow = replaceAll(newRow, '{NAME}', name);
	newRow = replaceAll(newRow, '{CURRENTLOCATION}', "Loading...");
	newRow = replaceAll(newRow, '{STARTLOCATION}', "Loading...");
	newRow = replaceAll(newRow, '{DESTLOCATION}', "Loading...");
	return newRow;
}

function populateAdminRow(uuid, name) {
	var newRow = ADMIN_TR_CONTENTS;
	newRow = replaceAll(newRow, '{UUID}', uuid);
	newRow = replaceAll(newRow, '{NAME}', name);
	newRow = replaceAll(newRow, '{CURRENTLOCATION}', "Loading...");
	newRow = replaceAll(newRow, '{STARTLOCATION}', "Loading...");
	newRow = replaceAll(newRow, '{DESTLOCATION}', "Loading...");
	return newRow;
}

function addRow(uuid, name, start, current, dest) {
	if(adminMode) {
		rowToAdd = populateAdminRow(uuid, name);
	} else {
		rowToAdd = populateRow(uuid, name);
	}
	$('#packageTable > tbody:last-child').append(rowToAdd);
	$.material.checkbox();
	console.log("uuid: " + uuid);
	$("#start" + uuid).text(getLocationName(start[0], start[1]));
	$("#current" + uuid).text(getLocationName(current[0], current[1]));
	$("#dest" + uuid).text(getLocationName(dest[0], dest[1]));
}

function changeMapDisplay(id, checked) {
	console.log(id);
	if(!adminMode) {
		if(!checked) {
			packagesOnMap.splice($.inArray(id, packagesOnMap), 1);
		} else {
			packagesOnMap.push(id);
		}
		$.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
	} else {
		if(!checked) {
			adminMapPackages.splice($.inArray(id, adminMapPackages), 1);
		} else {
			adminMapPackages.push(id);
		}
	}
}

function removeRow(uuid) {
	packagesMonitored.splice($.inArray(uuid, packagesMonitored), 1);
	$("#row" + uuid).remove();
	packagesOnMap.splice($.inArray(uuid, packagesOnMap), 1);
	$.cookie("packagesOnMap", JSON.stringify(packagesOnMap));
	$.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
}

function addPackage() {
	uuid = $("#newPackage").val();
	console.log(uuid);
	// TODO: add real condition here for check
	if(isValidUUID) {
		$("#newPackage").val("");
		packagesMonitored.push(uuid);
		$.cookie("packagesMonitored", JSON.stringify(packagesMonitored));
		addRow(uuid, "name", [1, 1], [2, 2], [3, 3])
	} else {
		$("#invalidUUIDAlert").show();
        $("#invalidUUIDAlert").fadeTo(2000, 500).slideUp(500, function(){
       		$("#invalidUUIDAlert").hide();
       	});
	}
}

function adminLoad() {
	for(i = 0; i < adminList.length; i++) {
		addRow(adminList[i], "name", [1, 1], [2, 2], [3, 3]);
	}
}


function writePackages(packageList, mapList) {
	packagesMonitored = packageList;
	packagesOnMap = mapList;
	for(i = 0; i < packageList.length; i++) {
		addRow(packageList[i], "name", [1, 1], [2, 2], [3, 3]);
	}
	for(i = 0; i < mapList.length; i++) {
		$("#checkbox" + mapList[i]).prop("checked", true);
	}
}

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

	}
}


function loadFunction() {
	if (typeof $.cookie('packagesOnMap') == 'undefined') {
		$.cookie('packagesMonitored', '[]');
 	}
 	if (typeof $.cookie('packagesOnMap') == 'undefined') {
		$.cookie('packagesOnMap', '[]');
 	}
	writePackages(JSON.parse($.cookie("packagesMonitored")), JSON.parse($.cookie("packagesOnMap")));
}

$(document).ready(function() {
	loadFunction();
});






