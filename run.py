import json
import time
from src import packop

from dateutil.parser import *
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)

# TESTING VARS
initial_data = {}
package_data = {}
delivered_packages = []
packages = {}

def parse_time(time_str):
    """Does dateutil.parser.parse on the string, then converts to a \
    timetuple, which is converted to milliseconds since epoch by \
    time.mktime"""
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
    """Gets new package data, with name, destination, and UUID."""
    global initial_data
    name = request.args.get('name', "", type=str)
    dest_lat = request.args.get('destinationLat', 0, type=float)
    dest_lng = request.args.get('destinationLon', 0, type=float)
    uuid = request.args.get('uuid', "", type=str)
    initial_data[uuid] = {"name": name, "end_coords": (dest_lat, dest_lng)}
    # print "name:", name, "dest_lat:", dest_lat,
    #                       "dest_lng:", dest_lng, "uuid:", uuid
    out = {'ackUUID': '['+uuid+']'}
    packages[uuid] = None
    return str(out)
    # return "success"


@app.route('/packagetrackupdate/<uuid>', methods=['POST'])
def get_package_update(uuid):
    """Receives POST data about package's current info, and adds it to the \
    dictionary of positions."""
    data = json.loads(request.get_data().replace("[", "{").replace("]", "}"))
    # print data
    if "delivered" in data:
        delivered_packages.append(uuid)
        del packages[uuid]
        # print "uuid:", uuid, "delivered:", data['delivered']
    else:
        # print "response:", data
        lat = data['lat']
        lon = data['lon']
        elevation = data['ele']
        time = data['time']
        if uuid in package_data:
            package_data[uuid].append({
                "coords": (lat, lon),
                "ele": elevation,
                "time": parse_time(time)
                })
        else:
            package_data[uuid] = [{
                "coords": (lat, lon),
                "ele": elevation,
                "time": parse_time(time)
                }]
        # print "uuid:", uuid, "lat:", lat, "long:", lon,
        #                "ele:", elevation, "time:", time
        # print package_data
        coord = (float(lat), float(lon), float(elevation), parse_time(time))
        if packages[uuid] == None:
            packages[uuid] = packop.package(
                coord, initial_data[uuid]["end_coords"])
        else:
            packages[uuid].add_point(coord)
    return ''


@app.route('/testdata')
def test_data():
    """Returns a json version of whatever variable is passed as the value \
    from the data key"""
    return jsonify(results=eval(request.args.get('data', "", type=str)))


@app.route('/data')
def send_data():
    """Sends data to clientside. dt is for what type of output it's expecting, \
    and uuid is for the package uuid for which data is received."""
    global begin, initial_data, package_data
    a = request.args.get('dt', "", type=str)
    uuid = request.args.get('uuid', "", type=str)
    if a == 'isValidUUID':
        is_valid_uuid = uuid in initial_data \
                        and uuid in package_data
        return jsonify(results=is_valid_uuid)
    elif a == 'initialData':
        return jsonify(dict(initial_data[uuid].items() +
                            {"start_coords": package_data[uuid][0]['coords']}
                            .items() +
                            {"curr_coords": package_data[uuid][-1]['coords']}
                            .items()))
    elif a == 'startingPoint':
        # print(jsonify(a=begin[0], b=begin[1]))
        return jsonify(a=begin[0], b=begin[1])
    elif a == 'isDelivered':
        return jsonify(results=(uuid in delivered_packages))
    elif a == 'getNewPoints':
        prev_time = request.args.get('time', 0, type=int)
        count = 0
        while package_data[uuid][count]['time'] <= prev_time:
            count += 1
            if count >= len(package_data[uuid]):
                return jsonify(results=[])
        return jsonify(results=package_data[uuid][count:])
    elif a == 'adminUUIDList':
        return jsonify(results=package_data.keys())
    elif a == 'getETR':
        try:
            return jsonify(results=packages[uuid].etr())
        except KeyError:
            return jsonify(results=0)
    elif a == 'getPOI':
        try:
            return jsonify(results=packages[uuid].poi)
        except KeyError:
            return jsonify(results=[])
    return jsonify(results="")


@app.route('/')
def index():
    """Serves the webpage based on template at /templates/index.html"""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
