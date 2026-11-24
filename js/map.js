
define('map', ['jquery', 'leaflet', 'webgis'], function ($, L) {
    'use strict';

    var map,
        marker,
        module,
        opened = false,
        cfg = {
            mapBoxId : 'map-box',
            zoom: 15,
            minZoom: 5,
            position: {lat: 27.55, lon: 53.9}
        },
        cursor = {x: 0, y: 0},
        $mapBox = $('#' + cfg.mapBoxId);

    /**
     * Initialize map with defaults
     *
     * @private
     * @returns void
     */
    function _initialize() {
        var gis_url = wialon.core.Session.getInstance().getBaseGisUrl();
        var user_id = wialon.core.Session.getInstance().getCurrUser().getId();
        var sess = wialon.core.Session.getInstance();
        var gurtamMapsLayer =  L.tileLayer.webGis(gis_url, {attribution: APP_CONFIG.alias_webgis || "Gurtam Maps", minZoom: cfg.minZoom, userId: user_id, sessionId: sess.getId()});
        map = L.map(cfg.mapBoxId, {
            minZoom: cfg.minZoom,
            zoom: cfg.zoom,
            center: L.latLng(cfg.position),
            layers: [gurtamMapsLayer]
        });
        // attach event listeners
        $mapBox.on('click.map', function(e) {
            // cancel bubbling on click over the map
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
        });
        // store cursor position
        $(document).on('mousemove.map', function(e) {
            cursor.x = e.clientX;
            cursor.y = e.clientY;
        });
        // close on resize
        $(window).on('resize.map', close);
    }

    /**
     *
     * @private
     * @returns void
     */
    function _showMapBox() {
        var styles = {
            top: 0,
            left: 0,
            visibility: 'visible'
        };
        var offsetY = 20;
        var box = {
            w: $mapBox.outerWidth(),
            h: $mapBox.outerHeight()
        };
        var win = {
            w: $(window).width(),
            h: $(window).height()
        };
        // calculate coordinates for box
        // over/under of the cursor
        if (cursor.y < (win.h / 2)) {
            styles.top = cursor.y + $(document).scrollTop() + offsetY;
        } else {
            styles.top = cursor.y + $(document).scrollTop() - offsetY - box.h;
        }
        // left/right of the cursor
        var where;
        if (cursor.x < (win.w / 2)) {
            styles.left = cursor.x + $(document).scrollLeft();
            where = 'right';
        } else {
            where = 'left';
            styles.left = cursor.x + $(document).scrollLeft() - box.w;
        }
        //correct x
        if (cursor.x < box.w) {
            switch (where) {
                case 'left' :
                    styles.left += (box.w - cursor.x);
                    break;
                case 'right' :
                    styles.left -= ((box.w - (win.w - cursor.x)) > 0) ? (box.w - (win.w - cursor.x)) : 0;
                    break;
            }

        }
        // apply styles
        $mapBox.css(styles);
    }

    /**
     *
     * @private
     * @returns void
     */
    function _hideMapBox() {
        $mapBox.css({visibility: 'hidden'});
    }

    /**
     *
     * @param position Object center of map
     * @param zoom Number
     * @returns module Object
     */
    function open(position, zoom) {
        var p = position || cfg.position,
            z = zoom || cfg.zoom,
            pos = L.latLng(p);
        map.setView(pos, z);
        opened = true;
        _showMapBox();
        return module;
    }

    /**
     *
     * @returns module Object
     */
    function close() {
        // reset view to default
        map.setView(cfg.position, cfg.zoom);
        opened = false;
        _hideMapBox();
        return module;
    }

    /**
     *
     * @returns {boolean}
     */
    function isOpened() {
        return opened;
    }

    /**
     *
     * @param src string
     * @param position Object
     * @returns module Object
     */
    function addIcon(src, position) {
        var icon = L.icon({iconUrl: src, iconAnchor: [16, 16]}),
            pos = L.latLng(position);
        // check if marker exists
        if (!marker) {
            marker = L.marker(pos, {icon: icon}).addTo(map);
        } else {
            marker.setLatLng(pos);
            marker.setIcon(icon);
        }
        return module;
    }

    /**
     *
     * @returns module Object
     */
    function init() {
        _initialize();
        return module;
    }


    // return module API
    module = {
        init: init,
        open: open,
        close: close,
        isOpened: isOpened,
        addIcon: addIcon
    };

    return module;
});
