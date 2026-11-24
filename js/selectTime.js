
define(['backbone', 'dashboardUtil', 'jquery-ui-1.10.4.custom', 'jquery.ui.touch-punch', 'jquery.cookie', 'wialon.interval'], function (Backbone, dashboardUtil) {
    'use strict';

    $.cookie.json = true;

    var SelectTime = Backbone.View.extend({
        template: $('#time-select-template').html(),
        events: {
        },

        initialize: function (options) {
            var defaults = {
                'yesterday': 'Yesterday',
                'today': 'Today',
                'week': 'Week',
                'month': 'Month',
                'custom': 'Custom',
                'period': 0,
                'server_time': 0,
                'tz': 0,
                'dst': 0,
                'monday': 1,
                'format': '%E:%m:%Y',
                'lang': 'en'
            }, regional, i, tt, tnow;

            this.context = _.extend(defaults, options);

            regional = $.datepicker.regional[this.context.lang || 'en'];
            if (regional && regional.dayNames) {
                for (i = 0; i < regional.dayNames.length; i++) {
                    regional.dayNames[i] = dashboardUtil.capitalize(regional.dayNames[i]);
                }
                $.datepicker.setDefaults(regional);
            }

            this.time_type = 0;
            this.time_custom = null;
            this.today = {
                from: 0,
                to: 0
            };
            this.last_time = null;

            this.tz = options ? (options.tz || 0) : 0;
            this.dst = options ? (options.dst || 0) : 0;
            this.timezone_diff = -1 * dashboardUtil.getLocalTimezone() + this.tz + this.dst;

            tt = new Date(this.getUserTime(this.context.server_time, this.tz, this.dst) * 1000);
            tt.setHours(0);
            tt.setMinutes(0);
            tt.setSeconds(0);
            tt.setMilliseconds(0);

            tnow = new Date(tt);
            tnow.setSeconds(tnow.getSeconds() + 86399);

            this.today.from = (tt.getTime() / 1000) | 0;
            this.today.to = (tnow.getTime() / 1000) | 0;
        },

        render: function () {
            $(this.el).html(_.template(this.template, this.context));

            var opts = {
                showSecond: true,
                firstDay: (this.context.monday > 1 ? 0 : 1),
                controlType: "select",
                showButtonPanel: false,
                beforeShowDay: function (date) {
                    var day = date.getDate();
                    return [true, (day < 10 ? "zero" : "")];
                },
                dateFormat: dashboardUtil.convertFormat(this.context.format, true)
            };

            $('#date-from', this.el).datepicker(opts);
            $('#date-to', this.el).datepicker(opts);

            $(document).on('touchstart', function(e) {
                var ele = $(e.toElement);
                if (!ele.hasClass("datetime") && !ele.hasClass("hasDatepicker"))
                    $(".hasDatepicker").datepicker("hide");
            });

            if (dashboardUtil.isTouch()) {
                $('#date-from', this.el).attr('readonly', true);
                $('#date-to', this.el).attr('readonly', true);
            }

            $("#timepickers", this.el).hide();
            $("#change-time-btn", this.el).removeAttr('href');
            this.changeTime(this.context.period);

            return this;
        },

        getInterval: function (is_send) {
            if (!this.last_time[0] || !this.last_time[1]) {
                return [];
            }

            // apply timezone diff
            var diff = 0;
            if (is_send) {
                diff = this.timezone_diff;
            }
            return [this.last_time[0] - diff, this.last_time[1] - diff];
        },

        triggerChangeTime: function (interval) {
            if (!(this.last_time && this.last_time[0] === interval[0] && this.last_time[1] === interval[1])) {
                this.last_time = interval;
                this.trigger("change-time", this);
            }
        },

        getUserTime: function (abs_time, tz, dst) {
            return abs_time - dashboardUtil.getLocalTimezone() + tz + dst;
        },

        /**
         * Changing dates to datepicker
         *
         * @param  {int} type of interval
         * @param  {array} interval (from, to)
         */
        changeTime: function (value, interval) {
            value = parseInt(value, 10);
            interval = interval || [];

            this.time_type = value;
            this.time_from = interval[0];
            this.time_to = interval[1];

            var tt = new Date(interval[0] * 1000);
            var tnow = new Date(interval[1] * 1000);
            $("#date-from", this.el).datepicker("option", "defaultDate", tt);
            $("#date-from", this.el).datepicker("setDate", tt);

            $("#date-to", this.el).datepicker("option", "defaultDate", tnow);
            $("#date-to", this.el).datepicker("setDate", tnow);

            this.triggerChangeTime(interval);
        },
        /**
         * Initialize plugin wialon.interval
         * @return {object} this
         */
        initWialonInterval: function(){
            var self = this;
            var now = wialon.core.Session.getInstance().getServerTime();
            var options = {
                template: this.template,
                tzOffset: wialon.util.DateTime.getTimezoneOffset() + wialon.util.DateTime.getDSTOffset( now ),
                now: now,
                dateFormat: 'dd:MM:yyyy',
                labels: {
                    yesterday: TRANSLATIONS['Yesterday'] || 'Yesterday',
                    today: TRANSLATIONS['Today'] || 'Today',
                    week: TRANSLATIONS['Week'] || 'Week',
                    month: TRANSLATIONS['Month'] || 'Month',
                    custom: TRANSLATIONS['Custom'] || 'Custom',
                    ok: 'OK',
                    reset: 'Reset'
                },
                onInit: function() {
                    $(self.el).intervalWialon('set', 0);
                },
                onChange: function(data) {
                    self.changeTime.apply(self, data);
                }
            };

            var user = wialon.core.Session.getInstance().getCurrUser();
            user.getLocale(function(code, locale){
                if (locale && locale.fd) {
                    var format = locale.fd.split("_");
                    if (format.length === 2) {
                        options.dateFormat = wialon.util.DateTime.convertFormat(format[0], true);
                    }
                    options.firstDay = locale.wd || 1;
                }
                $(self.el).intervalWialon(options);
            });

            return this;
        }
    });

    return {
        SelectTime: SelectTime
    };
});
