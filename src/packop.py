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
#  @param pixel The pixel on the land/water map to be checked
#
#  @returns Boolean (true if over land)
def over_land(pixel):
    return array[pixel[0]][pixel[1]] == 1


## Generates a line of pixels from two given endpoints.
#
#  @param pixel1 The first endpoint point of the line
#  @param pixel2 The second endpoint pixel of the line
#
#  @returns List of pixels forming a line between the endpoints
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
#  @param coord A tuple of (lat, lon)
#
#  @returns Tuple coordinates on the land/water map 
def to_pixel(coord):
    x = MAP_WIDTH / 360 * coord[1] + MAP_WIDTH / 2
    y = -MAP_HEIGHT / 180 * coord[0] + MAP_HEIGHT / 2
    return (roundf(x), roundf(y))


## Returns the address of a coordinate.
#
#  @param coord A tuple of (lat, lon)
#
#  @returns String form of street address of coordinates
def get_address(coord):
    return nominatim.reverse(coord).address


## Converts an ISO 8601 timestamp to seconds from epoch.
#
#  @param timestamp String in ISO 8601 format
#
#  @param Float of the seconds since epoch to the time given
def parse_time(timestamp):
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)


## Returns the Vincenty distance between two coordinates.
#
#  @param coord1 Tuple of (lat, lon)
#  @param coord2 Tuple of (lat, lon)
#
#  @returns Float of distance in meters from coord1 to coord2
def vincenty(coord1, coord2):
    while True:
        try:
            return distance.vincenty(coord1, coord2).meters
        except:
            pass


## Returns the average of a list of numbers.
#
#  @param elements List of numbers
#
#  @returns Float representing the average of the numbers
def average(elements):
    return sum(elements) / len(elements)


## Class containing the path of a single Package.
class Package():

    ## Initializes the Package with the first coordinate
    #  and the destination point.
    #
    #  @param self The object pointer
    #  @param coord Starting coordinate point
    #  @param destination Tuple of format (latitude, longitude)
    #
    #  Coordinates except for destination are tuples of the format:
    #  (latitude, longitude, elevation, time).
    def __init__(self, coord, destination):
        ## List of coordinates covered by the path of the package
        self.coords = [[coord]]
        ## The destination coordinate of the package
        self.destination = destination
        ## The average speeds of the package over both land and water,
        #  represented as a list in that respective order
        self.speeds = list(DEFAULT_SPEEDS)
        ## A list of average speeds for all land segments on the package's
        #  current path
        self.land_speeds = [DEFAULT_SPEEDS[0]]
        ## A list of average speeds for all water segments on the package's
        #  current path
        self.water_speeds = [DEFAULT_SPEEDS[1]]
        vehicle = self.get_vehicle(coord)
        ## The float distance from the current coordinates to the destination
        self.dist = vincenty(coord[:2], self.destination)
        if vehicle == 0:
            ## A boolean that stores whether the package has ever been on land
            #  on its current path.
            self.seen_land = True
            ## A boolean that stores whether the package has ever been on water
            #  on its current path.
            self.seen_water = False
        else:
            self.seen_water = True
            self.seen_land = False
        ## A list of coordinates where the package most likely switched vehicles
        self.poi = [[coord, vehicle]]

    ## Returns the mode of transport of the Package at the coordinate,
    #  where 0 is for car, and 1 is for boat/ship/plane.
    #  @param self The object pointer
    #  @param coord The coordinate to check the mode for
    #
    #  @returns Int (0 is for land, 1 is for water)
    def get_vehicle(self, coord):
        x, y = to_pixel(coord[:2])
        if not over_land((x, y)):
            return 1
        else:
            return 0

    ## Adds a point to the current path,
    #  and creates a new segment if needed.
    #
    #  @param self The object pointer
    #  @param coord Tuple of (lat, lon)
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

    ## Returns the average speed of the Package during the current segment
    #  in meters per second.
    #
    #  @param self The object pointer
    #
    #  @returns Float in m/s of the speed of the Package during the current segment
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

    ## Returns the estimated time remaining for the Package to arrive.
    #
    #  @param self The object pointer
    #
    #  @returns Float time remaining for the package to reach its destination
    def etr(self):
        segment = self.coords[-1]
        coord = segment[-1][:2]
        land_speed, water_speed = self.speeds
        pixel1, pixel2 = to_pixel(coord), to_pixel(self.destination)
        line = generate_line(pixel1, pixel2)
        interval = self.dist / len(line)
        surfaces = list(map(over_land, line))
        land_time = surfaces.count(True) * interval / land_speed
        water_time = surfaces.count(False) * interval / water_speed
        return land_time + water_time
