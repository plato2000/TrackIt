import json
import time
from src import packop
from src import database_storage

from dateutil.parser import *
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)

## Does dateutil.parser.parse on the string, then converts to a
#  timetuple, which is converted to seconds since epoch by
#  time.mktime
#  @param time_str A timestamp in some ISO format
#  @return Time in seconds since epoch
def parse_time(time_str):
    return int(time.mktime(parse(time_str).timetuple()))


@app.route('/tracknewpackage', methods=['GET'])
## Gets new Package data, with name, destination, and UUID
#
def track_new_package():
    global initial_data
    name = request.args.get('name', "", type=str)
    dest_lat = request.args.get('destinationLat', 0, type=float)
    dest_lng = request.args.get('destinationLon', 0, type=float)
    uuid = request.args.get('uuid', "", type=str)
    # initial_data[uuid] = {"name": name, "end_coords": (dest_lat, dest_lng)}
    database_storage.create_table(uuid, name, dest_lat, dest_lng)
    # print "name:", name, "dest_lat:", dest_lat,
    #                       "dest_lng:", dest_lng, "uuid:", uuid
    out = {'ackUUID': '['+uuid+']'}
    packages[uuid] = None
    # print "ran through here"
    return str(out)
    # return "success"


@app.route('/packagetrackupdate/<uuid>', methods=['POST'])
## Receives POST data about Package's current info, and adds it to the
#  dictionary of positions.
#  @param uuid The uuid of the Package that is being updated
def get_package_update(uuid):
    # print "Trying to get Package update..."
    data = json.loads(request.get_data().replace("[", "{").replace("]", "}"))
    # print data
    if "delivered" in data:
        database_storage.make_delivered(uuid)
        del packages[uuid]
        # print "uuid:", uuid, "delivered:", data['delivered']
    else:
        # print "response:", data
        lat = float(data['lat'])
        lon = float(data['lon'])
        elevation = int(data['ele'])
        timestamp = data['time']
        coord = (float(lat), float(lon), float(elevation), parse_time(timestamp))
        database_storage.insert_location(uuid, coord[0], coord[1], coord[2], coord[3])
        # print "uuid:", uuid, "lat:", lat, "long:", lon,
        #                "ele:", elevation, "time:", time
        # print package_data
        if packages[uuid] is None:
            print "death by yaegan"
            packages[uuid] = packop.Package(
                coord, database_storage.get_destination_of_package(uuid))
        else:
            packages[uuid].add_point(coord)
    return ''


@app.route('/testdata')
## Returns a json version of whatever variable is passed as the value
#  from the data key
def test_data():
    return jsonify(results=eval(request.args.get('data', "", type=str)))


@app.route('/data')
## Sends data to clientside. dt is for what type of output it's expecting
#  and uuid is for the Package uuid for which data is received.
def send_data():
    global begin, initial_data, package_data
    a = request.args.get('dt', "", type=str)
    uuid = request.args.get('uuid', "", type=str)
    if a == 'isValidUUID':
        return jsonify(results=database_storage.is_valid_uuid(uuid))
    elif a == 'initialData':
        return jsonify({"name": database_storage.get_name(uuid),
                        "end_coords": database_storage.get_destination_of_package(uuid),
                        "start_coords": database_storage.get_first_data(uuid)['coords'],
                        "curr_coords": database_storage.get_current_data(uuid)['coords']})
    elif a == 'isDelivered':
        return jsonify(results=database_storage.is_delivered(uuid))
    elif a == 'getNewPoints':
        prev_time = request.args.get('time', 0, type=int)
        return jsonify(results=database_storage.get_locations(uuid, prev_time))
    elif a == 'undeliveredPackages':
        return jsonify(results=database_storage.get_undelivered_packages())
    elif a == 'deliveredPackages':
        return jsonify(results=database_storage.get_delivered_packages())
    elif a == 'getETR':
        try:
            return jsonify(results=packages[uuid].etr())
        except KeyError:
            return jsonify(results=database_storage.get_current_data(uuid)['time'] - time.time())
    elif a == 'getPOI':
        try:
            return jsonify(results=packages[uuid].poi)
        except KeyError:
            return jsonify(results=[])
    elif a == 'getDistance':
        try:
            return jsonify(results=packages[uuid].dist)
        except KeyError:
            return jsonify(results=[])
    return jsonify(results="")


@app.route('/')
## Serves the webpage based on template at /templates/index.html
#  print "Serving index..."
def index():
    return render_template('index.html')


## Recovers undelivered packages from the database on startup.
def recover():
    global packages
    undelivered = database_storage.get_undelivered_packages()
    for uuid in undelivered:
        convert_coord = lambda coord: coord["coords"] + (coord["ele"], coord["time"])
        start = convert_coord(database_storage.get_first_data(uuid))
        dest = database_storage.get_destination_of_package(uuid)
        packages[uuid] = packop.Package(start, dest)
        coords = database_storage.get_locations(uuid, start[-1])
        for coord in coords:
            packages[uuid].add_point(convert_coord(coord))

packages = {}

if __name__ == '__main__':
    recover()
    app.run(debug=True, use_debugger=False, use_reloader=True)
