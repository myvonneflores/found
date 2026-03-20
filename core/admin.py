from django.contrib import admin

admin.site.site_header = "FOUND Admin"
admin.site.site_title = "FOUND Admin"
admin.site.index_title = "Manage users, listings, claims, and community activity"

APP_ORDER = {
    "users": 0,
    "companies": 1,
    "community": 2,
    "auth": 3,
}

USERS_APP_LABEL = "users"
USERS_MODEL_ORDER = {
    "User": 0,
    "PersonalProfile": 1,
    "BusinessClaim": 2,
}


def found_admin_get_app_list(self, request, app_label=None):
    app_dict = self._build_app_dict(request, app_label)
    app_list = sorted(
        app_dict.values(),
        key=lambda app: (APP_ORDER.get(app["app_label"], len(APP_ORDER)), app["name"].lower()),
    )

    for app in app_list:
        if app["app_label"] == USERS_APP_LABEL:
            app["models"].sort(
                key=lambda model: (
                    USERS_MODEL_ORDER.get(model["object_name"], len(USERS_MODEL_ORDER)),
                    model["name"].lower(),
                )
            )
            continue

        app["models"].sort(key=lambda model: model["name"].lower())

    return app_list


admin.AdminSite.get_app_list = found_admin_get_app_list
