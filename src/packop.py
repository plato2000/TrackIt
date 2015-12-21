import math
import time
import geopy
from geopy import distance
import json

nominatim = geopy.Nominatim()
DEFAULT_SPEEDS = (27, 245) #m/s
RADIUS = 6.371e6 #m
MAP_WIDTH, MAP_HEIGHT = 10800, 5400
file = open("map.json")
array = json.loads(file.read())
file.close()

def to_pixel(coord: tuple) -> tuple:
    '''Converts from latitude/longitude to pixels on a map projection.'''
    x = MAP_WIDTH / 360 * coord[1] + MAP_WIDTH / 2
    y = -MAP_HEIGHT / 180 * coord[0] + MAP_HEIGHT / 2
    return (round(x), round(y))

def get_address(coord: tuple) -> str:
    '''Returns the address of a coordinate.'''
    return nominatim.reverse(coord).address

def parse_time(timestamp: str) -> float:
    '''Converts an ISO 8601 timestamp to seconds from epoch.'''
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)

def vincenty(coord1: tuple, coord2: tuple) -> float:
    while True:
        try:
            return distance.vincenty(coord1, coord2).meters
        except:
            pass

def average(elements: list) -> float:
    return sum(elements) / len(elements)

class package():
    '''Class containing the path of a single package.'''
    def __init__(self, coords: list, destination: tuple):
        '''Initialize the package with a list of past coordinates (including start) and the
destination point. Coordinates are tuples of the format:
(latitude, longitude, elevation, time)'''
        self.coords = coords
        self.destination = destination
        self.speeds = list(DEFAULT_SPEEDS)
        self.land_speeds = [DEFAULT_SPEEDS[0]]
        self.water_speeds = [DEFAULT_SPEEDS[1]]

    def get_vehicle(self, coord: tuple) -> int:
        '''Returns the mode of transport of the package at the coordinate, where 0 is for
car, and 1 is for boat/ship/plane.'''
        x, y = to_pixel(coord[:2])
        if array[x][y] == 0:
            #For now, water defaults to plane
            return 1
        else:
            return 0

    def add_point(self, coord: tuple):
        '''Adds a point to the current path, and creates a new segment if needed.'''
        segment = self.coords[-1]
        vehicle = self.get_vehicle(coord)
        if vehicle != self.get_vehicle(segment[-1]):
            self.coords.append([])
            if vehicle == 0:
                self.land_speeds.append(0)
            else:
                self.water_speeds.append(0)
        self.coords[-1].append(coord)
        if vehicle == 0:
            self.land_speeds[-1] = self.get_speed()
        else:
            self.water_speeds[-1] = self.get_speed()
        self.speeds = [average(self.land_speeds), average(self.water_speeds)]
    
    def get_speed(self) -> float:
        '''Returns the average speed of the package during the current segment in meters per
second.'''
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
