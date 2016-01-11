# Managing database
import MySQLdb
import time
from datetime import datetime

# Opens database connection - Host and password may change later
db = MySQLdb.connect("localhost","admin","password1","IDT")

# Opens database connection
cursor = db.cursor()


def create_table(uuid):
    """Creates a new table for a new package."""
    command = "CREATE TABLE " + uuid + " (Latitude double(7,4), \
                                         Longitude double(7,4), \
                                         Elevation INT(6), \
                                         Time INT(10) PRIMARY KEY)"
    try:
        cursor.execute(command)
        db.commit()
        print("ok")
    except:
        db.rollback()


def insert_location(uuid, latitude, longitude, elevation, time):
    """Inserts a package's data into database - happens every 10 seconds.
       Not finished."""
    now = datetime.now()
    now_tuple = now.timetuple()
    #Converts datetime into seconds
    seconds = int(time.mktime(now_tuple))
    command = "INSERT INTO " + uuid + " (Latitude, Longitude, Elevation, Time \
               VALUES ('%d', '%d', '%d', '%d')" % \
               (latitude, longitude, elevation, seconds)
    try:
        cursor.execute(command)
        db.commit()
    except:
        db.rollback()


def get_locations(uuid, time):
    """Gets a package's raw data from database."""
    command = "SELECT * FROM " + uuid + " WHERE Time > " + time
    try:    
        cursor.execute(command)
        # Gets all previous locations of (pkg_name)
        results = cursor.fetchall()
        return results
    except:
        db.rollback()


def close_database():
    # Close database connection
    db.close()
