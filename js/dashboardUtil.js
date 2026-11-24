define(['jquery'], function () {
    'use strict';

    var getParameterByName = function (name,def) {
        if (!name) {
            return "";
        }
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(document.location.href);
        if (results) {
            return decodeURIComponent(results[1]);
        }
        return def || "";
    };

    return {
        bind: function (func, self, varargs) {
            var fixedArgs = Array.prototype.slice.call(arguments, 2, arguments.length);
            return function () {
                var args = Array.prototype.slice.call(arguments, 0, arguments.length);
                return func.apply(self, fixedArgs.concat(args));
            };
        },

        getParameterByName: getParameterByName,

        getLang: function () {
            var lang = getParameterByName('lang','en');
            if (availableLanguages && ($.inArray(lang, availableLanguages) === -1)) lang = 'en';
            return lang;
        },

        tr: function (key, params) {
            var text = key || null;
            if (text === null) text = key;
            else if (!_.isString(text)) text = text.toString();

            if (params) {
                text = text.replace(/(\%\%(\w+)\%\%)/g, function(match, key, value) {
                    if (params.hasOwnProperty(value)) return params[value];
                    return match;
                });
            } else if (TRANSLATIONS) {
                if (TRANSLATIONS.hasOwnProperty(key) && TRANSLATIONS[key]) return TRANSLATIONS[key];
            }
            return text;
        },

        getServer: function () {
            return getParameterByName('server') || '/dashboard/';
        },

        getBaseUrl: function() {
            var session = wialon.core.Session.getInstance();
            var baseUrlParam = this.getParameterByName('baseUrl');
            var result = '';
            if ( !baseUrlParam ) {
                if ( session.getBaseUrl && session.getBaseUrl() ) {
                    result = session.getBaseUrl();
                } else {
                    result = this.getParameterByName('baseUrl', 'https://hst-api.wialon.com')
                            || this.getParameterByName('hostUrl','http://hosting.wialon.com');
                }

            } else {
                result = baseUrlParam;
            }

            return result;
        },

        getLocalTimezone: function () {
            var rightNow = new Date();
            var jan1 = new Date(rightNow.getFullYear(), 0, 1, 0, 0, 0, 0);  // jan 1st
            var june1 = new Date(rightNow.getFullYear(), 6, 1, 0, 0, 0, 0); // june 1st
            var temp = jan1.toGMTString();
            var jan2 = new Date(temp.substring(0, temp.lastIndexOf(" ") - 1));
            temp = june1.toGMTString();
            var june2 = new Date(temp.substring(0, temp.lastIndexOf(" ") - 1));
            var std_time_offset = ((jan1 - jan2) / (1000 * 60 * 60));
            var daylight_time_offset = ((june1 - june2) / (1000 * 60 * 60));
            var dst;
            /* jshint eqeqeq: false */
            if (std_time_offset == daylight_time_offset) {
                dst = "0"; // daylight savings time is NOT observed
            } else {
                // positive is southern, negative is northern hemisphere
                var hemisphere = std_time_offset - daylight_time_offset;
                if (hemisphere >= 0) std_time_offset = daylight_time_offset;
                dst = "1"; // daylight savings time is observed
            }
            return parseInt(std_time_offset * 3600, 10);
        },

        convertFormat: function (format, mode) {
            var i = 0;
            var tokens = {
                "MM": "%B",// The full month name. ("January" to "December")
                "M": "%b",// Abbreviated month name. ("Jan" to "Dec")
                "mm": "%m",// The month of the year with leading zero if required. ("01" to "12")
                "m": "%l",// The month of the year between 1-12. ("1" to "12")
                "DD": "%A",// The full day name. ("Monday" to "Sunday")
                "D": "%a",// Abbreviated day name. ("Mon" to "Sun")
                "dd": "%E",// The day of the month with leading zero if required. ("01" to "31")
                "d": "%e",// The day of the month between 1 and 31. ("1" to "31")
                "yy": "%Y",// The full four digit year. ("1999" or "2008")
                "y": "%y"// The year as a two-digit number. ("99" or "08")
            };
            if (!mode) {
                for (i in tokens) {
                    format = format.replace(new RegExp(i, "g"), tokens[i]);
                }
            } else {
                for (i in tokens) {
                    format = format.replace(new RegExp(tokens[i], "g"), i);
                }
            }
            return format;
        },

        capitalize: function(str) {
           return str.charAt(0).toUpperCase() + str.slice(1);
        },

        compareText: function (a, b) {
            var chunkify = function (str) {
                return str.match(/\d+|\D+/g);
            };

            var aa = chunkify(('' + a).toLowerCase());
            var bb = chunkify(('' + b).toLowerCase());

            if (!aa || !bb || !aa.length || !bb.length) {
                if (!aa || !aa.length) return -1;
                if (!bb || !bb.length) return 1;
                return 0;
            }

            /* jshint eqeqeq: false */
            for (var x = 0; aa[x] && bb[x]; x++) {
                if (aa[x] !== bb[x]) {
                    var c = Number(aa[x]), d = Number(bb[x]);
                    if (c == aa[x] && d == bb[x]) {
                        return c - d;
                    } else {
                        return (aa[x] > bb[x]) ? 1 : -1;
                    }
                }
            }
            return aa.length - bb.length;
        },

        isTouch: function () {
            /* Modernizr 2.7.1 (Custom Build) | MIT & BSD */
            var mod = 'modernizr', prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');

            var injectElementWithStyles = function( rule, callback, nodes, testnames ) {

                var style, ret, node, docOverflow,
                    div = document.createElement('div'),
                    body = document.body,
                    fakeBody = body || document.createElement('body');

                if ( parseInt(nodes, 10) ) {
                    while ( nodes-- ) {
                        node = document.createElement('div');
                        node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
                        div.appendChild(node);
                    }
                }

                style = ['&#173;','<style id="s', mod, '">', rule, '</style>'].join('');
                div.id = mod;
                (body ? div : fakeBody).innerHTML += style;
                fakeBody.appendChild(div);
                /* global docElement, DocumentTouch */
                if ( !body ) {
                    fakeBody.style.background = '';
                    fakeBody.style.overflow = 'hidden';
                    docOverflow = docElement.style.overflow;
                    docElement.style.overflow = 'hidden';
                    docElement.appendChild(fakeBody);
                }

                ret = callback(div, rule);
                if ( !body ) {
                    fakeBody.parentNode.removeChild(fakeBody);
                    docElement.style.overflow = docOverflow;
                } else {
                    div.parentNode.removeChild(div);
                }

                return !!ret;

            };

            var bool;
            if(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
                bool = true;
            } else {
                injectElementWithStyles(['@media (',prefixes.join('touch-enabled),('),mod,')','{#modernizr{top:9px;position:absolute}}'].join(''), function( node ) {
                    bool = node.offsetTop === 9;
                });
            }

            return bool;
        }
    };
});
