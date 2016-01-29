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


def roundf(thing):
    return int(round(thing))

def over_land(pixel):
    '''(pixel: tuple) -> bool
    Returns whether or not the given pixel is over land.'''
    return array[pixel[0]][pixel[1]] == 1


def generate_line(pixel1, pixel2):
    '''(pixel1: tuple, pixel2: tuple) -> list
    Generates a line of pixels from two given endpoints.'''
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


def to_pixel(coord):
    '''(coord: tuple) -> tuple
    Converts from latitude/longitude to pixels on a map projection.'''
    x = MAP_WIDTH / 360 * coord[1] + MAP_WIDTH / 2
    y = -MAP_HEIGHT / 180 * coord[0] + MAP_HEIGHT / 2
    return (roundf(x), roundf(y))


def get_address(coord):
    '''(coord: tuple) -> str
    Returns the address of a coordinate.'''
    return nominatim.reverse(coord).address


def parse_time(timestamp):
    '''(timestamp: str) -> float
    Converts an ISO 8601 timestamp to seconds from epoch.'''
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)


def vincenty(coord1, coord2):
    '''(coord1: tuple, coord2: tuple) -> float
    Returns the Vincenty distance between two coordinates.'''
    while True:
        try:
            return distance.vincenty(coord1, coord2).meters
        except:
            pass


def average(elements):
    '''(elements: list) -> float
    Returns the average of a list of numbers.'''
    return sum(elements) / len(elements)


class package():
    '''Class containing the path of a single package.'''
    def __init__(self, coord, destination):
        '''(self, coords: list, destination: tuple)
        Initializes the package with the first coordinate
        and the destination point.
        Coordinates are tuples of the format:
        (latitude, longitude, elevation, time).
        '''
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

    def get_vehicle(self, coord):
        '''(self, coord: tuple) -> int
        Returns the mode of transport of the package at the coordinate,
        where 0 is for car, and 1 is for boat/ship/plane.
        '''
        x, y = to_pixel(coord[:2])
        if not over_land((x, y)):
            # For now, water defaults to plane
            return 1
        else:
            return 0

    def add_point(self, coord):
        '''(self, coord: tuple)
        Adds a point to the current path,
        and creates a new segment if needed.
        '''
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

    def get_speed(self):
        '''(self) -> float
        Returns the average speed of the package during the current segment
        in meters per second.
        '''
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

    def etr(self):
        '''(self) -> float
        Returns the estimated time remaining for the package to arrive.'''
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
