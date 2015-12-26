from flask import Flask, jsonify, render_template, request
import json
import random
from dateutil.parser import *
import datetime
import time
# from src import packop


def distance(l1, l2):
    return ((l1[0]-l2[0])**2+(l1[1]-l2[1])**2)**.5


app = Flask(__name__)

# TESTING VARS
begin = [40.7127, -74.0059]     # nyc
end = [51.5072, 0.1275]         # london
# end = [-33.8650, 151.2094]    # sydney
# end = [35.6833, 139.6833]     # tokyo
initial_data = {}
package_data = {}
delivered_packages = []


visited_points = [{'lat': begin[0], 'lng': begin[1]}]

cp = begin[:]
updates = 30
dx = (end[0]-begin[0])/updates
dy = (end[1]-begin[1])/updates

def parse_time(time_str):
    """Does dateutil.parser.parse on the string, then converts to a \
    timetuple, which is converted to milliseconds since epoch by \
    time.mktime"""
    return int(time.mktime(parse(time_str).timetuple()))

@app.route('/updateMap')
def update():
    global dx, dy, visited_points
    # print(abs(cp[0] - end[0]))
    if distance(cp, end) > 1:
        cp[0] = cp[0]+dx
        cp[1] = cp[1]+dy
    x = cp[0]
    y = cp[1]
    if {'lat': cp[0], 'lng': cp[1]} not in visited_points:
        visited_points += [{'lat': cp[0], 'lng': cp[1]}]
    # print(visited_points)
    return jsonify(a=x, b=y)

@app.route('/reset')
def reset():
    global begin, cp, visited_points
    cp = begin[:]
    print(cp, begin)
    visited_points = [{'lat':begin[0],'lng':begin[1]}]
    print('---',cp, visited_points,'----')
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
    print "name:", name, "dest_lat:", dest_lat, "dest_lng:", dest_lng, "uuid:", uuid 
    out = {'ackUUID': '['+uuid+']'}
    return str(out)
    # return "success"

@app.route('/packagetrackupdate/<uuid>', methods=['POST'])
def get_package_update(uuid):
    """Receives POST data about package's current info, and adds it to the \
    dictionary of positions."""
    data = json.loads(request.get_data().replace("[", "{").replace("]", "}"))
    if "delivered" in data:
        delivered_packages.append(uuid)
        print "uuid:", uuid, "delivered:", data['delivered']
    else:
        print "response:", data
        lat = data['lat']
        lon = data['lon']
        elevation = data['ele']
        time = data['time']
        if uuid in package_data:
            package_data[uuid].append({"coords": (lat, lon), "ele": elevation, "time": parse_time(time)})
        else:
            package_data[uuid] = [{"coords": (lat, lon), "ele": elevation, "time": parse_time(time)}]
        # print "uuid:", uuid, "lat:", lat, "long:", lon, "ele:", elevation, "time:", time
        # print package_data
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
        isValidUUID = uuid in initial_data \
            and uuid in package_data
        return jsonify(results=isValidUUID)
    elif a == 'initialData':
        return jsonify(dict(initial_data[uuid].items() + {"start_coords": package_data[uuid][0]['coords']}.items()))
    elif a == 'startingPoint':
        # print(jsonify(a=begin[0], b=begin[1]))
        return jsonify(a=begin[0], b=begin[1])
    elif a == 'prevPoints':
        return jsonify(results=visited_points)
    elif a == 'isDelivered':
        return jsonify(results=(uuid in delivered_packages))

@app.route('/')
def index():
    """Serves the webpage based on template at /templates/index.html"""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
