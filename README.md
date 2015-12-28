# README #

## What is this repository for? ##

This repository is for Parth Oza, Kevin Shen, Jagan Prem, and Cindy Chen's 2015-2016 IDT Automated Software Testing project - automated package tracking and analysis.

## How do I get set up? ##

### Summary of set up ###

Run `git clone` using the URL on the sidebar to clone the repository.

We are only using the `master` branch for release builds - as in when everything is working, we merge to master and then go back to develop for other things.

To switch to the `master` branch, do `git checkout master`. Before and after every `git` operation you do, you should do `git pull` to prevent merge conflicts.

After we get basic stuff done, we will switch to using different branches for each person.

To add your changes to the `index`, you do `git add -A` or `git add FILENAME` if you just want to add a few files.

To commit your changes, run `git commit -m "message"`, where message is your commit message.

After you commit, run `git push`, which will send everything to the server.

### Configuration ###

The code that is on here is serverside. Our server is going to be separate from the IDT server, though it may be on the same machine. 

### Dependencies ###

The current dependencies are:

```
    flask 0.10.1
    geopy 1.11.0
```

If you add libraries to your Python installation, add them to this list so the rest of us know what to get.

Generally, to install Python libraries, you just run `pip3 install LIBRARYNAME`, where `LIBRARYNAME` is the name of the library. `pip3` may not be in your `PATH`. If this is the case, add your python3 installation to path and run `python -m pip install LIBRARYNAME`.


### Database configuration ###

Cindy, add stuff here if you want

### How to run tests ###

We're probably going to have to write scripts to add dummy packages in a large quantity. We don't have that yet, so this is for later. 


## How to add stuff to the repo ##

### Contribution guidelines ###

Before you commit code, it should be commented properly and well-documented. It should also follow PEP-8.

### Writing tests ###

For later


### Code review ###

Have comments, but not too many comments. For Python, follow the PEP-8 conventions. PyCharm has plugins that do this for you and alert if you do something wrong.
(If you noticed, this document doesn't follow PEP-8, but it doesn't matter since it's not in Python :D)

Have a docstring at the beginning of each function/class that documents what it does. Have a comment before the line of obscure bits of code to identify them. DO NOT have inline comments.


### Other guidelines ###

Save early, save often. Commit early, commit often. Write good commit messages. Don't wait to comment until the end.