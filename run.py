import json
import time
from src import packop
from src import databaseStorage

from dateutil.parser import *
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)

## TESTING VARS
initial_data = {}
package_data = {}
delivered_packages = []
packages = {}

def parse_time(time_str):
    ## Does dateutil.parser.parse on the string, then converts to a \
    #  timetuple, which is converted to milliseconds since epoch by \
    #  time.mktime
    return int(time.mktime(parse(time_str).timetuple()))


@app.route('/reset')
def reset():
    global begin, cp, visited_points
    cp = begin[:]
    print(cp, begin)
    visited_points = [{'lat': begin[0], 'lng':begin[1]}]
    print('---', cp, visited_points, '----')
    return jsonify(a='true')


@app.route('/tracknewpackage', methods=['GET'])
def track_new_package():
    ## Gets new package data, with name, destination, and UUID.
    global initial_data
    name = request.args.get('name', "", type=str)
    dest_lat = request.args.get('destinationLat', 0, type=float)
    dest_lng = request.args.get('destinationLon', 0, type=float)
    uuid = request.args.get('uuid', "", type=str)
    # initial_data[uuid] = {"name": name, "end_coords": (dest_lat, dest_lng)}
    databaseStorage.create_table(uuid, name, dest_lat, dest_lng)
    # print "name:", name, "dest_lat:", dest_lat,
    #                       "dest_lng:", dest_lng, "uuid:", uuid
    out = {'ackUUID': '['+uuid+']'}
    packages[uuid] = None
    # print "ran through here"
    return str(out)
    # return "success"


@app.route('/packagetrackupdate/<uuid>', methods=['POST'])
def get_package_update(uuid):
    ## Receives POST data about package's current info, and adds it to the \
    #  dictionary of positions.
    print "Trying to get package update..."
    data = json.loads(request.get_data().replace("[", "{").replace("]", "}"))
    # print data
    if "delivered" in data:
        databaseStorage.make_delivered(uuid)
        del packages[uuid]
        # print "uuid:", uuid, "delivered:", data['delivered']
    else:
        # print "response:", data
        lat = float(data['lat'])
        lon = float(data['lon'])
        elevation = int(data['ele'])
        timestamp = data['time']
        coord = (float(lat), float(lon), float(elevation), parse_time(timestamp))

        # if uuid in package_data:
        #     package_data[uuid].append({
        #         "coords": (lat, lon),
        #         "ele": elevation,
        #         "time": parse_time(time)
        #         })
        # else:
        #     package_data[uuid] = [{
        #         "coords": (lat, lon),
        #         "ele": elevation,
        #         "time": parse_time(time)
        #         }]
        databaseStorage.insert_location(uuid, coord[0], coord[1], coord[2], coord[3])
        # print "uuid:", uuid, "lat:", lat, "long:", lon,
        #                "ele:", elevation, "time:", time
        # print package_data
        if packages[uuid] is None:
            print "death by yaegan"
            packages[uuid] = packop.package(
                coord, databaseStorage.get_destination_of_package(uuid))
        else:
            packages[uuid].add_point(coord)
    return ''


@app.route('/testdata')
def test_data():
    ## Returns a json version of whatever variable is passed as the value \
    #  from the data key
    return jsonify(results=eval(request.args.get('data', "", type=str)))


@app.route('/data')
def send_data():
    ## Sends data to clientside. dt is for what type of output it's expecting, \
    #  and uuid is for the package uuid for which data is received.
    print "Sending data"
    global begin, initial_data, package_data
    a = request.args.get('dt', "", type=str)
    uuid = request.args.get('uuid', "", type=str)
    if a == 'isValidUUID':
        return jsonify(results=databaseStorage.is_valid_uuid(uuid))
    elif a == 'initialData':
        return jsonify({"name": databaseStorage.get_name(uuid),
                        "end_coords": databaseStorage.get_destination_of_package(uuid),
                        "start_coords": databaseStorage.get_first_data(uuid)['coords'],
                        "curr_coords": databaseStorage.get_current_data(uuid)['coords']})
    elif a == 'isDelivered':
        return jsonify(results=databaseStorage.is_delivered(uuid))
    elif a == 'getNewPoints':
        prev_time = request.args.get('time', 0, type=int)
        # count = 0
        # while package_data[uuid][count]['time'] <= prev_time:
        #     count += 1
        #     if count >= len(package_data[uuid]):
        #         return jsonify(results=[])
        # return jsonify(results=package_data[uuid][count:])
        return jsonify(results=databaseStorage.get_locations(uuid, prev_time))
    elif a == 'undeliveredPackages':
        return jsonify(results=databaseStorage.get_undelivered_packages())
    elif a == 'deliveredPackages':
        return jsonify(results=databaseStorage.get_delivered_packages())
    elif a == 'getETR':
        try:
            return jsonify(results=packages[uuid].etr())
        except KeyError:
            return jsonify(results=databaseStorage.get_current_data(uuid)['time'] - time.time())
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
def index():
    ## Serves the webpage based on template at /templates/index.html
    #  print "Serving index..."
    return render_template('index.html')

def recover():
    global packages
    undelivered = databaseStorage.get_undelivered_packages()
    for uuid in undelivered:
        start = databaseStorage.get_first_data(uuid)
        dest = databaseStorage.get_destination_of_package(uuid)
        packages[uuid] = package(start, dest)
        coords = databaseStorage.get_locations(uuid, start[-1])
        for coord in coords:
            packages[uuid].add_point(coord)

if __name__ == '__main__':
    recover()
    app.run(debug=True, use_debugger=False, use_reloader=True)
    
