from flask import Flask, jsonify, render_template, request
import random
# from src import packop


def distance(l1, l2):
    return ((l1[0]-l2[0])**2+(l1[1]-l2[1])**2)**.5


app = Flask(__name__)

# TESTING VARS
begin = [40.7127, -74.0059]     # nyc
end = [51.5072, 0.1275]         # london
# end = [-33.8650, 151.2094]    # sydney
# end = [35.6833, 139.6833]     # tokyo
initial_data = {
    "0000-0000-0000-0000" : {
        "start_coords" : [40.7127, -74.0059], 
        "end_coords" : [51.5072, 0.1275],
        "name": "NYCtoLondon"
    },
    "1111-1111-1111-1111" : {
        "start_coords" : [-33.8650, 151.2094], 
        "end_coords" : [35.6833, 139.6833],
        "name": "SydneyToTokyo"
    }

}

visited_points = [{'lat': begin[0], 'lng': begin[1]}]

cp = begin
updates = 30
dx = (end[0]-begin[0])/updates
dy = (end[1]-begin[1])/updates

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
    global begin, cp
    cp = begin
    return True

@app.route('/tracknewpackage', methods=['GET'])
def track_new_package():
    name = request.args.get('name', "", type=str)
    dest_lat = request.args.get('destinationLat', 0, type=float)
    dest_lng = request.args.get('destinationLon', 0, type=float)
    uuid = request.args.get('uuid', "", type=str)
    print("name:", name, "dest_lat:", dest_lat, "dest_lng:", dest_lng, "uuid:", uuid)
    out = {'ackUUID': '['+uuid+']'}
    return str(out)
    # return "success"

@app.route('/packagetrackupdate/<uuid:uuid>', methods=['POST'])
def get_package_update(uuid):
    if request.form.get('delivered', "", type=str) == "true":
        print("uuid:", uuid, "delivered:", request.form.get)
    else:
        print("response:", request.form)
        lat = request.form.get('lat', 0.0, type=float)
        lon = request.form.get('lon', 0.0, type=float)
        elevation = request.form.get('ele', 0.0, type=float)
        time = request.form.get('time', "", type=str)
        print("uuid:", uuid, "lat:", lat, "long:", lon, "ele:", elevation, "time:", time)
    return ''


@app.route('/data')
def send_data():
    global begin, initial_data
    a = request.args.get('dt', "", type=str)
    # print(a)
    if a == 'initialData':
        uuid = request.args.get('uuid', "", type=str)
        return jsonify(initial_data[uuid])
    elif a == 'startingPoint':
        # print(jsonify(a=begin[0], b=begin[1]))
        return jsonify(a=begin[0], b=begin[1])

    elif a == 'prevPoints':
        return jsonify(results=visited_points)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
