TrackIt: How to Use and Extend
==============================
###Written by People Who Code
<i>
Cindy Chen, Parth Oza, Jagan Prem, Kevin Shen
</i>

## 0. Abstract ##
The purpose of this document (and site) is to inform future developers for TrackIt on how to use and add functionality. TrackIt is a web app designed to be able to take HTTP GET and HTTP POST requests in order to receive package location updates. The server (written in Python) receives updates, stores package locations in a MySQL database, and calculates data such as ETA and distance remaining. It also provides a web page to the client (written in HTML, CSS, and JavaScript), which uses Google Maps to display a map that shows package positions and the path they have taken. The client also displays an expandable table that includes data about the package. It has two modes, one for a package receiver, who has to input a UUID to view a package, and one for an administrator who can view all packages without knowing the UUIDs.

(Detailed code documentation is on this site - the code is documented using Doxygen.) 

## 1. Introduction ##
This project is versioned using `git`.

The folder structure of the repository is as follows:

```
├── IDT_Server
│   └── gpx_files
├── docs
├── src
├── static
│   ├── css
│   ├── fonts
│   └── js
└── templates
```

#### `IDT_Server` directory ####
Files provided by IDT at the start of the contest and related files that were created as utilities. These include the Groovy scripts for package event simulation, the test server, and the .gpx files for sample package paths.

#### `src` directory ####
Files for server, written by People Who Code. These include the run.py server start script and other Python scripts used internally for calculations, saving to a database, etc.

#### `static` directory ####
Helper files for client side web app - not the HTML. This includes files such as the JQuery libraries, Bootstrap libraries, Material Design libraries, and the default glyphicons fonts for Bootstrap. It also includes our own main.js file, as well as our custom main.css file.

#### `templates` directory
This is where the HTML file for the web app is stored. It is only one HTML file called `index.html`. This includes some Jinja2 syntax, so it will not work as an HTML file by itself.

#### Notes / Other important information ####
The server runs by default on port 5000 at localhost. The server-side Python files use a number of dependencies, which are as follows:

```
flask 0.10.1
geopy 1.11.0
MySQLdb 1.2.5
python-dateutil 2.4.1
gpxpy 1.0.0
```
There are other dependencies that are built in with a standard Python 2.7.3 installation.
The server will also have to have MySQL installed. The version used here is 5.7.10. 

## 2. How to Set Up and Run ##

Please see the README.md file on the sidebar to learn how to clone this project using `git` and install MySQL and Python.

On the MySQL server, there should be a database called `idt`. In this database, there should be a table called `uuids` and a table for each package that is tracked. These tables can be created using the `clear_database_and_create_new()` function in the `database_storage.py` file.

The account on the MySQL server that database_storage.py uses is called `admin` and its password is `password1`. This should be changed for production - just change this in the `database_storage.py` file in the corresponding location. The privileges it needs are `SELECT`, `INSERT`, `DELETE`, `CREATE`, and `DROP`. It only uses `DELETE` and `DROP` for the `clear_database_and_create_new()` function, so if that is not needed, this user does not need those privileges.

Since the server runs on port 5000 by default, this port should be opened and forwarded if this is not already done. If it is on a production server, this should be changed to run on port 80 for HTTP.

To start the server, simply run `run.py` in Python 2.7.3 or higher. To enable debugging mode, set `debug=True` in the `app.run()` function call at the bottom of the file.


## 3. Server: Package Operations ##
The server-side calculations take place in `src/packop.py` and are based on use of the package class. Instances of the class store data involving the path of a single package. The class also contains methods for calculating information about the package such as ETR (Estimated Time Remaining) and distance remaining.

ETR calculations are somewhat processor intensive, so they are not done clientside. In order to calculate ETR, a straight line path is computed for the package to go from its current location to its destination. Then, the path is divided into segments of land and water. This path division is done by loading in a low resolution map of the world that is stored in `src/map.json`. A speed is calculated for each segment depending on its previous speeds on that surface. 

## 4. Server: MySQL ##
The `src/database_storage.py` file manages the storage and management of data in the MySQL database. It creates a new table for each package it tracks. It manages a table of `uuids` and one table for each individual package that is added to the system. Detailed documentation is with the associated functions. 

## 5. Server: Flask ##
The `run.py` server handles communication between the clientside and the serverside. It serves the webpage and returns results that it gets from the database. It also receives data from the package events simulator or the real packages and stores that in the database. The server is built on Flask. 

## 6. Client: Bootstrap 3 and other CSS ##
The clientside web app is built on Bootstrap 3 CSS. The CSS is in `static/css`. This means that the webpage is responsive - it rescales for differently sized clients. It automatically works for mobile devices. There is a custom Bootstrap theme that was written by Federico Zivolo. This is a Material Design theme based on the Material Design concept from Google. It is located at `static/css/bootstrap-material-design.min.css`. This theme has a few JavaScript files associated with it such as `static/js/ripples.js` and `static/js/material.js`. These handle the ripples on buttons when clicked and other graphical effects associated with Material Design.

