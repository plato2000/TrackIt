import math
import time
import geopy

nominatim = geopy.Nominatim()
DEFAULT_SPEEDS = [27, 13, 245]#m/s
RADIUS = 6.371e6#m

def get_address(coord) -> str:
    return nominatim.geocode(coord).address

def parse_time(timestamp) -> float:
    ts = time.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return time.mktime(ts)

def versine(theta) -> float:
    return 1 - math.cos(theta)

def haversine(coord1, coord2) -> float:
    hav = lambda theta: versine(theta) / 2
    coord1, coord2 = list(map(math.radians, coord1)), list(map(math.radians, coord2))
    lat1, lat2 = coord1[0], coord2[0]
    d_lat = abs(lat2 - lat1)
    d_long = abs(coord2[1] - coord1[1])
    return hav(d_lat) + math.cos(lat1) * math.cos(lat2) * hav(d_long)

def orthodromic_distance(coord1, coord2) -> float:
    c = 2 * math.asin(math.sqrt(haversine(coord1, coord2)))
    return RADIUS * c

class package():
    def __init__(self, coords: list, destination: tuple):
        self.coords = coords
        self.destination = destination
        
    def get_vehicle(self) -> int:
        segment = self.coords[-1]
        coord = segment[0-1][:3]
        if coord[2] < 10000:
            return 2
        elif get_address(coord) == None:
            return 1
        else:
            return 0
    
    def get_speed(self) -> float:
        segment = self.coords[-1]
        if len(segment) > 1:
            coord1 = segment[0][::3]
            time1 = parse_time(segment[0][3])
            coord2 = segment[-1][::3]
            time2 = parse_time(segment[-1][3])
            distance = orthodromic_distance(coord1, coord2)
            time = time2 - time1
            return abs(distance / time)
