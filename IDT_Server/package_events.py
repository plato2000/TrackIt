import subprocess
import glob

gpx_files = glob.glob("gpx_files/*.gpx")
processes = [subprocess.Popen(["groovy", "PackageEventsSimulator.groovy",  "-n", n]) for n in gpx_files]
# print processes

for p in processes:
    p.wait()
