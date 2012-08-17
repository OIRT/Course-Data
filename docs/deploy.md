# Deploying Course-Data

I've set it up so that this project can be deployed using the Fabric framework.  It's already configured to work with Rutgers servers, but can easily be adapted for use elsewhere.

Before being able to deploy, you'll need to make sure [fabric is installed](http://docs.fabfile.org/en/1.4.2/installation.html):

    pip install fabric

## Initial Setup

To initially setup the remote server (or to clean everything out and start fresh), execute the `bootstrap` command:

    fab production bootstrap

This step may take a while, but it really only needs to be performed once.

## Deploying New Code

To update the code on the remote server:

    fab production deploy

This will rsync your project directory over to the host, collect all of the static files into one place, ensure all SASS is compiled into CSS, and then touch the wsgi file on the host to force Apache to reload it.

An `RSYNC_EXCLUDE` variable in the fabfile lists all of the files that shouldn't be sent over to the server.

The idea is that this should be the only command that you need to execute to get a new set of working code up and running on the server.

## Updating the Apache Config

The Apache config files (both the conf and wsgi) are stored under the `apache` directory of this repo.  When updates are made to the wsgi file, they take effect immediately upon deploy.  However, updating the conf file requires an extra step:

    fab production update_apache_config
    
**This often has to be called if updates don't seem to "take" on the first deploy!**
