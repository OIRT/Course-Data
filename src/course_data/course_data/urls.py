from django.conf.urls.defaults import patterns, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('data_app.views',
    url(r'^$', 'index'),
    url(r'^users$', 'users'),
    url(r'^userLookup$', 'userLookup'),

    #url(r'^data/$', 'data_index'),
    url(r'^data/users/$', 'fetch_many_users', {"retformat":"json"}),
    url(r'^data/users\.(?P<retformat>(json|html))/$', 'fetch_many_users'),
    url(r'^data/users/(?P<attr>(id|rcpid|netid))/(?P<id>[\w\d]+)/$', 'fetch_one_user', {"retformat":"json"}),
    url(r'^data/users/(?P<attr>(id|rcpid|netid))/(?P<id>[\w\d]+)\.(?P<retformat>(json|html))/$', 'fetch_one_user'),
    url(r'^data/users/workspace/(?P<wid>[0-9a-f]+)/$', 'fetch_workspace_users'),
    url(r'^data/users/workspaces/(?P<uid>[\w\d]+)/$', 'fetch_workspaces_for_user'),
    url(r'^data/gradebooks/$', 'fetch_gradebooks_for_sections'),
    url(r'^data/workspace/$', 'create_workspace'),
    url(r'^data/workspace/(?P<wid>[0-9a-f]+)/$', 'workspace'),
    url(r'^data/email$', 'send_emails'),
    url(r'^data/table/(?P<wid>[0-9a-f]+)/$', 'table'),
    url(r'^data/upload/(?P<wid>[0-9a-f]+)/$', 'upload')
)
