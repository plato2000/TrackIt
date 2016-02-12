import json
import time

import geopy
from geopy import distance


PATH_TO_MAP = "src/map.json"

nominatim = geopy.Nominatim()
DEFAULT_SPEEDS = (27, 245)  # m/s
RADIUS = 6.371e6            # m
MAP_WIDTH, MAP_HEIGHT = 10800, 5400
file = open(PATH_TO_MAP, "r")
array = json.loads(file.read())
file.close()

## Returns an integer representation of a rounded float.

def roundf(number):
    return int(round(number))

## Returns whether or not the given pixel is over land.
#
#  Args:
#  @param pixel the pixel on the land/water map to be checked
#
#  Returns:
#  @returns boolean (true if over land)
def over_land(pixel):
    return array[pixel[0]][pixel[1]] == 1

## Generates a line of pixels from two given endpoints.
#
#  Args:
#  @param pixel1 the first endpoint point of the line 
#  @param pixel2 the second endpoint pixel of the line
#
#  Returns:
#  @returns list of pixels forming a line between the endpoints
def generate_line(pixel1, pixel2):
    x1, y1 = pixel1
    x2, y2 = pixel2
    if pixel1 == pixel2:
        return [pixel1]
    points = []
    if abs(y2 - y1) < abs(x2 - x1):
        if x2 > x1:
            inc = 1
        else:
            inc = -1
        slope = (y2 - y1) / (x2 - x1)

        def y(x):
            return slope * (x - x1) + y1

        for x in xrange(x1, x2 + inc, inc):
            points.append((x, roundf(y(x))))
    else:
        if y2 > y1:
            inc = 1
        else:
            inc = -1
        slope = (x2 - x1) / (y2 - y1)

        def x(y):
            return slope * (y - y1) + x1

        for y in xrange(y1, y2 + inc, inc):
            points.append((roundf(x(y)), y))
    return points

## Converts from latitude/longitude to pixels on a map projection.
#
#  Args:
#  @param coord 
#
#  Returns:
#  @returns tuple
def to_pixel(coord):
    x = MAP_WIDTH / 360 * coord[1] + MAP_WIDTH / 2
    y = -MAP_HEIGHT / 180 * coord[0] + MAP_HEIGHT / 2
    return (roundf(x), roundf(y))

## Returns the address of a coordinate.
#
#  Args:
#  @param coord: tuple
#
#  Returns:
#  @returns str
def get_address(coord):
    return nominatim.reverse(coord).address

## Converts an ISO 8601 timestamp to seconds from epoch.
#
#  Args:
#  @param timestamp: str
#
#  Returns:
#  @param float
def parse_time(timestamp):
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)

## Returns the Vincenty distance between two coordinates.
#
#  Args:
#  @param coord1: tuple
#  @param coord2: tuple
#
#  Returns:
#  @returns float
def vincenty(coord1, coord2):
    while True:
        try:
            return distance.vincenty(coord1, coord2).meters
        except:
            pass

## Returns the average of a list of numbers.
#
#  Args:
#  @param elements: list
#
#  Returns:
#  @returns float
def average(elements):
    return sum(elements) / len(elements)

## Class containing the path of a single package.
class package():

    ## Initializes the package with the first coordinate
    #  and the destination point.
    #
    #  Args:
    #  @param self the object pointer
    #  @param coord starting coordinate point
    #  @param destination tuple of format (latitude, longitude)
    #
    #  Coordinates except for destination are tuples of the format:
    #  (latitude, longitude, elevation, time).
    def __init__(self, coord, destination):       
        self.coords = [[coord]]
        self.destination = destination
        self.speeds = list(DEFAULT_SPEEDS)
        self.land_speeds = [DEFAULT_SPEEDS[0]]
        self.water_speeds = [DEFAULT_SPEEDS[1]]
        vehicle = self.get_vehicle(coord)
        self.dist = vincenty(coord[:2], self.destination)
        if vehicle == 0:
            self.seen_land = True
            self.seen_water = False
        else:
            self.seen_water = True
            self.seen_land = False
        self.poi = [[coord, vehicle]]

    ## Returns the mode of transport of the package at the coordinate,
    #  where 0 is for car, and 1 is for boat/ship/plane.
    #
    #  Args:
    #  @param self the object pointer
    #  @param coord the coordinate to check the mode for
    #
    #  Returns:
    #  @returns int (0 is for land, 1 is for water)
    def get_vehicle(self, coord):
        x, y = to_pixel(coord[:2])
        if not over_land((x, y)):
            return 1
        else:
            return 0

    ## Adds a point to the current path,
    #  and creates a new segment if needed.
    #
    #  Args:
    #  @param self the object pointer
    #  @param coord tuple
    def add_point(self, coord):
        segment = self.coords[-1]
        vehicle = self.get_vehicle(coord)
        if vehicle != self.get_vehicle(segment[-1]):
            self.coords.append([])
            if vehicle == 0:
                if self.seen_land:
                    self.land_speeds.append(0)
                else:
                    self.seen_land = True
            else:
                if self.seen_water:
                    self.water_speeds.append(0)
                else:
                    self.seen_water = True
            self.poi.append([coord, vehicle])
        self.coords[-1].append(coord)
        if vehicle == 0:
            self.land_speeds[-1] = self.get_speed()
        else:
            self.water_speeds[-1] = self.get_speed()
        self.speeds = [average(self.land_speeds), average(self.water_speeds)]
        self.dist = vincenty(coord[:2], self.destination)

    ## Returns the average speed of the package during the current segment
    #  in meters per second.
    #
    #  Args:
    #  @param self
    #
    #  Returns:
    #  @returns float
    def get_speed(self):
        segment = self.coords[-1]
        if len(segment) > 1:
            coord1 = segment[0][:3]
            time1 = segment[0][3]
            coord2 = segment[-1][:3]
            time2 = segment[-1][3]
            distance = vincenty(coord1[:2], coord2[:2])
            time = time2 - time1
            return abs(distance / time)
        else:
            vehicle = self.get_vehicle(segment[-1])
            return DEFAULT_SPEEDS[vehicle]

    ## Returns the estimated time remaining for the package to arrive.
    #
    #  Args:
    #  @param self
    #
    #  Returns:
    #  @returns float
    def etr(self):
        segment = self.coords[-1]
        coord = segment[-1][:2]
        land_speed, water_speed = self.speeds
        distance = vincenty(coord, self.destination)
        pixel1, pixel2 = to_pixel(coord), to_pixel(self.destination)
        line = generate_line(pixel1, pixel2)
        interval = distance / len(line)
        surfaces = list(map(over_land, line))
        land_time = surfaces.count(True) * interval / land_speed
        water_time = surfaces.count(False) * interval / water_speed
        return land_time + water_time
