from flask import Flask, jsonify, render_template, request
import random

def distance(l1, l2):
    return ((l1[0]-l2[0])**2+(l1[1]-l2[1])**2)**.5


app = Flask(__name__)

begin = [40.7127, -74.0059] # nyc
end = [51.5072, 0.1275] # london
end = [-33.8650, 151.2094] # sydney
#end = [35.6833, 139.6833] # tokyo


visitedPoints = [{'lat':begin[0],'lng':begin[1]}]

cp = begin
updates = 30
dx = (end[0]-begin[0])/updates
dy = (end[1]-begin[1])/updates
@app.route('/updateMap')
def update():
    global dx, dy, visitedPoints
    """Add two numbers server side, ridiculous but well..."""
    print(abs(cp[0]-end[0]))
    if distance(cp,end)>1:
        cp[0] = cp[0]+dx
        cp[1] = cp[1]+dy
    x = cp[0]
    y = cp[1]
    if {'lat':cp[0],'lng':cp[1]} not in visitedPoints:
        visitedPoints += [{'lat':cp[0],'lng':cp[1]}]
    print(visitedPoints)
    return jsonify(a=x,b=y)

@app.route('/reset')
def reset():
    global begin, cp
    cp = begin
    return True

@app.route('/data')
def send_data():
    global begin
    a = request.args.get('dt',0,type=str)
    print(a)
    if a == 'startingPoint':
        print(jsonify(a=begin[0], b=begin[1]))
        return jsonify(a=begin[0], b=begin[1])

    elif a == 'prevPoints':
        return jsonify(results=visitedPoints)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run()
