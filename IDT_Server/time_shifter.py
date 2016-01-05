import gpxpy
import datetime
import time
import glob

for FILE_NAME in glob.glob('gpx_files/*.gpx'):
    # FILE_NAME = "Annapolis_to_WestPoint_10sec.gpx"
    gpx = gpxpy.parse(open(FILE_NAME))
    now = time.time()
    change = now - gpx.tracks[0].segments[0].points[0].time.timestamp() + 60
    delta = datetime.timedelta(0, change, 0)
    gpx.adjust_time(delta)
    temp_text = gpx.to_xml()
    temp_text = temp_text.replace('">\n<time', '">\n<ele>0</ele>\n<time')
    temp_text = temp_text.replace(".0</ele>", '</ele>')
    file = open("FILE_NAME", "w")
    file.write(temp_text)
    file.close()