#Managing database
import MySQLdb

#Opens database connection - Host and password may change later
db = MySQLdb.connect("localhost","admin","password1","IDT")

#Opens database connection
cursor = db.cursor()

def insert_location(uuid, pkg_name, latitude, longitude,
                    start_lat, start_long, end_lat, end_long):
    '''Inserts a package's data into database - happens every 10 seconds.'''
    command = "INSERT INTO location(UUID, pkgName, latitude, longitude, \
               StartLat, StartLong, EndLat, EndLong) \
               VALUES ('%s', '%s', '%d', '%d', '%d', '%d', '%d', '%d')" % \
               (uuid, pkg_name, latitude, longitude,
                start_lat, start_long, end_lat, end_long)
    try:
        cursor.execute(command)
        db.commit()
    except:
        db.rollback()


def get_location(pkg_name):
    '''Gets a package's raw data from database.'''
    command = "SELECT * FROM location WHERE pkgName = 'Apkg'"
    try:    
        cursor.execute(command)
        #Gets all previous locations of (pkg_name)
        results = cursor.fetchall()
        #Gets most recent location of (pkg_name)
        current = results[len(results)-1]
        print(current)
        coordinates = (current[2], current[3])
        start_location = (current[4], current[5])
        end_location = (current[6], current[7])
        uuid = current[0]
        pkgName = current[1]
    except:
        db.rollback()

#Close database connection
db.close()