There are also some other CSS files associated with Bootstrap themes. `static/css/jumbotron-narrow.css` includes the CSS for the particular Bootstrap layout we chose to use. 

There are some JS files that are for Bootstrap also. `static/js/ie10-viewport-bug-workaround.js` and `static/js/ie-emulation-modes-warning.js` are files provided by Bootstrap to fix weird quirks with specific versions of Internet Explorer.

There is also a custom CSS file (`static/css/main.css`) that is used for simple resizing of particular elements. 

## 7. Client: Google Maps ##
Google Maps is used for two purposes in this solution. The first is to display a map with package positions on it, and the second is for reverse geocoding. For both, Google Maps JavaScript API v3 is used.

#### API Loading ####
The Google Maps JavaScript API is loaded as a standard script:
```
<script async defer src="https://maps.googleapis.com/maps/api/js?key=KEY&signed_in=true&callback=initMap"></script>
```
The script is loaded asynchronously, so as to not impact page load times. The URL of the script includes a variable for a callback function name. This is the function that is called after the API finishes loading. In this solution, all of the JavaScript functions that run on an interval and all of the page start functions are called from this initMap function. All of these functions are documented on this site.

#### Map ####
The map consists of two main parts: the actual map, and the things that are drawn on top of it. 

The map is handled completely by the Maps API.

Objects of type `Polyline`, `Marker`, and `InfoWindow` are placed on top of this map. They are managed in dictionaries with the key as the package UUID to which they belong. Detailed code documentation is on this site and in the source files.

#### Reverse Geocoding ####
This is also done using the Google Maps JavaScript API v3. Here, a call is made to the Google Maps server for the coordinates (a package's current, destination, or start coordinates). The Maps server responds with a human-readable location name for the place - generally a street address or range of street addresses if that is available. On the free plan of Google Maps JS API that we have, the limit is five requests per second. This means that when multiple packages are loaded quickly (for example in admin mode), it will error out with `OVER_QUERY_LIMIT`. In this case, the function will call itself in five seconds after that query limit has definitely passed.

## 8. Client: Moment.js ##
The Moment.js library is located in `static/js/moment.min.js`. This does conversions of time. In this project, it is used to make ETA into a human-readable format. The server passes the client a time in seconds for the time that the package is expected to reach the destination (details about this calculation above). Moment.js converts this time in seconds to a readable time - for example, at 8:05 pm, if something was scheduled to reach its destination at 9:00 pm (~3,300 seconds), the value passed by the server would be 3300. Moment.js would convert this to a string that said "Today at 9:00 pm". This works even if the time is much longer - it would convert a time of 18,748,800 that was received on 2/1/2016 to "3/3/2016" for 31 days having passed. It automatically formats the string depending on how far off it is.

## 9. Client: Custom JS ##
There is custom JS written by People Who Code that does communication with the server, places packages on the map, puts entries in the table, enables admin mode, and much more. Detailed documenatation for this code is on the site.

## 10. Utility Scripts and Testing ##
There are some utility scripts that were written for this project by People Who Code. These were written in an effort to counteract some of the bugs in the provided testing software.

For example, `IDT_Server/time_shifter.py` was written because when `IDT_Server/PackageEventsSimulator.groovy` file was run with multiple `.gpx` files for testing, it did not shift the starting times correctly by itself. `time_shifter.py` corrected this by changing the timestamps in each individual `.gpx` file to be 30 seconds from the time of running.

`IDT_Server/package_events.py` was written for the same purpose after feedback was received from IDT about this bug. The solution was to run `PackageEventsSimulator.groovy` with one `.gpx` file at a time. `package_events.py` creates multiple subprocesses that do this for each `.gpx` file.

## 11. Other Miscellaneous Points of Note ##
`src/__init__.py` exists so that Python recognizes `src` as a package. This has to be done since `run.py` is out of the `src` directory for convenience of running, so to use the files in the `src` folder, it has to import them from `src` like so:

```
from src import packop, database_storage
```

Python will not allow this line unless `src` is a recognized package - hence, `__init__.py`.

jQuery v2.1.4 is included (`static/js/jquery.min.js`) for Bootstrap, Google Maps, and other JS we wrote. There is a jQuery plugin for the color picker (`static/js/jquery.minicolors.min.js`).

## 12. Extensibility: Accessibility Features ##
Accessibility features for users are really easy to implement for a webpage. For a start, many users who are shortsighted already use a browser zoom set to more than 100%. This means that the browsers will automatically render everything on the site bigger to help with that.

For users using screen readers, `aria-label` tags can be added to certain HTML elements - as they already are for some obscure elements such as the icons for expanding table rows.

To increase contrast, another CSS file with inverted colors could be added and loaded only when the user wants that feature to be enabled.

## 13. Extensibility: Security ##
As of now, we have not implemented a login page for users of the solution. However, it would be fairly simple for future developers to add a login-based security system seeing as we already are using MySQL. As such, all that is necessary is a table storing the usernames and the associated hashes of their passwords, an extra username key in the package table, and a front-end login page to take input for the user information.
