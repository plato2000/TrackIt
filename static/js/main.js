var DEFAULT_TR_CONTENTS = '<tr class="listRow" id="row{UUID}"><td><div class="checkbox"><label><input type="checkbox" name="{UUID}" onchange="changeMapDisplay(this.name, this.checked)"></label></div></td><td class="uuid" id="uuid{UUID}">{UUID}</td><td class="name" id="name{UUID}">{NAME}</td><td class="location" id="location{UUID}">{LOCATION}</td></tr>';
var packagesMonitored = [];
var packagesOnMap = [];


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
	newRow = replaceAll(newRow, '{LOCATION}', "Loading...");
	return newRow;
}

function addRow(uuid, name, lat, lon) {
	rowToAdd = populateRow(uuid, name);
	$('#packageTable > tbody:last-child').append(rowToAdd);
	$.material.checkbox();
	packagesMonitored.push(uuid);
	$("#location" + uuid).text(getLocationName(lat, lon));
}

function changeMapDisplay(id, checked) {
	console.log(id);
	if(!checked) {
		packagesOnMap.splice($.inArray(id, packagesOnMap), 1);
	} else {
		packagesOnMap.push(id);
	}
}
