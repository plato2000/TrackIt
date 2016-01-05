import gpxpy
import datetime
import time

gpx = gpxpy.parse(open("Annapolis_to_WestPoint_10sec.gpx"))
now = time.time()
change = now - gpx.tracks[0].segments[0].points[0].time.timestamp() + 30
delta = datetime.timedelta(0, change, 0)
gpx.adjust_time(delta)
file = open("new.gpx", "w")
file.write(gpx.to_xml())
file.close()