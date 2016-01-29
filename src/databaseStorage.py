# Managing database
import MySQLdb
import sys, traceback


def create_table(uuid, name, dest_lat, dest_lon):
    """
    Creates a new table for a new package.

    Args:
        uuid: the UUID of the package being added
        name: the name of the package being added
        dest_lat: the latitude of the destination of the package
        dest_lon: the longitude of the destination of the package
    """
    # print "creating table for uuid", uuid
    command = "CREATE TABLE \"" + uuid + "\" (Latitude DOUBLE(7,4), Longitude DOUBLE(7,4), Elevation INT(6), Time INT(10) PRIMARY KEY)"
    command2 = "INSERT INTO uuids (uuid, nameString, delivered, destLat, destLon) VALUES ('%s', '%s', 'N', %f, %f)" % \
               (uuid, name, dest_lat, dest_lon)

    print "command2:", command2

    execute_command(command)
    execute_command(command2)


def insert_location(uuid, latitude, longitude, elevation, time_var):
    """
    Inserts a package's data into database.
    Not finished.

    Args:
        uuid: the uuid of the package where things are inserted
        latitude: the latitude of the location at time
        longitude: the longitude of the location at time
        elevation: the elevation of the package at time
        time: the time at which the location is reached

    """
    print "inserting location"
    # now = datetime.now()
    # now_tuple = now.timetuple()
    # Converts datetime into seconds
    # seconds = int(time.mktime(now_tuple))
    print "time_var:", time_var
    command = "INSERT INTO \"" + uuid + "\" (Latitude, Longitude, Elevation, Time) \
               VALUES (%f, %f, %d, %d)" % \
               (latitude, longitude, elevation, time_var)
    execute_command(command)


def make_delivered(uuid):
    """
    Sets a package's delivered status to true in the database

    Args:
        uuid: the uuid of the package to set delivered
    """
    command = "UPDATE uuids SET delivered='Y' WHERE uuid=" + uuid
    execute_command(command)


def get_locations(uuid, time_var):
    """
    Gets a package's raw data from database.

    Args:
        uuid: the uuid of the package to get data for
        time_var: the timestamp (in seconds since 1/1/1970) to start new results

    Returns:
        list of dictionaries of package data
    """
    command = "SELECT * FROM \"" + uuid + "\" WHERE Time > " + str(time_var) + " ORDER BY Time ASC"
    results = execute_command(command, results=True)

    if results != False:
        return [{"coords": (i[0], i[1]), "ele": i[2], "time": i[3]} for i in results]

def get_name(uuid):
    """
    Gets a package's name from its uuid

    Args:
        uuid: the uuid of the package to get a name for

    Returns:
        string (the name of the package)
    """
    command = "SELECT nameString FROM uuids WHERE uuid='" + uuid + "'"
    results = execute_command(command, results=True)
    print "name of", uuid, "is", results
    if results != False:
        return results[0]

def get_first_data(uuid):
    """
    Gets a package's first package data (starting location)

    Args:
        uuid: the uuid of the package to get starting location for

    Returns:
        A dictionary of package data
    """
    command = "SELECT * FROM \"" + uuid + "\" ORDER BY Time ASC LIMIT 1"
    results = execute_command(command, results=True)
    print "first data of", uuid, "is", results
    if results != False:
        return [{"coords": (i[0], i[1]), "ele": i[2], "time": i[3]} for i in results][0]


def get_current_data(uuid):
    """
    Gets a package's last package data (current location)

    Args:
        uuid: the uuid of the package to get current location for

    Returns:
        A dictionary of package data
    """
    command = "SELECT * FROM \"" + uuid + "\" ORDER BY Time DESC LIMIT 1"
    results = execute_command(command, results=True)
    print "current_data of", uuid, "is", results
    if results != False:
        return [{"coords": (i[0], i[1]), "ele": i[2], "time": i[3]} for i in results][0]


def get_destination_of_package(uuid):
    """
    Gets the destination of package.

    Args:
         uuid: the uuid for which to get a destination
    Returns:
        a tuple (lat, lon)
    """
    command = "SELECT destLat, destLon FROM uuids WHERE uuid='" + uuid + "'"
    results = execute_command(command, results=True)
    print "destination of", uuid, ":", results
    if results != False:
        return results[0]


def get_all_uuids(get_delivered=False):
    """
    Gets all of the UUIDs tracked by the system.

    Args:
        get_delivered: Whether or not to include delivered packages (default: False)

    Returns:
        list of UUIDs
    """
    if get_delivered:
        command = "SELECT uuid FROM uuids"
    else:
        command = "SELECT uuid FROM uuids WHERE delivered='N'"
    results = execute_command(command, results=True)
    if results != False:
        return [i[0] for i in results]


def get_delivered_packages():
    """
    Gets all packages marked as delivered.

    Returns:
        list of UUIDs
    """
    command = "SELECT uuid FROM uuids WHERE delivered='Y'"
    results = execute_command(command, results=True)
    if results != False:
        return [i[0] for i in results]


def get_undelivered_packages():
    """
    Gets all packages not marked as delivered (currently being processed)

    Returns:
        list of UUIDs
    """
    command = "SELECT uuid FROM uuids WHERE delivered='N'"
    results = execute_command(command, results=True)
    if results != False:
        return [i[0] for i in results]


def is_valid_uuid(uuid):
    """
    Checks if uuid is in database of uuids.

    Args:
        uuid: uuid to check validity for

    Returns:
        boolean (true if it's there)
    """
    results = execute_command("SELECT uuid FROM uuids WHERE uuid='" + uuid + "'", results=True)
    print "is_valid_uuid:", results
    return len(results) > 0

def is_delivered(uuid):
    """
    Checks if package with given uuid is delivered.

    Args:
        uuid: uuid to check delivery status for

    Returns:
        boolean (true if it's delivered)
    """
    results = execute_command("SELECT delivered FROM uuids WHERE uuid='" + uuid + "'", results=True)
    print "delivery_status:", results
    return results[0] == 'Y'


def close_database():
    # Close database connection
    db.close()


def clear_database_and_create_new():
    # command = "DROP DATABASE idt; CREATE DATABASE idt;"
    command1 = "CREATE TABLE uuids (uuid CHAR(36) PRIMARY KEY, nameString TINYBLOB, delivered ENUM('Y', 'N'), destLat DOUBLE(7, 4), destLon DOUBLE(7,4));"
    # execute_command(command)
    execute_command(command1)
    # execute_command("USE idt")


def execute_command(command, results=False):
    """
    Executes SQL command given to it

    Args:
        command: the command to execute
        results: whether or not to get results
    Returns:
        success of command (or results if successful and results=True
    """
    try:
        cursor.execute(command)
        if results:
            return cursor.fetchall()
        else:
            db.commit()
            return True
    except:
        traceback.print_exc(file=sys.stdout)
        db.rollback()
        return False


# Opens database connection - Host and password may change later
db = MySQLdb.connect(host="localhost", user="admin", passwd="password1", db="idt")

# Opens database connection
cursor = db.cursor()
execute_command('SET SQL_MODE="ANSI_QUOTES";')

# TODO: Delete following line for deployed mode
clear_database_and_create_new()
