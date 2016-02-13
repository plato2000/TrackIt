import gpxpy
import datetime
import time
import glob

print(glob.glob('gpx_files/*.gpx'))
for FILE_NAME in glob.glob('gpx_files/*.gpx'):
    ## The GPX object created from the GPX file data
    gpx = gpxpy.parse(open(FILE_NAME))
    ## The current time in seconds from epoch
    now = time.time()
    ## The seconds needed to shift the GPX's time to now
    change = now - gpx.tracks[0].segments[0].points[0].time.timestamp() + 6000
    ## The shift represented as a datetime.timedelta
    delta = datetime.timedelta(0, change, 0)
    gpx.adjust_time(delta)
    ## The time-shifted data for the GPX file
    temp_text = gpx.to_xml()
    temp_text = temp_text.replace('">\n<time', '">\n<ele>0</ele>\n<time')
    temp_text = temp_text.replace(".0</ele>", '</ele>')
    ## The GPX that is being shifted
    file = open(FILE_NAME, "w")
    file.write(temp_text)
    file.close()
