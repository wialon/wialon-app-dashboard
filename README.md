# Dashboard, version 1.4.9: (April 1, 2025)
This is WEB application based on Apps from Gurtam (http://apps.wialon.com).

**This is a legacy app: it is no longer developed or maintained. The code is published as is, without support.**

## Description
Dashboard provides overview of fleet KPIs (key performance indicators) in an easy to read real-time user interface to enable instantaneous and informed decisions to be made at a glance.
KPIs include Mileage, Fuel consumption, Engine hours, Average and Maximum speed, Idling, Time in trips and visited Geofences.

## License
[The MIT License](LICENSE-MIT)

## Requirements
 * Browser: a current version of Google Chrome, Firefox, Safari or Edge
 * Language: en, ar, az, bg, br, de, es, et, fa, fi, fr, he, hr, hu, it, ja, lt, ro, ru, sk, uk, vi
 * Components: SDK
 * URL params: Active SID, Language, Current user, Base URL, Host URL

## Quick start
Apps activation through the management system: https://help.wialon.com/en/wialon-hosting/user-guide/management-system/apps  
Working with applications in the GPS tracking system: https://help.wialon.com/en/wialon-hosting/user-guide/monitoring-system/apps

## Installation
The repository contains the app in the form it is hosted in. Put the files on a web server and open `index.html` with the URL params listed above, for example
`index.html?sid=<Active SID>&baseUrl=https://hst-api.wialon.com&user=<Current user>&lang=en`.

 * On start the page requests `/dashboard/app/app.json` and the optional `/dashboard/whitelabel.json` (white label settings) by absolute paths, so host the app under the `/dashboard/` path to have them picked up.
 * jQuery, Underscore, Backbone, Bootstrap and RequireJS are loaded from public CDNs.
 * The shared plugins (Leaflet, the WebGIS layer for it and the date interval picker) are loaded from `//apps.wialon.com/plugins/`.
 * The data for widgets and the list of widgets of a user come from a backend at `/dashboard/widget/...` and `/dashboard/settings` (another address of the backend can be passed in the `server` URL param). The backend is not a part of this repository.
