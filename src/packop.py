import math
import time
import geopy
from geopy import distance

nominatim = geopy.Nominatim()
DEFAULT_SPEEDS = [27, 13, 245]#m/s
RADIUS = 6.371e6#m

def get_address(coord: tuple) -> str:
    '''Returns the address of a coordinate.'''
    return nominatim.reverse(coord).address

def parse_time(timestamp: str) -> float:
    '''Converts an ISO 8601 timestamp to seconds from epoch.'''
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)

def vincenty(coord1: tuple, coord2: tuple):
    return distance.vincenty(coord1, coord2).meters

class package():
    '''Class containing the path of a single package.'''
    def __init__(self, coords: list, destination: tuple):
        '''Initialize the package with a list of past coordinates (including start) and the
destination point. Coordinates are tuples of the format:
(latitude, longitude, elevation, time)'''
        self.coords = coords
        self.destination = destination

    def get_vehicle(self, coord: tuple) -> int:
        '''Returns the mode of transport of the package at the coordinate, where 0 is for
car, 1 is for boat/ship, and 2 is for plane.'''
        if coord[2] > 10000:
            return 2
        elif get_address(coord[:3]) == None:
            return 1
        else:
            return 0

    def add_point(self, coord: tuple):
        '''Adds a point to the current path, and creates a new segment if needed.'''
        segment = self.coords[-1]
        if self.get_vehicle(coord) != self.get_vehicle(segment[-1]):
            self.coords.append([])
        self.coords[-1].append(coord)
    
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
