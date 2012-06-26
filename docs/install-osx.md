# Installing Python and Django on OS X

Some of these things might exist from OS X, but if you're installing a more recent version of python, you need to go through all these steps for that new version.

1. If you don't already have it, install [Python 2.7](http://www.python.org/download/).

2. Install virtualenv, which helps keeps all of the libraries contained: `pip install virtualenv`
 
3. Create a new virtual environment: `virtualenv --distribute [NAME]`

4. Activate that virtual environment: `source [NAME]/bin/activate`

5. Install Django in that environment: `pip install Django`

6. Install Mongoengine in that environment: `pip install mongoengine`