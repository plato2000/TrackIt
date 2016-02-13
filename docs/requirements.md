TrackIt: Software Requirements
===============================
###Written by People Who Code
<i>
Cindy Chen, Parth Oza, Jagan Prem, Kevin Shen
</i>

1. The solution shall handle multiple simultaneous GPS tracked packages sending updates.
 - We tested this requirement by using `package_events.py` (a program we created - see documentation) to simulate multiple GPS tracked packages sending updates and used the client to view the packages updating in real time.


2. The solution shall be easily accessible from a Windows 7 computer.
 - We tested this requirement through the use of Bootstrap 3 on a web app client to make it easy to access through Internet Explorer 8, the default web browser for a stock Windows 7 computer.


3.  The solution shall support an admin mode that shows all package location updates on a map.
 - We tested this requirement by using the admin mode we built in to the client, and clicking the button to give the admin the option to add all packages to the tracked list.


4. The solution shall support a user mode that shows a subset of package location updates on a map.
 - We tested this requirement by inputting test package UUIDs into the field on the web app client and displaying the packages’ current locations and the paths they have taken, as well as watching the locations change as they update on the map.


5. The solution shall accept a list of UUIDs in user mode to control the subset of package location updates displayed on the map.
 - We tested this requirement by inputting test UUIDs into the field on the web app client and watching as the appropriate packages showed up in the table below.


6. The solution shall accept name, destination, and GPS unit UUID information as HTTP query parameters on a HTTP GET of the URL path `/tracknewpackage`. An example follows: `GET http://127.0.0.1:8080/tracknewpackage?name=Some+Name+Here&destinationLat=42.4877185&destinationLon=-71.8249125&uuid=b0f9bb21-160f-4089-ad1c-56ae8b2d5c93`
 - We tested this requirement by using the provided `PackageEventsSimulator.groovy` file to send these messages to the server on our solution and then watching them show up in our MySQL database.


7. The solution shall respond with a JSON encoded body which includes the registered uuid on an HTTP GET of the URL path `/tracknewpackage`. An example follows: `GET Response Body: { "ackUUID":"[b0f9bb21-160f-4089-ad1c-56ae8b2d5c93]" }`
 - We tested this requirement by entering a sample HTTP GET request through Postman REST client and saw the correct response show up.


8. The solution shall accept a JSON encoded body which includes location, elevation, and time on a HTTP POST to the URL path `/packagetrackupdate/`. An example follows: `POST http://127.0.0.1:8080/packagetrackupdate/b0f9bb21-160f-4089-ad1c-56ae8b2d5c93` `POST Body: {"lat":"42.4879714","lon":"-71.8250924","ele":"195.9","time":"2015-12-08T08:42:33.188-05:00"}`
 - We tested this requirement by running the `PackageEventsSimulator.groovy` with the .gpx files and having the server receive updates for the packages while viewing the updates.


9. The solution shall accept a JSON encoded body which includes a delivered flag on a HTTP POST to the URL path `/packagetrackupdate/`. An example follows: `POST http://127.0.0.1:8080/packagetrackupdate/b0f9bb21-160f-4089-ad1c-56ae8b2d5c93` `POST Body: {"delivered":"true"}`
 - We tested this requirement by waiting for packages to be marked as delivered by the `PackageEventsSimulator.groovy` script, and seeing that the package was marked as delivered in the MySQL database in response.

10. The solution shall calculate and display distance to destination.
 - We tested this requirement by clicking on the dropdown menu and seeing that each package displayed its distance to the destination.

11. The solution shall calculate and display estimated arrival time.
 - We tested this requirement by looking at the table to see that each package showed its estimated arrival time.

### Additional Requirements (By Us): ###

12. The solution shall be able to display a selection of packages on a map.
 - We tested this feature by selecting some of the packages on the table on the client to be displayed on the map.


13. The solution shall be able to display a human-readable location for the starting point, current location, and destination of the package.
 - We tested this feature by selecting a package and observing that the information showed up.

14. The solution shall be able to recover its data in the event of a server shutdown.
 - We tested this feature by starting to track a number of packages, restarting the server, and seeing that the previously selected packages loaded once more.

15. The solution shall be able to maintain a database of package positions for all packages ever tracked by the system.
 - We tested this feature by having a “Select all delivered” button for admin mode that showed all packages that were stored in the database if they were delivered and a similar button for undelivered packages and when both are selected, all packages ever stored are displayed.


16. The solution shall be accessible easily from a mobile phone or a tablet.
 - We tested this feature by changing the user agent and size of the screen in Chrome Developer Options and seeing that everything responded as expected.


17. The solution shall be modular enough to allow for future extension on accessibility.
 - We know this works because a CSS file has the ability to change the colors and the browser zoom increases font sizes and colors across the whole webpage.

18. The solution shall be modular enough to allow for future extension on security.
 - We know this works because we already have a MySQL database for storing package updates, and adding another table for usernames and passwords would be fairly easy.
