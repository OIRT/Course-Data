from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('data_app.views',
    url(r'^$', 'index'),

    #url(r'^data/$', 'data_index'),
    url(r'^data/users/$', 'fetch_many_users', {"retformat":"json"}),
    url(r'^data/users\.(?P<retformat>(json|html))/$', 'fetch_many_users'),
    url(r'^data/users/(?P<attr>(id|rcpid|netid))/(?P<id>[\w\d]+)/$', 'fetch_one_user', {"retformat":"json"}),
    url(r'^data/users/(?P<attr>(id|rcpid|netid))/(?P<id>[\w\d]+)\.(?P<retformat>(json|html))/$', 'fetch_one_user'),
    # Examples:
    # url(r'^$', 'course_data.views.home', name='home'),
    # url(r'^course_data/', include('course_data.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
