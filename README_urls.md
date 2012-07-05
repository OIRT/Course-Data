
##URLs

__/data/users/workspace/(workspace_id)__

* __GET:__ Returns all users associated with a workspace's list of rosters
 
__/data/users/( netid | oid | rcpid )/(id)__
 
 * __GET:__ Returns one user based on netid, object id, or rcpid
 
__/data/workspace/(workspace_id)__

* __GET:__ Returns data for a workspace
* __POST:__ Saves/Creates data for a workspace (depending on if id is present)

__/data/table/(workspace_id)__

* __GET:__ gets collated data for all users associated with a workspace
	* combined data from student, gradebook, and uploads collections

__/data/email/template/(template_id)__

* __GET:__ returns the template string
* __POST:__ saves/creates a template string (depends if id is present)

__/data/email/preview/(template_id)__

* __GET:__ returns a preview of the template evaluated for some user (pass user as parameter?)


__/data/email/send/__

* __POST:__ sends email(s)
	* params: list of users, template_id

