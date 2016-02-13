import subprocess
import glob

## A list of the GPX files to load in for use in the run
gpx_files = glob.glob("gpx_files/*.gpx")
## A list of subprocesses for simulating each of the GPX files
processes = [subprocess.Popen(["groovy", "PackageEventsSimulator.groovy",
                               "-n", n]) for n in gpx_files]

for p in processes:
    p.wait()
