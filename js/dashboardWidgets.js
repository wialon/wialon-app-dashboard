/**
 * MAIN APP Javascript file
 *
 * @author Gurtam
 * @copyright 2002-2013 Gurtam
 * @license https://opensource.org/licenses/MIT MIT
 */

define(['underscore', 'backbone', 'dashboardUtil', 'd3.v3.3.5.4', 'nv.d3.ext', 'map', 'jquery.tablesorter', 'jquery.cookie', 'map'], function (_, Backbone, dashboardUtil, d3, nv, map) {
    'use strict';

    $.cookie.json = true;

    var config = {
        tmpl: {
            widgetContentTemplate: '#widget-content-template',
            tableTemplate: '#table-template',
            tableHeadTemplate: '#thead-template',
            tableBodyTemplate: '#tbody-template',
            tableRowTemplate: '#row-template',
            numberTdTemplate: '#number-td-template',
            textTdTemplate: '#text-td-template',
            imageTdTemplate: '#image-td-template',
            satelliteTdTemplate: '#satellite-td-template'
        },
        rowMeta: {
            lat: 'data-row-lat',
            lon: 'data-row-lon',
            iconSrc: 'data-row-iconsrc'
        }
    };

    var templates = {
        tableTemplate: $(config.tmpl.tableTemplate).html(),
        tableHeadTemplate: $(config.tmpl.tableHeadTemplate).html(),
        tableBodyTemplate: $(config.tmpl.tableBodyTemplate).html(),
        tableRowTemplate: $(config.tmpl.tableRowTemplate).html(),
        textTdTemplate: $(config.tmpl.textTdTemplate).html(),
        numberTdTemplate: $(config.tmpl.numberTdTemplate).html(),
        imageTdTemplate: $(config.tmpl.imageTdTemplate).html(),
        satelliteTdTemplate: $(config.tmpl.satelliteTdTemplate).html()
    };

    var BaseWidget =  Backbone.Model.extend({
        defaults: {
            is_static: false,
            server_type: '',
            type: 'plot',
            ct: '',
            filters: {},
            gid: null,

            // local
            data: undefined,
            is_refresh: false,
            title: ''
        },

        initialize: function (options) {
            Backbone.Model.prototype.initialize.apply(this, [options]);
            return this;
        },

        reset: function () {
            var defaults = this.defaults;
            this.set('is_static', defaults.is_static);
            this.set('server_type', defaults.server_type);
            this.set('type', defaults.type);
            this.set('ct', defaults.ct);
            this.set('filters', {});
            this.set('gid', defaults.gid);
            return this;
        },

        abort: function () {
            if (this.jqXHR) {
                this.jqXHR.abort();
                this.jqXHR = null;
                this.set('is_refresh', false);
            }
        },

        refreshData: function (interval, force) {
            this.abort();
            if (force || (!this.get('is_static')) || this.get('data') === undefined || this.get('data') === null) {
                this.set('is_refresh', true);
                this._sendRequest(interval, force);
            }
        },

        data: function () {
            var data = {
                type: this.get('server_type'),
                ct: this.get('ct'),
                filters: JSON.stringify(this.get('filters'))
            };

            if (this.get('gid') !== null) {
                return _.extend(data, {
                    gid: this.get('gid')
                });
            }
            return data;
        },

        _sendRequest: function (interval, force) {
            var token = wialon.core.Session.getInstance().getToken();
            if (token && token.th) {
                // use token
                this._sendRequestImpl(interval, force, 'token', token.th);
            } else {
                // use authHash
                wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function(code, data) {
                    if (code === 0) {
                        this._sendRequestImpl(interval, force, 'hash', data.authHash);
                    }
                }, this));
            }
        },

        // send request with authHash or authToken
        _sendRequestImpl: function (interval, force, authType, authToken) {
            var data = this.data();
            var url = dashboardUtil.getBaseUrl();
            data = _.extend(data, {
                sid: wialon.core.Session.getInstance().getId(),
                url: url,
                from: interval[0],
                to: interval[1],
                lang: dashboardUtil.getLang()
            });

            // append auth data
            data[authType] = authToken;

            if (force) {
                data = _.extend(data, { 'force': true });
            }

            this.jqXHR = $.ajax({
                url: dashboardUtil.getServer() + 'widget/data/',
                data: data,
                type: 'POST',
                dataType: 'json',
                timeout: 3000000,
                success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                    this.jqXHR = null;
                    this._callback(textStatus, data);
                }, this),
                error: dashboardUtil.bind(function (jqXHR, textStatus, errorThrown) {
                    this.set('is_refresh', false);
                    this.set('data', null);
                }, this)
            });
        },

        _callback: function (textStatus, data) {
            if (textStatus === 'success' && (data.status === 'OK' || data.status === 'ZERO_RESULTS')) {
                if (!(this.get('data') === null && data === null)) {
                    this.set('data', data, { 'silent': true });
                    this.trigger('change:data', this, data);
                }
            } else {
                this.set('data', null);
            }
            this.set('is_refresh', false);
        }
    });

    var ModelWidgets = Backbone.Collection.extend({
        model: BaseWidget
    });

    var BaseWidgetView = Backbone.View.extend({
        className: 'panel panel-default dashboard-panel',
        template: $(config.tmpl.widgetContentTemplate).html(),

        events: {
            'click .icon.chevron': 'click_chevron',
            'click .icon.remove': 'click_remove',
            'click .icon.settings': 'click_settings'
        },

        initialize: function (options) {
            Backbone.View.prototype.initialize.apply(this, [options]);

            this.listenTo(this.model, "change:is_refresh", dashboardUtil.bind(function (model, value, options) {
                this.change_is_refresh(model, value, options);
            }, this));
            this.listenTo(this.model, "change:data", this.refresh);
        },

        click_chevron: function (evt) {
            $(evt.target).toggleClass("chevron-show").toggleClass("chevron-hide");
            $(evt.target).parents(".panel:first").find(".panel-body-wrapper").fadeToggle(200).css({ 'overflow': 'auto' });

            var chevron = $.cookie('chevron');
            if (chevron) {
                chevron[this.model.id] = $(evt.target).hasClass('chevron-hide');
            } else {
                chevron = {};
                chevron[this.model.id] = $(evt.target).hasClass('chevron-hide');
            }
            $.cookie('chevron', chevron, { expires: 300 });
        },

        click_remove: function (evt) {
            this.stopListening(this.model, "change:is_refresh");
            this.stopListening(this.model, "change:data");

            var charts_type = $.cookie('dashboard_charts_type');
            if (charts_type) {
                if (_.has(charts_type, this.model.id)) {
                    delete charts_type[this.model.id];
                }
                $.cookie('dashboard_charts_type', charts_type, { expires: 300 });
            }

            var chevron = $.cookie('chevron');
            if (chevron) {
                if (_.has(chevron, this.model.id)) {
                    delete chevron[this.model.id];
                }
                $.cookie('chevron', chevron, { expires: 300 });
            }

            this.model.abort();
            this.undelegateEvents();
            this.$el.removeData().unbind();
            Backbone.View.prototype.remove.call(this);

            var token = wialon.core.Session.getInstance().getToken();
            if (token && token.th) {
                // use token
                this.click_remove_impl({'token': token.th});
            } else {
                // use authHash
                wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function (code, data) {
                    if (code === 0) {
                        this.click_remove_impl({'hash': data.authHash});
                    }
                }, this));
            }
        },

        click_remove_impl: function (data) {
            data = _.extend(data, {
                url: dashboardUtil.getBaseUrl(),
                widget_id: this.model.id
            });

            $.ajax({
                url: dashboardUtil.getServer() + 'widget/delete',
                type: "POST",
                data: data,
                dataType: 'json',
                success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                    if (textStatus === 'success' && data.status === 'OK') {
                        this.trigger('remove', this);
                    }
                }, this)
            });
        },

        click_settings: function () {
            this.trigger('settings', this);
        },

        change_is_refresh: function (model, value) {
            (value ?  $('.gug', this.$el).addClass('gug-progress') :  $('.gug', this.$el).removeClass('gug-progress'));
        },

        refresh: function () {
            return this;
        },

        render: function () {
            $(this.$el).html(_.template(this.template, { 'cid': this.model.cid }));
            $(this.$el).attr('id', 'dashboard-panel-' + this.model.cid);

            $('.panel-title', this.$el).html(_.unescape(this.model.get('title')));
            $('.charts-type-wrapper', this.$el).hide();

            var chevron = $.cookie('chevron');
            if (chevron) {
                if (_.has(chevron, this.model.id)) {
                    if (chevron[this.model.id]) {
                        $('.icon.chevron', this.$el).addClass('chevron-hide');
                    } else {
                        $('.icon.chevron', this.$el).addClass('chevron-show');
                        $('.panel-body-wrapper', this.$el).hide();
                    }
                } else {
                    $('.icon.chevron', this.$el).addClass('chevron-hide');
                }
            } else {
                $('.icon.chevron', this.$el).addClass('chevron-hide');
            }

            if (this.model.get('server_type') !== 'units') {
                $('.icon.refresh', this.$el).hide();
                $('.icon.chevron', this.$el).hide();
            }
            if (this.model.get('server_type') === 'units') {
                $('.icon.settings', this.$el).hide();
            }

            return this;
        },

        get_divisor_by_data_type: function (dataType) {
            var divisor = 1.0;
            switch (dataType) {
            case 'DISTANCE': // AVL_REPORT_COLUMN_VALUE_DISTANCE
                divisor = 1000.0;
                break;
            }
            return divisor;
        },

        show_no_available_label: function () {
            $('#' + this.model.cid).html('<div class="no-data-available">' + dashboardUtil.tr('No Data Available.') + '</div>');
        },

        format_x_axis: function (x, format) {
            var f = this.model.get('data').metainfo ? this.model.get('data').metainfo.xaxis.format : '';
            format = format || f;
            return wialon.util.DateTime.formatTime(parseInt(x, 10), true, format);
        },

        format_y_axis: function (y, metainfo) {
            var result = '', format, suffix;

            metainfo = metainfo || this.model.get('data').metainfo.yaxis;
            if (metainfo.type === 'DURATION') {
                if (y > 86400) {
                    // more than a day
                    result = ((y / 86400) | 0) + ' ' + dashboardUtil.tr('d.') + ' ';
                    y = y % 86400;
                    // hours
                    format = 'H';
                    suffix = 'h.';
                } else if (y >= 3600) {
                    format = 'H:m:s';
                    suffix = 'h.';
                }
                else if (y >= 60) {
                    format = 'm:s';
                    suffix = 'm.';
                }
                else {
                    format = 's';
                    suffix = 's.';
                }
                result += (y ? wialon.util.DateTime.formatDuration(Math.floor(y), format) : '0') + ' ' + dashboardUtil.tr(suffix);
            } else if (metainfo.type === 'UNIX_TIME') {
                result =  wialon.util.DateTime.formatTime(y, true, metainfo.format);
            } else {
                if (parseInt(y, 10) === y) {
                    result = d3.format('d')(y);
                } else {
                    result = d3.format('.1f')(y);
                }
            }
            return result;
        },

        saved_chart_legend_state: function(chart){
            chart.dispatch.on('stateChange', dashboardUtil.bind(function (data) {
                var items = this.model.get('data').data
                , i = 0
                , item
                ;

                if( ! items)
                    items = this.model.get('data');

                if( _.has(items, 'first_chart')) {
                    items.first_chart.disabled = data.disabled[0];
                    items.second_chart.disabled = data.disabled[1];
                    return;
                }

                for(var k in items) {
                    item = items[k];
                    item.disabled = data.disabled[i];
                    i++;
                }
            }, this));
        },

        reject_disable_items: function(data) {
            var value = this.model.get('data')
            , i = -1
            ;

            if ((!value) || value.status !== 'OK') return [];

            for (var uid in value.data) {
                i++;
                if (!_.has(value.data, uid)) continue;
                if (_.has(value.data[uid], 'disabled') && value.data[uid].disabled === true && data[i]){
                    data[i].disabled = true;
                }
            }
        }
    });

    var PlotWidgetView = BaseWidgetView.extend({
        headingAddonTemplate: $('#plot-heading-template-add-on').html(),

        events: (function () {
            return _.extend({}, BaseWidgetView.prototype.events, {
                'click .icon.pie-chart': 'pie_chart',
                'click .icon.line-chart': 'line_chart',
                'click .icon.vertical-bar-chart': 'vertical_bar_chart',
                'click .icon.horizontal-bar-chart': 'horizontal_bar_chart',
                'click .icon.vertical-stacked-bar-chart': 'vertical_stacked_bar_chart'
            });
        }()),

        initialize: function (options) {
            BaseWidgetView.prototype.initialize.apply(this, [options]);
        },

        click_icon_chart: function (target) {
            $('.icon-chart', this.$el).addClass('disable-chart');
            $(target, this.$el).removeClass('disable-chart');

            var chart_type = $(target, this.$el).data('chart-type');
            var charts_type = $.cookie('dashboard_charts_type');
            if (charts_type) {
                charts_type[this.model.id] = chart_type;
            } else {
                charts_type = {};
                charts_type[this.model.id] = chart_type;
            }
            $.cookie('dashboard_charts_type', charts_type, { expires: 300 });
        },

        pie_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
            this.draw_pie_chart();
        },

        line_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
            this.draw_line_chart();
        },

        vertical_bar_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
            this.draw_vertical_bar_chart();
        },

        horizontal_bar_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
            this.draw_horizontal_bar_chart();
        },

        vertical_stacked_bar_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
            this.draw_vertical_stacked_bar_chart_data();
        },

        get_pie_chart_data: function () {
            var value = this.model.get('data');
            if ((!value) || value.status !== 'OK') {
                return [];
            }

            var pie_data = [];
            for (var uid in value.data) {
                if (!_.has(value.data, uid)) continue;

                var unit_name = value.data[uid].nm;
                var unit_data = value.data[uid].data;

                var pie_unit_data = { 'label': unit_name, 'value': value.data[uid].total.rawValue / this.get_divisor_by_data_type(value.data[uid].total.dataType) };

                if (unit_data.length > 0 && value.data[uid].total.rawValue > 0) pie_data.push(pie_unit_data);
            }
            return pie_data;
        },

        get_line_chart_data: function () {
            var value = this.model.get('data');
            if ((!value) || value.status !== 'OK') return [];

            var line_data = [];
            for (var uid in value.data) {
                if (!_.has(value.data, uid)) continue;

                var unit_name = value.data[uid].nm;
                var unit_data = value.data[uid].data;

                var line_unit_data = { 'key': unit_name, 'values': null }, tmp_values = [];
                for (var i = 0, len = unit_data.length; i < len; i++) {
                    var u_data = unit_data[i];
                    if (u_data.data.rawValue === null || u_data.data.rawValue === undefined) continue;

                    var user_time = wialon.util.DateTime.userTime(u_data.time.rawValue),
                        v = u_data.data.rawValue / this.get_divisor_by_data_type(u_data.data.dataType),
                        tz_offset = wialon.util.DateTime.getTimezoneOffset();
                    tmp_values.push({ x: user_time - (user_time % 86400) - (tz_offset < 0 ? (tz_offset) : 0), y: v });
                }

                if (tmp_values.length > 0) {
                    line_unit_data.values = tmp_values;
                    line_data.push(line_unit_data);
                }
            }


            return line_data;
        },

        draw_pie_chart: function () {
            var pie_data = this.get_pie_chart_data();
            if ((!pie_data) || (pie_data && _.isEmpty(pie_data))) {
                this.show_no_available_label();
                return this;
            }

            this.reject_disable_items(pie_data);

            var svg = '#' + this.model.cid + ' svg';
            d3.select(svg).remove(); $(svg, this.$el).empty();
            $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

            nv.addGraph(dashboardUtil.bind(function (pie_data) {
                var chart = nv.models.pieChart().options({
                    margin: { top: 0, right: 30, bottom: 35, left: 30 },
                    valueFormat: dashboardUtil.bind(function (value) {
                        var yaxis_metainfo = this.model.get('data').metainfo.yaxis;
                        if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                            if (yaxis_metainfo.type !== 'DURATION' && yaxis_metainfo !== 'UNIX_TIME') {
                                value = wialon.util.String.sprintf(yaxis_metainfo.format, value);
                            } else if (yaxis_metainfo.type === 'DURATION') {
                                value = this.format_y_axis(value);
                            }
                        }
                        return value;
                    }, this),
                    noData: dashboardUtil.tr('No Data Available.')
                })
                .tooltipContent(function(key, y, e, graph){
                    return '<h3>' + key + '</h3><p>' +  y + '</p>';
                })
                .x(function (d) {
                    return d.label;
                }).y(function (d) {
                    return d.value;
                }).showLabels(true);
                chart.pie.pieLabelsOutside(false).labelType("percent").labelThreshold(0.04);

                d3.select(svg).datum(pie_data).transition().duration(500).call(chart);
                nv.utils.windowResize(chart.update);

                this.saved_chart_legend_state(chart);

                return chart;
            }, this, pie_data));
        },

        fix_line_chart_x_axis: function (chart, line_data) {
            var ldv_length,
                autoTicksCount,
                drawTicks,
                queryInterval,
                tickInterval = 1, // tick interval to draw from line_data x values
                daysInterval,
                i;

            if (line_data.length) {
                ldv_length = line_data[0].values.length;
                if (ldv_length) {
                    autoTicksCount = Math.floor( chart.xAxis.ticks() );
                    drawTicks = [];
                    if (ldv_length > autoTicksCount) {
                        queryInterval = this.model.get('data').query.interval;
                        daysInterval = Math.round( (parseInt(queryInterval.to, 10) - parseInt(queryInterval.from, 10) ) / 86400 );
                        tickInterval = Math.floor( (daysInterval - 1) / (autoTicksCount - 1) );
                        if (tickInterval < 1) tickInterval = 1;
                    }

                    for (i = 0; i < ldv_length; i += tickInterval) {
                        drawTicks.push( line_data[0].values[i].x );
                    }

                    chart.xAxis.tickValues(drawTicks);
                    chart.update();
                }
            }

            return this;
        },

        draw_line_chart: function () {
            var line_data = this.get_line_chart_data();
            if ((!line_data) || (line_data && _.isEmpty(line_data))) {
                this.show_no_available_label();
                return this;
            }

            this.reject_disable_items(line_data);

            var svg = '#' + this.model.cid + ' svg';
            d3.select(svg).remove(); $(svg, this.$el).empty();
            $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

            var y_axis_label = null;
            if (this.model.get('data').metainfo.yaxis) y_axis_label = this.model.get('data').metainfo.yaxis.label;

            nv.addGraph(dashboardUtil.bind(function (line_data) {
                var chart = nv.models.lineChart().options({
                    margin: { top: 0, right: 15, bottom: 35, left: 65 },
                    showXAxis: true,
                    showYAxis: true,
                    tooltipContent: dashboardUtil.bind(function (key, x, y, e, graph) {
                        var yaxis_metainfo = this.model.get('data').metainfo.yaxis;
                        var format = this.model.get('data').metainfo.tooltip.format;

                        if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                            if (yaxis_metainfo.type === 'DURATION') {
                                y = this.format_y_axis(e.point.y);
                            }
                            else if (yaxis_metainfo.type !== 'DURATION' && yaxis_metainfo.type !== 'UNIX_TIME') {
                                y = wialon.util.String.sprintf(yaxis_metainfo.format, e.point.y);
                            }
                        }

                        var at = (format === null ? (y + ' at ' + x) : wialon.util.String.sprintf(format, y, x));
                        return '<h3>' + key + '</h3>' + '<p>' + at + '</p>';
                    }, this),
                    noData: dashboardUtil.tr('No Data Available.')
                }).x(function (d) {
                    return d.x;
                }).y(function (d) {
                    return d.y;
                });

                if (dashboardUtil.isTouch()) chart.legend.align(false);

                chart.xAxis
                    .showMaxMin(false)
                    .tickFormat(dashboardUtil.bind(function (x) { return this.format_x_axis(x); }, this));
                chart.yAxis
                    .showMaxMin(line_data.length === 1 && line_data[0].values.length === 1)
                    .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y); }, this))
                    .axisLabel(y_axis_label)
                    .rotateYLabel(false);

                d3.select(svg).datum(line_data).transition().duration(500).call(chart);

                this.fix_line_chart_x_axis(chart, line_data);
                var self = this;

                // Add event listener on window resize
                nv.utils.windowResize(dashboardUtil.bind(self.fix_line_chart_x_axis, self, chart, line_data));

                this.saved_chart_legend_state(chart);
                // fix for Opera
                if(window.navigator.userAgent.toLowerCase().indexOf('opera') !== -1){
                    _.delay(function(){
                        self.fix_line_chart_x_axis(chart, line_data);
                        _.delay(function(){
                            self.fix_line_chart_x_axis(chart, line_data);
                        }, 500);
                    }, 500);
                }

                return chart;
            }, this, line_data));
        },

        get_vertical_bar_chart_data: function () {
            return this.get_vertical_stacked_bar_chart_data();
        },

        draw_vertical_bar_chart: function () {
            var bar_data = this.get_vertical_bar_chart_data();
            if ((!bar_data) || (bar_data && _.isEmpty(bar_data))) {
                this.show_no_available_label();
                return this;
            }

            this.reject_disable_items(bar_data);

            var svg = '#' + this.model.cid + ' svg';
            d3.select(svg).remove(); $(svg, this.$el).empty();
            $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

            var y_axis_label = null;
            if (this.model.get('data').metainfo.yaxis) y_axis_label = this.model.get('data').metainfo.yaxis.label;

            nv.addGraph(dashboardUtil.bind(function() {
                var chart = nv.models.overlapBarChart().options({
                    margin: { top: 10, right: 15, bottom: 35, left: 65 },
                    showLegend: true,
                    reduceXTicks: true,
                    tooltipContent: dashboardUtil.bind(function (key, x, y, e) {
                        var yaxis_metainfo = this.model.get('data').metainfo.yaxis, value = e.point.ay, label = e.point.key,
                            format = this.model.get('data').metainfo.tooltip.format;

                        if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                            if (yaxis_metainfo.type === 'DURATION') {
                                value = this.format_y_axis(value);
                            } else if (yaxis_metainfo.type === 'UNIX_TIME') {
                                value = wialon.util.DateTime.formatTime(value, true, yaxis_metainfo.format);
                            } else {
                                value = wialon.util.String.sprintf(yaxis_metainfo.format, value);
                            }
                        }

                        if (format) value =  wialon.util.String.sprintf(format, value, x);
                        return (label === null ? ('<p>' + value + '</p>') : ('<h3>' + label + '</h3>' + '<p>' + value + '</p>'));
                    }, this),
                    noData: dashboardUtil.tr('No Data Available.')
                }).x(function (d) {
                        return d.x;
                    }).y(function (d) {
                        return d.y;
                    });

                chart.xAxis.showMaxMin(false).tickFormat(dashboardUtil.bind(function (x) { return this.format_x_axis(x); }, this));
                chart.yAxis
                    .showMaxMin(false)
                    .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y); }, this))
                    .axisLabel(y_axis_label)
                    .rotateYLabel(false);

                d3.select(svg).datum(bar_data).transition().duration(200).call(chart);
                nv.utils.windowResize(chart.update);

                this.saved_chart_legend_state(chart);

                return chart;
            }, this));
        },

        get_vertical_stacked_bar_chart_data: function () {
            var value = this.model.get('data'),
                unit_bar_data;

            if (!value || value.status !== 'OK') return [];

            var bar_data = [], unique_x_unit = {}, unique_x = {};
            for (var uid in value.data) {
                if (!_.has(value.data, uid)) continue;

                var unit_data = value.data[uid].data;
                if ((!unit_data) || unit_data.length < 1) continue;

                unit_bar_data = { 'key': value.data[uid].nm, 'values': [] };
                var u_data = null;
                unique_x_unit[unit_bar_data.key] = {};

                for (var i = 0, len = unit_data.length; i < len; i++) {
                    u_data = unit_data[i];
                    if (u_data.data.rawValue === null || u_data.data.rawValue === undefined) continue;

                    var user_time = wialon.util.DateTime.userTime(u_data.time.rawValue),
                        tz_offset = wialon.util.DateTime.getTimezoneOffset();
                    var x = user_time - (user_time % 86400) - (tz_offset < 0 ? (tz_offset) : 0),
                        y = (u_data.data.rawValue / this.get_divisor_by_data_type(u_data.data.dataType));
                    unit_bar_data.values.push({ 'x': x, 'y': y, 'ay': y, 'key': value.data[uid].nm });

                    if (!_.has(unique_x_unit[unit_bar_data.key], x)) unique_x_unit[unit_bar_data.key][x] = null;
                    if (!_.has(unique_x, x)) unique_x[x] = null;
                }
                bar_data.push(unit_bar_data);
            }

            unit_bar_data = null;
            for (var ux in unique_x) {
                if (!_.has(unique_x, ux)) continue;


                for (var z = 0, leng = bar_data.length; z < leng; z++) {
                    unit_bar_data = bar_data[z];
                    if (!unit_bar_data) continue;

                    var uxu = unique_x_unit[unit_bar_data.key];
                    if (!_.has(uxu, ux)) unit_bar_data.values.push({ 'x': parseInt(ux,10), 'y': 0, 'ay': 0, 'nm': unit_bar_data.key, is_null: true });
                }
            }
            for (var f = 0, lens = bar_data.length; f < lens; f++) {
                unit_bar_data = bar_data[f];
                if (!unit_bar_data) continue;

                unit_bar_data.values = _.sortBy(unit_bar_data.values, function (value) { return value.x; });
            }

            return bar_data;
        },

        draw_vertical_stacked_bar_chart_data: function (isnstacked) {
            if (!isnstacked) isnstacked = false;
            var bar_data = this.get_vertical_stacked_bar_chart_data();
            if ((!bar_data) || (bar_data && _.isEmpty(bar_data))) {
                this.show_no_available_label();
                return this;
            }

            this.reject_disable_items(bar_data);

            var svg = '#' + this.model.cid + ' svg';
            d3.select(svg).remove(); $(svg, this.$el).empty();
            $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

            var y_axis_label = null;
            if (this.model.get('data').metainfo.yaxis) y_axis_label = this.model.get('data').metainfo.yaxis.label;

            nv.addGraph(dashboardUtil.bind(function() {
                var chart = nv.models.multiBarChart().options({
                    margin: { top: 0, right: 15, bottom: 35, left: 65 },
                    showControls: false,
                    showLegend: true,
                    reduceXTicks: true,
                    tooltipContent: dashboardUtil.bind(function (key, x, y, e) {
                        var yaxis_metainfo = this.model.get('data').metainfo.yaxis, value = e.value, label = key,
                            format = this.model.get('data').metainfo.tooltip.format;

                        if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                            if (yaxis_metainfo.type === 'DURATION') {
                                value = this.format_y_axis(value);
                            } else if (yaxis_metainfo.type === 'UNIX_TIME') {
                                value = wialon.util.DateTime.formatTime(value, true, yaxis_metainfo.format);
                            } else {
                                value = wialon.util.String.sprintf(yaxis_metainfo.format, value);
                            }
                        }

                        if (format) value =  wialon.util.String.sprintf(format, value, x);
                        return (label === null ? ('<p>' + value + '</p>') : ('<h3>' + label + '</h3>' + '<p>' + value + '</p>'));
                    }, this),
                    noData: dashboardUtil.tr('No Data Available.')
                }).stacked(!isnstacked);

                chart.xAxis.showMaxMin(false).tickFormat(dashboardUtil.bind(function (x) { return this.format_x_axis(x); }, this));
                chart.yAxis
                    .showMaxMin(false)
                    .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y); }, this))
                    .axisLabel(y_axis_label)
                    .rotateYLabel(false);

                d3.select(svg).datum(bar_data).transition().duration(200).call(chart);
                nv.utils.windowResize(chart.update);

                this.saved_chart_legend_state(chart);

                return chart;
            }, this));
        },

        get_horizontal_bar_chart_data: function () {
            var value = this.model.get('data');
            if ((!value) || value.status !== 'OK') return [];

            var bar_data = [{ key: null, values: [] }];
            for (var uid in value.data) {
                if (!_.has(value.data, uid)) continue;
                if (value.data[uid].disabled) continue;

                var label = value.data[uid].nm;
                if (label.length > 18) {
                    label = label.slice(0, 19) + '...';
                }

                var unit_data = value.data[uid].data;
                if (unit_data.length < 1) continue;

                var unit_bar_data = { label: label, value: value.data[uid].total.rawValue / this.get_divisor_by_data_type(value.data[uid].total.dataType) };
                bar_data[0].values.push(unit_bar_data);
            }

            bar_data[0].values =  _.sortBy(bar_data[0].values, function (item) {
                return item.value;
            });

            var filters = this.model.get('filters');
            if (filters && _.has(filters, 'max_min')) {
                var max_min = filters.max_min;
                if (max_min.is_max) bar_data[0].values = bar_data[0].values.reverse();
            }

            return bar_data;
        },

        draw_horizontal_bar_chart: function () {
            var bar_data = this.get_horizontal_bar_chart_data();
            if ((!bar_data) || (bar_data && _.isEmpty(bar_data))) {
                this.show_no_available_label();
                return this;
            }

            if ((!bar_data[0].values) || _.isEmpty(bar_data[0].values)) {
                this.show_no_available_label();
                return this;
            }

            var svg = '#' + this.model.cid + ' svg';
            d3.select(svg).remove(); $(svg, this.$el).empty();
            $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

            var y_axis_label = null;
            if (this.model.get('data').metainfo.yaxis) y_axis_label = this.model.get('data').metainfo.yaxis.label;

            nv.addGraph(dashboardUtil.bind(function(bar_data) {
                var chart = nv.models.multiBarHorizontalChart().options({
                    margin: { top: 10, right: 30, bottom: 30, left: 140 },
                    barColor: nv.utils.defaultColor(),
                    tooltipContent: dashboardUtil.bind(function (key, x, y, e, graph) {
                        var yaxis_metainfo = this.model.get('data').metainfo.yaxis, value = e.value;
                        if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                            if (yaxis_metainfo.type === 'DURATION') {
                                value = this.format_y_axis(value);
                            } else if (yaxis_metainfo.type === 'UNIX_TIME') {
                                value = wialon.util.DateTime.formatTime(value, true, yaxis_metainfo.format);
                            } else {
                                value = wialon.util.String.sprintf(yaxis_metainfo.format, value);
                            }
                        }
                        return '<p>' + value + '</p>';
                    }, this),
                    noData: dashboardUtil.tr('No Data Available.')
                }).x(function(d) {
                    return d.label;
                }).y(function(d) {
                    return d.value;
                }).showValues(false).tooltips(true).showControls(false).showLegend(false);

                chart.yAxis
                    .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y); }, this))
                    .axisLabel(y_axis_label);

                d3.select(svg).datum(bar_data).transition().duration(500).call(chart);
                nv.utils.windowResize(chart.update);

                this.saved_chart_legend_state(chart);

                return chart;
            }, this, bar_data));


            return this;
        },

        render: function () {
            BaseWidgetView.prototype.render.apply(this, arguments);
            $('.panel-icon-wrapper', this.$el).append(this.headingAddonTemplate);
            $('.panel-title', this.$el).html(_.unescape(this.model.get('title')));

            $('.icon-chart', this.$el).addClass('disable-chart');
            var charts_type = $.cookie('dashboard_charts_type'), chart_type = 'pie-chart';
            if (charts_type) {
                if (_.has(charts_type, this.model.id)) {
                    chart_type = charts_type[this.model.id];
                }
            }
            $('div[data-chart-type="' + chart_type + '"]', this.$el).removeClass('disable-chart');

            return this;
        },

        refresh: function (model, value) {
            if (!value) {
                this.show_no_available_label();
            } else {
                $('.panel-title', this.$el).html(_.unescape(value.title));

                $('.icon-chart', this.$el).addClass('disable-chart');
                var charts_type = $.cookie('dashboard_charts_type'), chart_type = 'pie-chart';
                if (charts_type) {
                    if (_.has(charts_type, this.model.id)) {
                        chart_type = charts_type[this.model.id];
                    }
                }
                $('div[data-chart-type="' + chart_type + '"]', this.$el).removeClass('disable-chart');

                chart_type = $(".icon-chart", this.$el).not('.disable-chart').data('chart-type');
                if (chart_type === 'horizontal-bar-char') {
                    this.draw_horizontal_bar_chart();
                } else if (chart_type === 'vertical-bar-chart') {
                    this.draw_vertical_bar_chart();
                } else if (chart_type === 'vertical-stacked-bar-chart') {
                    this.draw_vertical_stacked_bar_chart_data();
                } else if (chart_type === 'line-chart') {
                    this.draw_line_chart();
                } else if (chart_type === 'pie-chart') {
                    this.draw_pie_chart();
                }
            }

            return this;
        }
    });

    var TableWidgetView = BaseWidgetView.extend({
        headingAddonTemplate: $('#table-heading-template-add-on').html(),

        events: (function () {
            return _.extend({}, BaseWidgetView.prototype.events, {
                'click .icon.refresh' : 'want_refresh',
                'click .table-row' : 'show_map_behavior'
            });
        }()),

        initialize: function (options) {
            BaseWidgetView.prototype.initialize.apply(this, [options]);

            $('body').on('click.TableWidgetView', this.hide_map_behavior);
        },

        refresh: function (model, value) {
            if (!value) {
                this.show_no_available_label();
            } else {
                $('.panel-title', this.$el).html(_.unescape(value.title));

                if (value.metainfo.refreshable) {
                    $('.icon.refresh', this.$el).show();
                }
                if (value.metainfo.hideable) {
                    $('.icon.chevron', this.$el).show();
                }

                var columns = [], headers = {};
                for (var z = 0, leng = value.data.columns.length; z < leng; z++) {
                    columns.push(value.data.columns[z].text);

                    headers[z] = {};
                    headers[z].sorter = value.data.columns[z].sortable;
                    if (value.data.columns[z].sortable) headers[z].sorter = 'cnumeric';
                }

                var rows = value.data.rows, row = null, tds = null, tdValue = null, trows = [];

                if (value.metainfo.sorted_index > 0) {
                    rows = wialon.util.Helper.sortItems(rows, function (item) {
                        return item.rowValue[value.metainfo.sorted_index - 1].dataValue;
                    });
                }

                for (var i = 0, len = rows.length; i < len; i++) {
                    row = rows[i];
                    if (row === null) {
                        trows.push(_.template(templates.tableRowTemplate, { 'tds': [] }));
                    } else {
                        tds = [];
                        if (value.metainfo.row_numbering) {
                            tds.push(_.template(templates.numberTdTemplate, { 'value': i + 1, 'rawvalue': i + 1 }));
                        }

                        for (var j = 0, lenj = row.rowValue.length; j < lenj; j++) {
                            tdValue = row.rowValue[j];
                            if (tdValue.dataValue === null) {
                                if (tdValue.dataType === 'NAME' || tdValue === 'ADDRESS' || tdValue === 'TEXT') {
                                    tds.push(_.template(templates.textTdTemplate, { 'value': dashboardUtil.tr('N/A'), 'rawvalue': '' }));
                                } else {
                                    tds.push(_.template(templates.textTdTemplate, { 'value': dashboardUtil.tr('N/A'), 'rawvalue': -1 * Number.MAX_VALUE }));
                                }
                            } else {
                                if (tdValue.dataType === 'TEXT' || tdValue.dataType === 'SPEED' ||
                                    tdValue.dataType === 'UNIX_TIME' || tdValue.dataType === 'NUMERIC' ||
                                    tdValue.dataType === 'ADDRESS' || tdValue.dataType === 'NAME') {
                                    tds.push(_.template(templates.textTdTemplate, { 'value': tdValue.dataValue , 'rawvalue': tdValue.rawValue !== undefined ? tdValue.rawValue : tdValue.dataValue }));
                                } else if (tdValue.dataType === 'IMAGE') {
                                    tds.push(_.template(templates.imageTdTemplate, { 'value': tdValue.dataValue, 'rawvalue': 0, height: "32px", css_class: "unit-image-td" }));
                                } else if (tdValue.dataType === 'IS_ONLINE') {
                                    var tmp = './img/unconnection.png';
                                    if (tdValue.dataValue) tmp = './img/connection.png';
                                    tds.push(_.template(templates.imageTdTemplate, { 'value': tmp, 'rawvalue': tdValue.dataValue ? 1 : 0, height: "16px", css_class: "online-td" }));
                                }
                            }
                        }
                        var rowMeta = _.extend({
                            lat: null,
                            lon: null,
                            iconSrc: null
                        }, row.rowMeta);
                        var tplData = {'tds': tds, 'rowMeta': rowMeta};

                        trows.push(_.template(templates.tableRowTemplate, tplData));
                    }
                }

                if (trows.length > 0) {
                    var thead = _.template(templates.tableHeadTemplate, { 'columns': columns });
                    var tbody = _.template(templates.tableBodyTemplate, { 'rows': trows.join('') });
                    var table = _.template(templates.tableTemplate, { 'thead': thead, 'tbody': tbody, 'id': 'table-' + this.model.cid });

                    var svg = '#' + this.model.cid + ' svg'; $(svg).empty();
                    $('#' + this.model.cid).html(table);

                    var sortList = [];
                    if (value.metainfo.sorted_index !== -1) sortList.push([value.metainfo.sorted_index, 0]);

                    $('#' + this.model.cid + ' table', this.$el).tablesorter({
                        sortList: sortList,
                        headers: headers,
                        sortStable: true,
                        textSorter: function (a, b, direction, columnIndex, table) {
                            if (a === dashboardUtil.tr('N/A').toLowerCase()) a = '';
                            if (b === dashboardUtil.tr('N/A').toLowerCase()) b = '';

                            return dashboardUtil.compareText(a, b);
                        }
                    }).on('sortEnd', dashboardUtil.bind(function (is_numb, table) {
                            if (!is_numb) return;

                            $('td:first-child', this.$el).each(function (index, td) {
                                $(td).text(index + 1).data('raw', index + 1);
                            });
                        }, this, value.metainfo.row_numbering));
                } else {
                    this.show_no_available_label();
                }
            }
        },

        want_refresh: function () {
            this.trigger('want_refresh', this);
        },

        // here we store target row on click
        tableRowTarget : undefined,

        show_map_behavior: function (e) {
            e.stopPropagation();
            var target = e.currentTarget ? e.currentTarget : e.srcElement,
                targetData = {};
            // hide map if current target is the same like in previous click
            if (this.tableRowTarget !== undefined && this.tableRowTarget === target && map.isOpened()) {
                map.close();
                this.tableRowTarget = undefined;
                return false;
            }
            this.tableRowTarget = target;
            targetData.pos = {
                lat: $(target).attr(config.rowMeta.lat),
                lon: $(target).attr(config.rowMeta.lon)
            };
            targetData.iconSrc = $(target).attr(config.rowMeta.iconSrc);
            if (_.isEmpty(targetData.pos.lon) || _.isEmpty(targetData.pos.lat) || _.isEmpty(targetData.iconSrc)) {
                map.close();
                return false;
            }
            map.open(targetData.pos).addIcon(targetData.iconSrc, targetData.pos);
        },

        hide_map_behavior: function (e) {
            map.close();
        },

        render: function () {
            BaseWidgetView.prototype.render.apply(this, arguments);
            $('.panel-body', this.$el).addClass('scroll');
            $('.panel-icon-wrapper', this.$el).append(this.headingAddonTemplate);
            $('.panel-title', this.$el).html(_.unescape(this.model.get('title')));
            $('.panel-body.scroll', this.$el).on('scroll.TableWidgetView', this.hide_map_behavior);
            return this;
        }
    });

    var DoubleChartWidgetView = BaseWidgetView.extend({
        headingAddonTemplate: $('#double-chart-heading-template-add-on').html(),

        events: (function () {
            return _.extend({}, BaseWidgetView.prototype.events, {
                'click .icon.line-chart': 'click_line_chart',
                'click .icon.vertical-bar-chart': 'click_vertical_bar_chart'
            });
        }()),

        initialize: function (options) {
            BaseWidgetView.prototype.initialize.apply(this, [options]);
        },

        click_line_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
        },

        click_vertical_bar_chart: function (evt) {
            if ($(evt.target, this.$el).hasClass('disable') || !$(evt.target, this.$el).hasClass('disable-chart')) return;
            this.click_icon_chart(evt.target);
        },

        click_icon_chart: function (target) {
            $(target, this.$el).siblings('.icon-chart').addClass('disable-chart');
            $(target, this.$el).removeClass('disable-chart');

            var left_chart_type = $(".icon-chart-left", this.$el).not('.disable-chart').data('chart-type'),
                right_chart_type = $(".icon-chart-right", this.$el).not('.disable-chart').data('chart-type');

            var charts_type = $.cookie('dashboard_charts_type');
            if (charts_type) {
                charts_type[this.model.id] = left_chart_type + '|' + right_chart_type;
            } else {
                charts_type = {};
                charts_type[this.model.id] = left_chart_type + '|' + right_chart_type;
            }
            $.cookie('dashboard_charts_type', charts_type, { expires: 300 });

            this.draw_double_charts();
        },

        refresh_chart_icon_state: function () {
            $('.icon-chart', this.$el).addClass('disable-chart');
            var charts_type = $.cookie('dashboard_charts_type'), chart_types = 'left-line-chart|right-vertical-bar-chart';
            if (charts_type) {
                if (_.has(charts_type, this.model.id)) {
                    chart_types = charts_type[this.model.id];
                }
            }

            var tmp = chart_types.split('|'), i, len;
            for (i = 0, len = tmp.length; i < len; i++) {
                $('div[data-chart-type="' + tmp[i] + '"]', this.$el).removeClass('disable-chart');
            }
        },

        get_double_charts_data: function () {
            var value = this.model.get('data');
            if ((!value) || value.status !== 'OK') return [];

            var first_data = value.first_chart.data,
                second_data = value.second_chart.data,
                i, len,
                data_for_graph = null;

            var left_data = {
                    'key': _.unescape(value.first_chart.legendTitle),
                    'bar': false,
                    'values': null,
                    'left': true,
                    'color':  '#ff7f0e', // line color
                    'disabled': value.first_chart.disabled
                },
                right_data = {
                    'key': _.unescape(value.second_chart.legendTitle),
                    'bar': false,
                    'left': false,
                    'values': null,
                    'color': '#1f77b4', // bar color
                    'disabled': value.second_chart.disabled
                };

            var user_time, tz_offset = wialon.util.DateTime.getTimezoneOffset(), x, y,
                first_tmp_x = [],
                second_tmp_x = [],
                first_values = [],
                second_values = [];

            for (i = 0, len = first_data.length; i < len; i++) {
                user_time = wialon.util.DateTime.userTime(first_data[i].time.rawValue);
                x = user_time - (tz_offset < 0 ? (tz_offset) : 0) - (user_time % 86400);
                first_tmp_x.push(x);

                y = first_data[i].data.rawValue / this.get_divisor_by_data_type(first_data[i].data.dataType);

                first_values.push([x, y]);
            }

            for (i = 0, len = second_data.length; i < len; i++) {
                user_time = wialon.util.DateTime.userTime(second_data[i].time.rawValue);
                x = user_time - (tz_offset < 0 ? (tz_offset) : 0) - (user_time % 86400);
                second_tmp_x.push(x);

                y = second_data[i].data.rawValue / this.get_divisor_by_data_type(second_data[i].data.dataType);

                second_values.push([x, y]);
            }

            var x_diff = _.union(first_tmp_x, second_tmp_x);
            for (i = 0, len = x_diff.length; i < len; i++) {
                if (!_.contains(first_tmp_x, x_diff[i])) {
                    first_values.push([x_diff[i], 0]);
                } else if (!_.contains(second_tmp_x, x_diff[i])) {
                    second_values.push([x_diff[i], 0]);
                }
            }

            left_data.values = _.sortBy(first_values, function (arr) { return arr[0]; });
            right_data.values = _.sortBy(second_values, function (arr) { return arr[0]; });

            var charts_type = $.cookie('dashboard_charts_type'), chart_types = ['left-line-chart', 'right-vertical-bar-chart'];
            if (charts_type) {
                if (_.has(charts_type, this.model.id)) {
                    chart_types = charts_type[this.model.id].split('|');
                }
            }

            data_for_graph = [left_data, right_data];
            if (chart_types[0] === 'left-vertical-bar-chart') {
                left_data.bar = true;
                left_data.color = '#1f77b4';
            } else {
                left_data.bar = false;
                left_data.color = '#ff7f0e';
            }

            if (chart_types[1] === 'right-vertical-bar-chart') {
                right_data.bar = true;
                right_data.color = '#1f77b4';
            } else {
                right_data.bar = false;
                right_data.color = '#ff7f0e';
            }

            if (!right_data.bar && !left_data.bar) {
                left_data.color = '#1f77b4';
            } else if (right_data.bar && left_data.bar) {
                left_data.color = '#ff7f0e';
            }

            return data_for_graph;
        },

        draw_double_charts: function () {
            var data_for_graph = this.get_double_charts_data();
            if (!data_for_graph) {
                this.show_no_available_label();
            } else {
                var svg = '#' + this.model.cid + ' svg';
                d3.select(svg).remove(); $(svg, this.$el).empty();
                $('#' + this.model.cid, this.$el).html('<div><svg class="svg-class"></svg></div>');

                var charts_type = $.cookie('dashboard_charts_type'), chart_types = ['left-line-chart', 'right-vertical-bar-chart'];
                if (charts_type) {
                    if (_.has(charts_type, this.model.id)) {
                        chart_types = charts_type[this.model.id].split('|');
                    }
                }

                var model = null;
                if (chart_types[0] === 'left-line-chart' && chart_types[1] === 'right-line-chart') {
                    model = nv.models.linePlusLineChart;
                } else if (chart_types[0] === 'left-vertical-bar-chart' && chart_types[1] === 'right-line-chart') {
                    model = nv.models.linePlusBarChart;
                } else if (chart_types[0] === 'left-line-chart' && chart_types[1] === 'right-vertical-bar-chart') {
                    model = nv.models.barPlusLineChart;
                } else {
                    model = nv.models.barPlusBarChart;
                }

                var value = this.model.get('data');
                nv.addGraph(dashboardUtil.bind(function(first_chart, second_chart) {
                    var chart = model().options({
                        margin: { top: 0, right: 65, bottom: 35, left: 65 },
                        tooltipContent: dashboardUtil.bind(function (key, x, y, e, graph) {
                            var metainfo = e.series.left ? first_chart.metainfo : second_chart.metainfo,
                                yaxis_metainfo, format, oy = e.point[1];

                            yaxis_metainfo = metainfo.yaxis;
                            format = metainfo.tooltip.format;

                            if (yaxis_metainfo !== null && yaxis_metainfo.format !== null) {
                                if (yaxis_metainfo.type === 'DURATION') {
                                    oy = this.format_y_axis(oy, yaxis_metainfo);
                                } else if (yaxis_metainfo.type === 'UNIX_TIME') {
                                    oy = wialon.util.DateTime.formatTime(oy, true, yaxis_metainfo.format);
                                } else {
                                    oy = wialon.util.String.sprintf(yaxis_metainfo.format, oy);
                                }
                            }

                            var at = (format === null ? (oy + ' at ' + x) : wialon.util.String.sprintf(format, oy, x));
                            return '<h3>' + key + '</h3>' + '<p>' + at + '</p>';
                        }, this),
                        noData: dashboardUtil.tr('No Data Available.')
                    }).x(function(d, i) {
                        return i;
                    }).y(function(d) { return d[1]; });

                    var x_format = first_chart.metainfo.xaxis.format,
                        first_y_metainfo = first_chart.metainfo.yaxis,
                        second_y_metainfo = second_chart.metainfo.yaxis,
                        first_y_label = first_chart.metainfo.yaxis.label || '',
                        second_y_label = second_chart.metainfo.yaxis.label || '';

                    chart.xAxis
                        .showMaxMin(false)
                        .tickFormat(dashboardUtil.bind(function (d) {
                            var dx = data_for_graph[0].values[d] && data_for_graph[0].values[d][0] || 0;
                            return this.format_x_axis(dx, x_format);
                        }, this));

                    chart.y1Axis
                        .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y, first_y_metainfo); }, this))
                        .showMaxMin(false)
                        .axisLabel(first_y_label)
                        .rotateYLabel(false);

                    chart.y2Axis
                        .tickFormat(dashboardUtil.bind(function (y) { return this.format_y_axis(y, second_y_metainfo); }, this))
                        .showMaxMin(false)
                        .axisLabel(second_y_label)
                        .rotateYLabel(false);

                    if (chart.bars) {
                        chart.bars.forceY([0]);
                    } else if (chart.bars1 && chart.bars2) {
                        chart.bars1.forceY([0]);
                        chart.bars2.forceY([0]);
                    }

                    d3.select(svg)
                        .datum(data_for_graph)
                        .transition().duration(500)
                        .call(chart);

                    nv.utils.windowResize(chart.update);

                    this.saved_chart_legend_state(chart);

                    return chart;
                }, this, value.first_chart, value.second_chart));
            }
        },

        refresh: function (model, value) {
            if (value && value.first_chart && value.first_chart.title) {
                $('.left-title', this.$el).text(_.unescape(value.first_chart.title));
            }
            if (value && value.second_chart && value.second_chart.title) {
                $('.right-title', this.$el).text(_.unescape(value.second_chart.title));
            }

            if ((!value) || value.status !== 'OK') {
                this.show_no_available_label();
            } else {
                this.refresh_chart_icon_state();
                this.draw_double_charts();
            }
        },

        render: function () {
            BaseWidgetView.prototype.render.apply(this, arguments);
            $('.panel-icon-wrapper', this.$el).html(this.headingAddonTemplate);

            var titles = this.model.get('title').split('|');
            if (titles.length === 2) {
                $('.left-title', this.$el).text(_.unescape(titles[0]));
                $('.right-title', this.$el).text(_.unescape(titles[1]));
            }

            this.refresh_chart_icon_state();

            return this;
        }
    });

    return {
        BaseWidget: BaseWidget,
        ModelWidgets: ModelWidgets,
        BaseWidgetView: BaseWidgetView,
        PlotWidgetView: PlotWidgetView,
        TableWidgetView: TableWidgetView,
        DoubleChartWidgetView: DoubleChartWidgetView
    };
});
