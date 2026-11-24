requirejs.config({
    baseUrl: 'js',
    paths: {
        'jquery': '//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.2/jquery.min',
        'underscore': '//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.6.0/underscore-min',
        'backbone': '//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min',
        'bootstrap': '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.2/js/bootstrap.min',

        'leaflet': '//apps.wialon.com/plugins/leaflet/leaflet/leaflet',
        'webgis': '//apps.wialon.com/plugins/leaflet/webgis/webgis.leaflet.min',
        'wialon.interval': '//apps.wialon.com/plugins/wialon/interval/interval.wialon.min',
    },
    shim: {
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'underscore': {
            exports: '_'
        },
        'd3.v3.3.5.4': {
            exports: 'd3'
        },
        'nv.d3.ext': {
            deps: [
                'nv.d3.1.7.1'
            ]
        },
        'nv.d3.1.7.1': {
            deps: ['d3.v3.3.5.4'],
            exports: 'nv'
        },
        'jquery': {
            exports: '$'
        },
        'backbone.bootstrap-modal': ['bootstrap'],
        'jquery.tablesorter': ['jquery'],
        'jquery-ui-1.10.4.custom': ['jquery'],
        'jquery.cookie': ['jquery'],
        'jquery.ui.touch-punch.min': ['jquery', 'jquery-ui-1.10.4.custom'],
        'bootstrap': ['jquery'],
        'dashboardUtil': ['jquery'],
        'dashboardWidgets': ['backbone'],
        'selectTime': ['backbone'],
        'leaflet': {
            exports: 'L'
        },
        'map': {
            deps: ['jquery', 'leaflet'],
            exports: 'map'
        },
        'webgis': {
            deps: ['leaflet']
        },
        "wialon.interval": {
            deps: ['jquery', 'jquery-ui-1.10.4.custom'],
            exports: '$.fn.intervalWialon'
        }
    }
});

var APP = APP || {};
APP.globals = APP.globals || {};

require(['jquery', 'underscore', 'backbone', 'dashboardUtil', 'dashboardWidgets', 'selectTime', 'map'], function ($, _, Backbone, dashboardUtil, dashboardWidgets, selectTime, map) {
    'use strict';

    window.TRANSLATIONS = window.TRANSLATIONS || {};

    var title = decodeURIComponent(APP_CONFIG.alias || "Dashboard");
    $("#header .app-name").html(title);

    if (dashboardUtil.isTouch()) {
        $('body').addClass('touch');
    } else {
        $('body').addClass('no-touch');
    }

    var MainView = Backbone.View.extend({
        el: window,

        initialize: function () {
            var lang = dashboardUtil.getLang(), self = this,
                debug = dashboardUtil.getParameterByName('debug');

            this.createTableSorterPlugins();

            this.loadModule({
                url: './lang/' + lang + '.json',
                type: 'json',
                success: dashboardUtil.bind(function (data) {
                    if (data) {
                        $.extend(TRANSLATIONS, data);
                    }

                    this.auth(dashboardUtil.bind(function (code) {
                        if (code === 0) {
                            if (lang !== 'en') $.datepicker.regional[lang] = {
                                closeText: dashboardUtil.tr('Close'),
                                prevText: dashboardUtil.tr('Prev'),
                                nextText:  dashboardUtil.tr('Next'),
                                currentText: dashboardUtil.tr('Today'),
                                monthNames: [
                                    dashboardUtil.tr('January'),
                                    dashboardUtil.tr('February'),
                                    dashboardUtil.tr('March'),
                                    dashboardUtil.tr('April'),
                                    dashboardUtil.tr('May'),
                                    dashboardUtil.tr('June'),
                                    dashboardUtil.tr('July'),
                                    dashboardUtil.tr('August'),
                                    dashboardUtil.tr('September'),
                                    dashboardUtil.tr('October'),
                                    dashboardUtil.tr('November'),
                                    dashboardUtil.tr('December')
                                ],
                                monthNamesShort: [
                                    dashboardUtil.tr('Jan'),
                                    dashboardUtil.tr('Feb'),
                                    dashboardUtil.tr('Mar'),
                                    dashboardUtil.tr('Apr'),
                                    dashboardUtil.tr('May'),
                                    dashboardUtil.tr('Jun'),
                                    dashboardUtil.tr('Jul'),
                                    dashboardUtil.tr('Aug'),
                                    dashboardUtil.tr('Sep'),
                                    dashboardUtil.tr('Oct'),
                                    dashboardUtil.tr('Nov'),
                                    dashboardUtil.tr('Dec')
                                ],
                                dayNames: [
                                    dashboardUtil.tr('Sunday'),
                                    dashboardUtil.tr('Monday'),
                                    dashboardUtil.tr('Tuesday'),
                                    dashboardUtil.tr('Wednesday'),
                                    dashboardUtil.tr('Thursday'),
                                    dashboardUtil.tr('Friday'),
                                    dashboardUtil.tr('Saturday')
                                ],
                                dayNamesShort: [
                                    dashboardUtil.tr('Sun'),
                                    dashboardUtil.tr('Mon'),
                                    dashboardUtil.tr('Tue'),
                                    dashboardUtil.tr('Wed'),
                                    dashboardUtil.tr('Thu'),
                                    dashboardUtil.tr('Fri'),
                                    dashboardUtil.tr('Sat')
                                ],
                                dayNamesMin: [
                                    dashboardUtil.tr('Su'),
                                    dashboardUtil.tr('Mo'),
                                    dashboardUtil.tr('Tu'),
                                    dashboardUtil.tr('We'),
                                    dashboardUtil.tr('Th'),
                                    dashboardUtil.tr('Fr'),
                                    dashboardUtil.tr('Sa')
                                ],
                                weekHeader: 'Не',
                                dateFormat: 'dd.mm.yy',
                                firstDay: 1,
                                isRTL: false,
                                showMonthAfterYear: false,
                                yearSuffix: ''
                            };
                            $.datepicker.setDefaults($.datepicker.regional[lang]);

                            var user = wialon.core.Session.getInstance().getCurrUser();
                            user.getLocale(dashboardUtil.bind(function (code, result) {
                                APP.globals.userLocale = result;
                                ((code === 0) ? this.trigger("auth-success", this) : this.trigger("auth-fail", this));
                            }, this));
                        }
                    }, this));
                }, this),
                error: $.proxy(self.message, self, {message: dashboardUtil.tr('Oh! %%module%% didn\'t load!', { 'module': 'LANG' })})
            });
        },

        createTableSorterPlugins: function () {
            $.tablesorter.addParser({
                id: 'cnumeric',
                format: function (s, table, cell) {
                    return $(cell).data('raw');
                },
                type: 'cnumeric'
            });
        },

        loadModule: function (options) {
            var defaults = { condition: true, url: null, type: 'script', success: $.noop, error: $.noop };
            options = $.extend(true, defaults, options);
            if (options.condition) {
                var request = $.ajax({
                    url: options.url,
                    type: 'GET',
                    dataType: (options.type === 'style') ? 'text' : options.type,
                    crossDomain: true,
                    cache: true
                });
                request.then(function (data, textStatus, jqXHR) {
                    options.success(data, textStatus, jqXHR);
                }, function (jqXHR, textStatus) {options.error(jqXHR, textStatus)});
            } else {
                console.log(dashboardUtil.tr('Not necessary to load module'));
            }
        },

        log: {
            start: function (name) {
                if (!name) {
                    return false;
                }
                var d = new Date();
                console.time(dashboardUtil.tr('Execution time: %%title%%', { title: name }));
                console.log(dashboardUtil.tr('[%%time%%] %%title%% started', { time: d.toLocaleTimeString(), title: name }));
            },
            end: function (name) {
                if (!name) {
                    return false;
                }
                console.timeEnd(dashboardUtil.tr('Execution time: %%title%%', { title: name }));
            }
        },

        message: function (options) {
            var self = this,
                defaults = {
                    type: 'log',
                    message: dashboardUtil.tr('Something wrong'),
                    obj: null
                };
            options = $.extend(true, defaults, options);
            if (options.obj) {
                console.groupCollapsed(wialon.util.String.sprintf('%s: %s', dashboardUtil.tr('Message log'), options.message));
                console[options.type](options.obj);
                console.groupEnd();
            }
            /* global alert */
            alert(options.message);
            return self;
        },

        auth: function (callback) {
            var self = this,
                url = dashboardUtil.getParameterByName('baseUrl','https://hst-api.wialon.com') || dashboardUtil.getParameterByName('hostUrl','https://hosting.wialon.com');
            if (!url) {
                url = "https://hst-api.wialon.com";
            }

            if (!url) { self.message({ message: dashboardUtil.tr('Please, fill the correct data in configuration') }); return self; }
            self.loadModule({
                url: url + '/wsdk/script/wialon.js',
                success: dashboardUtil.bind(function () {
                    var session = wialon.core.Session.getInstance();
                    session.initSession(url, 'gapp_dashboard_app');

                    var afterLogin = function (code) {
                        callback && callback(code);
                        if (code) {
                            $('#header-gug').removeClass('gug-progress');
                            this.message({ message: dashboardUtil.tr('Oh! Unfortunately, you can\'t login'),
                                obj: wialon.core.Errors.getErrorText(code) });
                            return self;
                        }

                        wialon.core.Remote.getInstance().remoteCall('core/set_session_property', { prop_name:'skip_nonactive_items', prop_value:1 }, function () {});

                        session.updateDataFlags([{ type: 'type', data: 'avl_unit', flags: 0x1, mode: 0 }]);
                        session.updateDataFlags([{ type: 'type', data: 'avl_unit_group', flags: 0x1, mode: 0 }]);

                        session.addListener('invalidSession', function () {
                            self.trigger("invalid-session", self);
                            $.proxy(self.message, self, { message: dashboardUtil.tr('Session has been lost') })();
                        });
                    };

                    var sid = dashboardUtil.getParameterByName('sid');
                    var user = dashboardUtil.getParameterByName('user');
                    var authHash = dashboardUtil.getParameterByName('authHash');
                    if (authHash){
                        session.loginAuthHash(authHash, dashboardUtil.bind(afterLogin, this));
                    } else if (sid) {
                        session.duplicate(sid, user, true, dashboardUtil.bind(afterLogin, this));
                    }
                }, this),
                error: function () {
                    $('#header-gug').removeClass('gug-progress');
                    $.proxy(self.message, self, { message: dashboardUtil.tr('Oh! Unfortunately, we can\'t load SDK') });
                }
            });
        }
    });

    var AddWidgetView = Backbone.View.extend({
        template: $('#add-widget-template').html(),
        optionsTemplate: $('#options-template').html(),
        widgetsTemplate: $('#widgets-template').html(),

        events: {
            'click .dashboard-nav-tabs': 'click_dashboard_nav_tabs',
            'click .multi-type-tabs': 'click_multi_type_tabs',
            'click .select-server-type': 'click_select_server_type',

            'click .select-sub-widget': 'click_select_sub_widget',
            'click .max-min-filter-sort-order': 'click_max_min_filter_sort_order',
            'click .av-is-total': 'click_av_is_total',
            'click .circle': 'click_av_is_total_circle',

            'change select.select-avl-object': 'change_select_avl_object'
        },

        initialize: function (widgets_data, widget, options) {
            Backbone.View.prototype.initialize.apply(this, [options]);

            this.widget = widget || null;
            this.widgets_data = widgets_data;

            $('body').bind('click', dashboardUtil.bind(function (evt) {
                $('.sub-widgets-popup', this.$el).hide();
            }, this));
        },

        click_dashboard_nav_tabs: function (evt) {
            evt.stopPropagation();

            var target = evt.currentTarget;
            if (!$(target, this.$el).hasClass('active')) {
                $('.dashboard-nav-tabs.active', this.$el).removeClass('active');
                $(target, this.$el).addClass('active');

                $('.ul-tab').hide();
                $('#' + $(target, this.$el).data('graph-type') + '-tabs', this.$el).show();
            }
        },

        click_multi_type_tabs: function (evt) {
            evt.stopPropagation();

            var target = evt.currentTarget;
            if (!$(target, this.$el).hasClass('active')) {
                $('.multi-type-tabs.active', this.$el).removeClass('active');
                $(target, this.$el).addClass('active');

                $('.multi-graph-layout', this.$el).hide();
                $('#' + $(target, this.$el).data('layout'), this.$el).show();
            }
        },

        click_select_server_type: function (evt) {
            evt.stopPropagation();
            this._click_select_server_type(evt.currentTarget);
        },

        _click_select_server_type: function (target, server_context, graph_type, tab_id) {
            if ($(target, this.$el).hasClass('select-sub-widgets')) {
                this.show_sub_widgets(target);
            } else {
                this.server_type_click(target, server_context, graph_type, tab_id);
            }
        },

        show_sub_widgets: function (target, server_context, graph_type, tab_id) {
            $('.sub-widgets-popup', this.$el).hide();

            var sub_widgets_popup = $('.sub-widgets-popup', $(target).parent());
            sub_widgets_popup.show();
        },

        server_type_click: function (target, server_context, graph_type, tab_id) {
            if (target.length === 0) return;
            $('.sub-widgets-popup', this.$el).hide();

            server_context = server_context || this.get_server_type_context();
            $('.select-server-type.active', server_context).removeClass('active');
            $(target).addClass('active');

            graph_type = graph_type || $('.dashboard-nav-tabs.active', this.$el).data('graph-type');

            var context = this.$el;
            if (graph_type === 'simple-graph') {
                context = $('#simple-graph-tabs', this.$el);
                var server_type = $('.select-server-type.active', context).data('server-type'),
                    avl_type = $('.select-avl-object :selected', context).parent().data('avl-type') || 'avl_unit',
                    widgets = APP.globals.widget_data.widgets;

                var templates = widgets.avl_object.templates, i, len;
                for (i = 0, len = templates.length; i < len; i++) {
                    var template = templates[i];
                    if (template && template.server_type === server_type) {
                        if (template.type === 'table' || (avl_type === 'avl_unit' && $('.select-avl-object', context).val() !== 'default')) {
                            $('.filter-wrapper', context).addClass('disable');
                            $('.max-min-filter-sort-order', context).addClass('disable');
                            $('.max-min-filter-count', context).prop('disabled', true);
                            $('.max-min-checkbox-is-pass-zeroth', context).prop('disabled', true);
                        } else {
                            $('.filter-wrapper', context).removeClass('disable');
                            $('.max-min-filter-sort-order', context).removeClass('disable');
                            $('.max-min-filter-count', context).prop('disabled', false);
                            $('.max-min-checkbox-is-pass-zeroth', context).prop('disabled', false);
                        }
                        break;
                    }
                }
            } else if (graph_type === 'multi-graph') {
                var tab = tab_id ? '#' + tab_id + ' span' : '.multi-type-tabs.active span';
                context = $('#multi-graph-tabs', this.$el);
                $(tab, context).text($('span', target).text());
            }
        },

        click_select_sub_widget: function (evt) {
            evt.stopPropagation();
            this._click_select_sub_widget(evt.currentTarget);
        },

        _click_select_sub_widget: function (target, server_context, graph_type, tab_id) {
            if (target.length === 0) return;
            $('.sub-widgets-popup', this.$el).hide();

            var parent_server_type = $(target).data('parent-server-type');
            server_context = server_context || this.get_server_type_context();
            graph_type = graph_type || $('.dashboard-nav-tabs.active', this.$el).data('graph-type');

            $('.select-server-type.active', server_context).removeClass('active');
            $('.select-sub-widget.active', server_context).removeClass('active');

            var server_type = $("[data-server-type='" + parent_server_type + "']", server_context);
            if (server_type) {
                var span = $('span', server_type);
                $(span).html($(target).data('title'));

                $(target).addClass('active');
                $(server_type, server_context).data('server-type', $(target).data('server-type'));
                $(server_type, server_context).addClass('active');

                if (graph_type === 'multi-graph') {
                    var tab = tab_id ? '#' + tab_id + ' span' : '.multi-type-tabs.active span',
                        context = $('#multi-graph-tabs', this.$el);
                    $(tab, context).text($(target).data('title'));
                }
            }
        },

        click_max_min_filter_sort_order: function (evt) {
            if (!$(evt.target).hasClass('disable')) {
                $(evt.target, this.$el).toggleClass('filter-sort-order-a-z').toggleClass('filter-sort-order-z-a');
            }
        },

        click_av_is_total: function (evt, target) {
            target = evt ? evt.target : target;
            if (!$('.av-total-filter', this.$el).hasClass('disable') && !$(target).hasClass('active')) {
                $('.av-is-total', this.$el).removeClass('active').siblings('.circle').removeClass('active');
                $(target, this.$el).addClass('active').siblings('.circle').addClass('active');
            }
        },

        click_av_is_total_circle: function (evt) {
            this.click_av_is_total(null, $(evt.target, this.$el).siblings('.av-is-total'));
        },

        change_select_avl_object: function (evt) {
            var graph_type = $('.dashboard-nav-tabs.active', this.$el).data('graph-type'),
                context, value, is_disable, avl_type;

            if (graph_type === 'simple-graph') {
                context = $('#simple-graph-tabs', this.$el);
                value = $('.select-avl-object', context).val();
                avl_type = $('.select-avl-object :selected', context).parent().data('avl-type') || 'avl_unit';

                var server_type = $('.select-server-type.active', context).data('server-type'),
                    widgets = APP.globals.widget_data.widgets;

                is_disable = (value !== "default" && avl_type === 'avl_unit');
                if ((!is_disable) && _.has(widgets, 'avl_object')) {
                    var templates = widgets.avl_object.templates, i, len;
                    for (i = 0, len = templates.length; i < len; i++) {
                        var template = templates[i];

                        if (template && template.server_type === server_type && template.type === 'table') {
                            is_disable = true;
                            break;
                        }
                    }
                }

                is_disable ? $('.filter-wrapper', context).addClass('disable') : $('.filter-wrapper', context).removeClass('disable');
                is_disable ? $('.max-min-filter-sort-order', context).addClass('disable') : $('.max-min-filter-sort-order', context).removeClass('disable');
                $('.max-min-filter-count', context).prop('disabled', is_disable);
                $('.max-min-checkbox-is-pass-zeroth', context).prop('disabled', is_disable);
            } else if (graph_type === 'multi-graph') {
                context = $('#multi-graph-tabs', this.$el);
                value = $('.select-avl-object', context).val();
                avl_type = $('.select-avl-object :selected', context).parent().data('avl-type') || 'avl_unit';

                is_disable = (value !== "default" && avl_type === 'avl_unit');
                is_disable ? $('.filter-wrapper', context).addClass('disable') : $('.filter-wrapper', context).removeClass('disable');
                is_disable ? $('.av-total-filter', context).addClass('disable') : $('.av-total-filter', context).removeClass('disable');
                $('.av-total-checkbox-is-pass-zeroth', context).prop('disabled', is_disable);
            }
        },

        get_server_type_context: function () {
            var graph_type = $('.dashboard-nav-tabs.active', this.$el).data('graph-type'), context = this.$el;
            if (graph_type === 'simple-graph') {
                context = $('#simple-graph-tabs', this.$el);
            } else if (graph_type === 'multi-graph') {
                context = $('#' + $('.multi-type-tabs.active').data('layout'), this.$el);
            }
            return context;
        },

        render: function () {
            var session = wialon.core.Session.getInstance(), i, len;
            var units = wialon.util.Helper.sortItems(session.getItems('avl_unit')), units_options = [],
                groups = wialon.util.Helper.sortItems(session.getItems('avl_unit_group')), groups_options = [],
                widgets = this.widgets_data.widgets, w_data, widgets_data = [], multi_widgets_data = [];

            for (i = 0, len = units.length; i < len; i++) {
                if(units[i].getUserAccess() & 0x200)
                    units_options.push({ 'title': units[i].getName(), 'value': units[i].getId() });
            }

            for (i = 0, len = groups.length; i < len; i++) {
                groups_options.push({ 'title': groups[i].getName(), 'value': groups[i].getId() });
            }

            var select_avl_object_html = _.template(this.optionsTemplate, { options: [{'title': dashboardUtil.tr('All units'), 'value': 'default'}] }) +
                '<optgroup data-avl-type="avl_unit" label="' + dashboardUtil.tr('Units') + '">' +
                _.template(this.optionsTemplate, { options: units_options }) +
                '</optgroup><optgroup data-avl-type="avl_unit_group" label="' + dashboardUtil.tr('Unit groups') + '">' +
                _.template(this.optionsTemplate, { options: groups_options }) +
                '</optgroup>';

            var tmp = [];
            if (_.has(widgets, 'avl_object')) {
                var templates = widgets.avl_object.templates, template = null;
                for (i = 0, len = templates.length; i < len; i++) {
                    template = templates[i];
                    if (_.contains(tmp, template.server_type)) {
                        continue;
                    }

                    w_data = {'title': template.title, 'value': template.server_type};
                    if (template.sub_widgets) {
                        w_data.sub_widgets = template.sub_widgets;
                    }

                    tmp.push(template.server_type);

                    widgets_data.push(w_data);
                    if (template.type !== 'table') {
                        multi_widgets_data.push(w_data);
                    }
                }
            }

            var template_context = {
                'max_min': {
                    'count': 10, // by default
                    'is_max': true, // by_default
                    'is_pass_zeroth': true // by default
                },

                'av_total': {
                    'is_total': false, // by default
                    'is_pass_zeroth': true // by default
                },

                'select_avl_object_html': select_avl_object_html,
                'widgets_html': _.template(this.widgetsTemplate, { widgets_data: widgets_data, index: 0 }),
                'multi_widgets_html': _.template(this.widgetsTemplate, { widgets_data: multi_widgets_data, index: 0 }),

                'cancel_label': dashboardUtil.tr('Cancel'),
                'show_units_label': dashboardUtil.tr('Show units:'),
                'skip_zero_label': dashboardUtil.tr('Skip zeroth values'),
                'charts_label': dashboardUtil.tr('Charts'),
                'multicharts_label': dashboardUtil.tr('Multicharts'),
                'average_label': dashboardUtil.tr('Average'),
                'total_label': dashboardUtil.tr('Total')
            };

            if (this.widget !== null) {
                var filters = this.widget.get('filters');
                if (filters && _.has(filters, 'max_min')) {
                    _.extend(template_context.max_min, filters.max_min);
                }

                if (filters && _.has(filters, 'av_total')) {
                    _.extend(template_context.av_total, filters.av_total);
                }
            }

            this.$el.html(_.template(this.template, template_context));

            var graph_type = ((this.widget && this.widget.get('type') === 'double_chart') ? 'multi-graph' : 'simple-graph');
            $(".dashboard-nav-tabs[data-graph-type='" + graph_type + "']", this.$el).click();
            $('#first-multi-graph-tab', this.$el).click();

            if (this.widget !== null && graph_type === 'multi-graph') {
                var server_types = this.widget.get('server_type').split('|');
                this._click_select_server_type($("#first-multi-graph-layout .select-server-type[data-server-type='" + server_types[0] + "']", this.$el),
                    $('#first-multi-graph-layout', this.$el), 'multi-graph', 'first-multi-graph-tab');
                this._click_select_sub_widget($("#first-multi-graph-layout .select-sub-widget[data-server-type='" + server_types[0] + "']", this.$el),
                    $('#first-multi-graph-layout', this.$el), 'multi-graph', 'first-multi-graph-tab');

                this._click_select_server_type($("#second-multi-graph-layout .select-server-type[data-server-type='" + server_types[1] + "']", this.$el),
                    $('#second-multi-graph-layout', this.$el), 'multi-graph', 'second-multi-graph-tab');
                this._click_select_sub_widget($("#second-multi-graph-layout .select-sub-widget[data-server-type='" + server_types[1] + "']", this.$el),
                    $('#second-multi-graph-layout', this.$el), 'multi-graph', 'second-multi-graph-tab');
            } else {
                this._click_select_server_type($('#first-multi-graph-layout .select-server-type', this.$el).eq(0),
                    $('#first-multi-graph-layout', this.$el), 'multi-graph', 'first-multi-graph-tab');

                this._click_select_server_type($('#second-multi-graph-layout .select-server-type', this.$el).last(),
                    $('#second-multi-graph-layout', this.$el), 'multi-graph', 'second-multi-graph-tab');
            }

            var tmp_context = this.get_server_type_context();
            if (this.widget !== null && graph_type === 'simple-graph') {
                $('.select-server-type.active', tmp_context).removeClass('active');
                $("[data-server-type='" + this.widget.get('server_type') + "']", tmp_context).click();

                $('.select-avl-object', $('#simple-graph-tabs', this.$el)).val(this.widget.get('gid') || 'default');
            } else if (this.widget !== null && graph_type === 'multi-graph') {
                $('.select-avl-object', $('#multi-graph-tabs', this.$el)).val(this.widget.get('gid') || 'default');
            }

            this.change_select_avl_object(null);

            return this;
        },

        get_template_by_server_type: function (server_type) {
            var templates = APP.globals.widget_data.widgets.avl_object.templates, i, len, template = null;
            for (i = 0, len = templates.length; i < len; i++) {
                if (templates[i].server_type === server_type) {
                    template = templates[i];
                } else if (templates[i].sub_widgets) {
                    var sub_widgets = templates[i].sub_widgets.templates || [], k, len_k;
                    for (k = 0, len_k = sub_widgets.length; k < len_k; k++) {
                        var sub_widget = sub_widgets[k];
                        if (sub_widget.server_type === server_type) {
                            template = templates[i];
                        }
                    }
                }
            }
            return template;
        },

        get_data: function () {
            var graph_type = $('.dashboard-nav-tabs.active', this.$el).data('graph-type'),
                context = this.$el,
                data = null,
                server_type = null,
                data_for_filters = {};

            if (graph_type === 'simple-graph') {
                context = $('#simple-graph-tabs', this.$el);
                server_type = $('.select-server-type.active', context).data('server-type');
                var template = this.get_template_by_server_type(server_type);

                data = {
                    'server_type': server_type,
                    'is_static': template.is_static,
                    'type': template.type,
                    'ct': $('.select-avl-object :selected', context).parent().data('avl-type') || 'avl_unit',
                    'gid': (parseInt($('.select-avl-object', context).val(), 10) || null)
                };

                if (((data.ct === 'avl_unit' && data.gid === null) || data.ct === 'avl_unit_group') && data.type !== 'table') {
                    if (!$('.checkbox-is-pass-zeroth', this.$el).prop('disabled')) {
                        data_for_filters.is_pass_zeroth = $('.max-min-checkbox-is-pass-zeroth', context).is(':checked');
                        data_for_filters.count = parseInt($('.max-min-filter-count', context).val(), 10);
                        data_for_filters.is_max = $('.max-min-filter-sort-order', context).hasClass('filter-sort-order-a-z');
                    }
                    if (!_.isEmpty(data_for_filters)) {
                        _.extend(data, { 'filters': { 'max_min': data_for_filters } });
                    }
                }
            } else if (graph_type === 'multi-graph') {
                context = $('#multi-graph-tabs', this.$el);
                var first_context = $('#first-multi-graph-layout', context),
                    second_context = $('#second-multi-graph-layout', context);

                var first_server_type = $('.select-server-type.active', first_context).data('server-type'),
                    second_server_type = $('.select-server-type.active', second_context).data('server-type');

                var first_template = this.get_template_by_server_type(first_server_type),
                    second_template = this.get_template_by_server_type(second_server_type);

                data = {
                    'server_type': first_server_type + '|' + second_server_type,
                    'is_static': first_template.is_static && second_template.is_static,
                    'type': 'double_chart',
                    'ct': $('.select-avl-object :selected', context).parent().data('avl-type') || 'avl_unit',
                    'gid': (parseInt($('.select-avl-object', context).val(), 10) || null)
                };

                if ((data.ct === 'avl_unit' && data.gid === null) || data.ct === 'avl_unit_group') {
                    if (!$('.av-total-filter', this.$el).hasClass('disable')) {
                        data_for_filters.is_total = $('.av-is-total.active', context).hasClass('av-total-filter');
                        data_for_filters.is_pass_zeroth = $('.av-total-checkbox-is-pass-zeroth', context).is(':checked');
                    }
                    if (!_.isEmpty(data_for_filters)) {
                        _.extend(data, { 'filters': { 'av_total': data_for_filters } });
                    }
                }
            }

            return data;
        },

        validate: function () {
            var graph_type = $('.dashboard-nav-tabs.active', this.$el).data('graph-type'),
                is_not_error = true;

            if (graph_type === 'simple-graph') {
                var context = $('#simple-graph-tabs', this.$el);
                var filter_count = $('.max-min-filter-count', context).val();

                if (!_.isNaN(parseInt(filter_count, 10)) && _.isFinite(filter_count) && filter_count > 0) {
                    $('.max-min-filter-count', context).removeClass('error');
                } else {
                    $('.max-min-filter-count', context).addClass('error');
                    is_not_error = false;
                }
            }
            return is_not_error;
        }
    });

    var AddWidgetBtnView = Backbone.View.extend({
        className: 'right',
        template: '<div class="add-widget-btn"></div>',

        events: {
            'click .add-widget-btn': 'click'
        },

        initialize: function (options) {
            Backbone.View.prototype.initialize.apply(this, [options]);
            this.modal = null;
        },

        click: function (evt) {
            if ($('.add-widget-btn', this.$el).hasClass('disable')) return;
            APP.globals.addWidgetBtnView.disable(true);

            if (APP.globals.widget_data === undefined) {
                $.ajax({
                    url: dashboardUtil.getServer() + 'settings?' + 'lang=' + dashboardUtil.getLang(),
                    dataType: 'json',
                    type: 'POST',
                    success: dashboardUtil.bind(function (evt, data, textStatus, jqXHR) {
                        if (textStatus === 'success') {
                            APP.globals.widget_data = data;
                            this.show_modal();
                        } else {
                            APP.globals.addWidgetBtnView.disable(false);
                        }
                    }, this, evt)
                });
            } else {
                this.show_modal();
            }
        },

        show_modal: function () {
            require(['backbone.bootstrap-modal'], dashboardUtil.bind(function () {
                var add_widget_view = new AddWidgetView(APP.globals.widget_data);
                this.modal = new Backbone.BootstrapModal({
                    content: add_widget_view,
                    animate: true,
                    okCloses: false
                }).open(dashboardUtil.bind(function (add_widget_view) {
                    if (add_widget_view.validate()) {
                        var widget_data = add_widget_view.get_data();
                        this.save(widget_data);
                        this.modal && this.modal.close();
                    }
                }, this, add_widget_view));
                APP.globals.addWidgetBtnView.disable(false);
            }, this));
        },

        save: function (widget_data) {
            $('#header-gug').addClass('gug-progress');

            var data = {
                widget: JSON.stringify(widget_data),
            };

            var token = wialon.core.Session.getInstance().getToken();
            if (token && token.th) {
                // use token
                _.extend(data, {'token': token.th});
                this.saveImpl(data);
            } else {
                // use authHash
                wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function (code, dataAuth) {
                    if (code === 0) {
                        _.extend(data, {'hash': dataAuth.authHash});
                        this.saveImpl(data);
                    }
                }, this));
            }
        },

        saveImpl: function (data) {
            _.extend(data, {
                url: dashboardUtil.getBaseUrl(),
                lang: dashboardUtil.getLang()
            });

            $.ajax({
                url: dashboardUtil.getServer() + 'widget/add',
                type: 'POST',
                data: data,
                dataType: 'json',
                success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                    if (textStatus === 'success' && data.status === 'OK') {
                        this.trigger('new-widget', data.data.widget);
                    }
                    $('#header-gug').removeClass('gug-progress');
                }, this)
            });
        },

        render: function () {
            Backbone.View.prototype.initialize.apply(this);
            this.$el.html(this.template);
            return this;
        },

        disable: function (is_disable) {
            (is_disable ? $('.add-widget-btn', this.$el).addClass('disable') : $('.add-widget-btn', this.$el).removeClass('disable'));
        }
    });

    var AddUnitsTableBtnView = Backbone.View.extend({
        className: 'left',
        template: '<div class="add-units-btn"></div>',

        events: {
            'click .add-units-btn': 'add_remove_units_table'
        },

        initialize: function (options) {
            Backbone.View.prototype.initialize.apply(this, [options]);
        },

        'add_remove_units_table': function (evt) {
            if ($('.add-units-btn', this.$el).hasClass('disable')) return;
            this.disable(true);
            this.trigger('click-add');
        },

        render: function () {
            Backbone.View.prototype.initialize.apply(this);
            this.$el.html(this.template);
            return this;
        },

        disable: function (is_disable) {
            (is_disable ? $('.add-units-btn', this.$el).addClass('disable') : $('.add-units-btn', this.$el).removeClass('disable'));
        }
    });

    var select_time = null, main_view = null;
    main_view = new MainView();
    $('#header-gug').addClass('gug-progress');

    var href_lang = dashboardUtil.getParameterByName('lang','en');
    if (availableLanguages && !_.contains(availableLanguages, href_lang.toLowerCase())) href_lang = 'en';
    if(documentationLink){
      $('#a-help').attr('href', documentationLink);
      $('#help-wrapper').css('display','');
    }

    var Settings = (function(){
        var _models,
            _session,
            _user,
            name_setting = 'order_wid',
            __order = {},
            _order = {
                right: [],
                left: []
            };


        var _cookie = (function(){
            return {
                set: function(name, value, days){
                    var expires;
                    if (days) {
                        var date = new Date();
                        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                        expires = "; expires=" + date.toGMTString();
                    }
                    else {
                        expires = "";
                    }
                    document.cookie = name + "=" + value + expires + "; path=/";
                },
                get: function(name){
                    if (document.cookie.length > 0) {
                        var c_start = document.cookie.indexOf(name + "=");
                        if (c_start !== -1) {
                            c_start = c_start + name.length + 1;
                            var c_end = document.cookie.indexOf(";", c_start);
                            if (c_end === -1) {
                                c_end = document.cookie.length;
                            }
                            /* global unescape */
                            return unescape(document.cookie.substring(c_start, c_end));
                        }
                    }
                    return "";
                },
                remove: function(name){
                    this.set(name, '', -1);
                }
            };
        }());

        var _request= function(method, mode, options, params){
            var defaults = {
                success: function(){},
                error: function(){}
            };

            options = $.extend({}, defaults, options);
            $.extend(params, {
                url: dashboardUtil.getBaseUrl(),
                lang: dashboardUtil.getLang()
            });

            $.ajax({
                url: dashboardUtil.getServer() + (method || 'widget') + '/'+ (mode || 'order'),
                type: "POST",
                data: params,
                dataType: 'json',
                success: options.success
            });
        };

        var _store = (function(){
            return {
                get: function(){
                    return __order;
                },
                set: function(name, value, days){
                },
                check: function(name, callback, data){
                    var val = _cookie.get(name);
                    if( ! val && ! data)
                        return;
                    var order;
                    if( ! data)
                        order = JSON.parse(val);
                    else
                        order = data;

                    var order_left = order.left.length;
                    var order_right = order.right.length;
                    var main = [], other = [];
                    if(order_left > order_right){
                        main = order_left;
                        other = order_right;
                    }
                    else{
                        main = order_right;
                        other = order_left;
                    }

                    var poss = {},
                        left_id,
                        right_id;

                    var c = 0;
                    for(var i=0; i< main; i++){
                        left_id = order.left[i];
                        right_id = order.right[i];

                        if(left_id){
                            poss[left_id] = c;
                        }
                        c++;
                        if(right_id){
                            poss[right_id] = c;
                        }
                        c++;
                    }

                    var token = wialon.core.Session.getInstance().getToken();
                    if (token && token.th) {
                        // use token
                        var params = {
                            token: token.th,
                            order: JSON.stringify(poss)
                        };

                        _request(null, 'order', {
                            success: function (data, textStatus, jqXHR) {
                                if (textStatus === 'success' && data.code === 0) {
                                    __order = data.orders;
                                }
                                _cookie.remove(name_setting);
                                if(callback && typeof callback === 'function') callback();
                            }
                        }, params);
                    } else {
                        // use authHash
                        wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function (code, dataAuth) {
                            if (code !== 0) return;

                            // request params with auth info
                            var params = {
                                hash: dataAuth.authHash,
                                order: JSON.stringify(poss)
                            };

                            _request(null, 'order', {
                                success: function (data, textStatus, jqXHR) {
                                    if (textStatus === 'success' && data.code === 0) {
                                        __order = data.orders;
                                    }
                                    _cookie.remove(name_setting);
                                    if(callback && typeof callback === 'function') callback();
                                }
                            }, params);
                        }, this));
                    }
                },
                remove: function(name){
                    this.set(name, '', -1);
                },
                buildOrder: function(){
                    _order.left = [];
                    _order.right = [];
                    if(_.keys(__order).length){
                        var tmp = [];
                        _.forEach(__order, function(order, id){
                            tmp.push({id: id, order: order});
                        });
                        var sort = _.sortBy(tmp, 'order');
                        _.map(sort, function(data, index){
                            if( !data.order || data.order % 2 === 0)
                                _order.left.push(data.id);
                            else
                                _order.right.push(data.id);
                        });
                    }
                }
            };
        }());

        var _getOrder = function($el, pos){
            var tmp_order = [];
            if(pos && _order[pos]){
                _order[pos] = [];
                $el.children().each(function(i, el) {
                    var cid = $(el).attr('id').split('-').pop();
                    var model = _models.get(cid);
                    if(model){
                        var id = model.get('id');
                        if(id)
                            _order[pos].push(model.get('id').toString());
                    }
                });
            }

            return tmp_order;
        };

        return {
            init: function(authHash){
                _session = wialon.core.Session.getInstance();
                _user = _session.getCurrUser();
                return this;
            },
            loadOrder: function(callback){
                var val = this.cookie.get(name_setting);
                if( ! val){
                    callback();
                    return;
                }
                this.store.check(name_setting, function(){
                    this.buildOrder();
                    callback();
                });
            },
            checkPos: function(id, widget){
                var left = (_order.left.length && _order.left.indexOf(id.toString()) !== -1) ? true : false;
                var right = (_order.right.length && _order.right.indexOf(id.toString()) !== -1) ? true : false;

                return (left || right) ? true : false;
            },
            _render: function(pos, order, widgets, addWidget){
                for(var i=0; i < order.length; i++){
                    addWidget(order[i], widgets, {pos: pos});
                    delete widgets[order[i]];
                }
            },
            renderByOrder: function(widgets, addWidgetFunct){
                var order = this.getOrder();
                if(order.left.length){
                    this._render('left', order.left, widgets, addWidgetFunct);
                }

                if(order.right.length){
                    this._render('right', order.right, widgets, addWidgetFunct);
                }
            },
            setWidgetsModels: function(obj){
                _models = obj;
            },
            getOrder: function(){
                return _order;
            },
            orderWidgets: function($el, saveToStore){
                var position = $el.attr('id').split('-').shift();
                if(position && _order[position]){
                    _getOrder($el, position);
                    var revert_pos = (position === 'right') ? 'left' : 'right';
                    var $revert_el = $('#' + revert_pos+'-container');
                    if($revert_el.length && _order[revert_pos]){
                        _getOrder($revert_el, revert_pos);
                    }

                    if(saveToStore){
                        this.store.check(name_setting, null, this.getOrder());
                    }
                }
            },
            cookie: _cookie,
            store: _store
        };
    }());

    main_view.on('auth-success', function () {
        var
            $left_container = $('#left-container'),
            $right_container = $('#right-container');

        var sortable_options = {
            connectWith: ".column",
            handle: '.panel-heading',
            forcePlaceholderSize: true,
            cursor: "move",
            cancel: ".unsort, .tab-content",
            placeholder: "ui-state-highlight",
            stop: function( event, ui ) {
                Settings.orderWidgets($(this), true);
                var
                    height = {
                        left_container: parseInt( $left_container.height('auto').height(), 10),
                        right_container: parseInt( $right_container.height('auto').height(), 10)
                    };
                /* jshint eqeqeq: false */
                if (height.left_container != height.right_container) {
                    if (height.left_container > height.right_container) {
                        $right_container.height( height.left_container );
                    }
                    else {
                        $left_container.height( height.right_container );
                    }
                }
                return true;
            }
        };
        $left_container.sortable(sortable_options);
        $right_container.sortable(sortable_options);

        $left_container.disableSelection();
        $right_container.disableSelection();

        if (select_time === null) {
            var server_time = wialon.core.Session.getInstance().getServerTime();
            select_time = new selectTime.SelectTime({
                'yesterday': dashboardUtil.tr('Yesterday'),
                'today': dashboardUtil.tr('Today'),
                'week': dashboardUtil.tr('Week'),
                'month': dashboardUtil.tr('Month'),
                'custom': dashboardUtil.tr('Custom'),
                'server_time': server_time,
                'tz': wialon.util.DateTime.getTimezoneOffset(),
                'dst': wialon.util.DateTime.getDSTOffset(server_time),
                'monday': (APP.globals.userLocale ? APP.globals.userLocale.wd : 1),
                'format': (APP.globals.userLocale ? (APP.globals.userLocale.fd ? APP.globals.userLocale.fd.split('_')[0] : '%E:%m:%Y') : '%E:%m:%Y'),
                'lang': dashboardUtil.getLang(),
                'period': 0
            });
            $("#select-time-panel").html(select_time.render().$el);
            select_time.initWialonInterval();

            APP.globals.selectTime = select_time;
        }

        var widget_models = new dashboardWidgets.ModelWidgets();
        Settings.setWidgetsModels(widget_models);

        var addUnitsTableBtn = new AddUnitsTableBtnView();
        $('#header-buttons-wrapper').append(addUnitsTableBtn.render().el);
        APP.globals.addUnitsTableInstance = addUnitsTableBtn;

        var add_btn = new AddWidgetBtnView();
        $('#header-buttons-wrapper').append(add_btn.render().el);
        APP.globals.addWidgetBtnView = add_btn;

        add_btn.on('new-widget', function (widget_data) {
            if (widget_data.server_type === 'units') APP.globals.addUnitsTableInstance.disable(true);
            widget_models.add(new dashboardWidgets.BaseWidget(widget_data));

            Settings.orderWidgets($('#left-container'), true);
        });

        APP.globals.addUnitsTableInstance.on('click-add', function () {
            APP.globals.addWidgetBtnView.save({
                'server_type': "units",
                'is_static': true,
                'type': "table",
                'ct': 'avl_unit'
            });
        });

        select_time.on('change-time', function () {
            widget_models.each(function(model, index) {
                model.refreshData(select_time.getInterval(true));
            });
        });

        APP.globals.addUnitsTableInstance.disable(true);
        APP.globals.addWidgetBtnView.disable(true);

        var is_touch = dashboardUtil.isTouch();
        if (is_touch) {
            $('#left-container').removeClass('col-sm-6').addClass('col-sm-12');
            $('#right-container').hide();
        }

        var add_listeners_on_widget_view = dashboardUtil.bind(function (widget_view) {
            widget_view.on('settings', function () {
                if ($('.icon.settings', this.$el).hasClass('disable')) return;
                $('.icon.settings', this.$el).addClass('disable');

                var show_modal = dashboardUtil.bind(function () {
                    require(['backbone.bootstrap-modal'], dashboardUtil.bind(function () {
                        var add_widget_view = new AddWidgetView(APP.globals.widget_data, this.model);
                        var modal = new Backbone.BootstrapModal({
                            content: add_widget_view,
                            animate: true,
                            okCloses: false
                        });

                        modal.open(dashboardUtil.bind(function (add_widget_view, modal) {
                            if (add_widget_view.validate()) {
                                var widget_data = add_widget_view.get_data();
                                var token = wialon.core.Session.getInstance().getToken();
                                if (token && token.th) {
                                    // use token
                                    editWidget.apply(this, [widget_data, {'token': token.th}]);
                                } else {
                                    // use authHash
                                    wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function (widget_data, code, dataAuth) {
                                        if (code === 0) {
                                            editWidget.apply(this, [widget_data, {'hash': dataAuth.authHash}]);
                                        }
                                    }, this, widget_data));
                                }
                                modal && modal.close();
                            }
                        }, this, add_widget_view, modal));

                        modal.on('shown', dashboardUtil.bind(function () {
                            $('.icon.settings', this.$el).removeClass('disable');
                        }, this));
                    }, this));
                }, this);

                if (APP.globals.widget_data === undefined) {
                    $.ajax({
                        url: dashboardUtil.getServer() + 'settings?' + 'lang=' + dashboardUtil.getLang(),
                        type: 'POST',
                        dataType: 'json',
                        success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                            if (textStatus === 'success') {
                                APP.globals.widget_data = data;
                                show_modal();
                            } else {
                                $('.icon.settings', this.$el).removeClass('disable');
                            }
                        }, this)
                    });
                } else {
                    show_modal();
                }
            });

            widget_view.on('remove', function () {
                if (this.model.get('server_type') === 'units') APP.globals.addUnitsTableInstance.disable(false);
                widget_models.remove(this.model, { 'silent': true });
                Settings.orderWidgets($('#left-container'), true);
            });

            widget_view.on('want_refresh', function () {
                this.model.refreshData(select_time.getInterval(true), true);
            });
        }, this);

        function addWidget(wid, data, pos){
            var var_wmodel = data[wid], model = null;
            model = new dashboardWidgets.BaseWidget(var_wmodel);
            if (model !== null) widget_models.add(model, pos || {});
        }

        function editWidget(widget_data, params) {
            $.extend(params, {
                url: dashboardUtil.getBaseUrl(),
                widget: JSON.stringify(widget_data),
                widget_id: this.model.id
            });

            $.ajax({
                url: dashboardUtil.getServer() + 'widget/edit',
                type: 'POST',
                data: params,
                dataType: 'json',
                success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                    if (textStatus === 'success' && data.status === 'OK') {
                        if (data.data.widget.type !== this.model.get('type')) {
                            var new_model = new dashboardWidgets.BaseWidget(data.data.widget);
                            widget_models.remove(this.model);

                            if (new_model !== null) {
                                widget_models.add(new_model, { 'silent': true });
                                var new_widget = null;
                                if (new_model.get('type') === 'plot') {
                                    new_widget = new dashboardWidgets.PlotWidgetView({ model: new_model });
                                } else if (new_model.get('type') === 'table') {
                                    new_widget = new dashboardWidgets.TableWidgetView({ model: new_model });
                                } else if (new_model.get('type') === 'double_chart') {
                                    new_widget = new dashboardWidgets.DoubleChartWidgetView({ model: new_model });
                                }

                                add_listeners_on_widget_view(new_widget);
                                $('#dashboard-panel-' + this.model.cid).replaceWith(new_widget.render().el);
                                new_model.refreshData(select_time.getInterval(true));
                            }

                            this.model.trigger('destroy', this.model);
                        } else {
                            this.model.reset().set(data.data.widget);
                            this.model.refreshData(select_time.getInterval(true));
                            $('.icon.settings', this.$el).removeClass('disable');
                        }

                        Settings.orderWidgets($('#left-container'), true);
                    }
                }, this)
            });
        }

        var successHandler = function(data){
            var widgets_data = data.widgets || data.data.widgets;
            widget_models.on('add', function (model, coll, opts) {
                var widget = null;
                if (model.get('type') === 'plot') {
                    widget = new dashboardWidgets.PlotWidgetView({ model: model });
                } else if (model.get('type') === 'table') {
                    widget = new dashboardWidgets.TableWidgetView({ model: model });
                } else if (model.get('type') === 'double_chart') {
                    widget = new dashboardWidgets.DoubleChartWidgetView({ model: model });
                }

                add_listeners_on_widget_view(widget);

                if (model.get('is_static')) {
                    $('#top-static-tables-container').append(widget.render().el);
                } else {
                    if (!dashboardUtil.isTouch()) {
                        if(opts.pos){
                            var $parent = null;
                            switch(opts.pos){
                                case "left":
                                    $parent = $('#left-container');
                                    break;
                                case "right":
                                    $parent = $('#right-container');
                                    break;
                            }
                            if($parent){
                                $parent.append(widget.render().el);
                                model.refreshData(select_time.getInterval(true));
                                return;
                            }
                        }
                        var left = $('#left-container').children().length;
                        var right = $('#right-container').children().length;
                        if (left === right || left < right) {
                            $('#left-container').append(widget.render().el);
                        } else if (left > right) {
                            $('#right-container').append(widget.render().el);
                        }
                    } else {
                        $('#left-container').append(widget.render().el);
                    }
                }
                model.refreshData(select_time.getInterval(true));
            });

            if( ! Settings.store.get().length){
                var store_order = Settings.store.get();
                _.forEach(widgets_data, function(widget){
                    if(widget.order !== undefined){
                        store_order[widget.id] = widget.order;
                    }
                });

                Settings.store.buildOrder();
            }

            var is_disable_units_btn = false, wid;
            var mywidgets_data = $.extend({}, widgets_data);
            for (wid in mywidgets_data) {
                if (!_.has(mywidgets_data, wid)) continue;
                if( ! mywidgets_data[wid].is_static && Settings.checkPos(mywidgets_data[wid].id, mywidgets_data[wid])){
                    Settings.renderByOrder(mywidgets_data, addWidget);
                    continue;
                }

                if(mywidgets_data[wid].server_type === 'units') is_disable_units_btn = true;
                addWidget(wid, mywidgets_data);
            }


            $('#header-gug').removeClass('gug-progress');
            APP.globals.addUnitsTableInstance.disable(is_disable_units_btn);
            APP.globals.addWidgetBtnView.disable(false);
            $('#select-time-panel').show();
        };

        var token = wialon.core.Session.getInstance().getToken();
        if (token && token.th) {
            // use token
            Settings.init().loadOrder(function(){
                $.ajax({
                    url: dashboardUtil.getServer() + 'widget/get',
                    type: "POST",
                    data: {
                        url: dashboardUtil.getBaseUrl(),
                        token: token.th,
                        lang: dashboardUtil.getLang()
                    },
                    dataType: 'json',
                    success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                        if (textStatus === 'success' && data.status === 'OK') {
                            successHandler.apply(this, [data]);
                        }
                    }, this)
                });
            });
        } else {
            // use authHash
            wialon.core.Session.getInstance().createAuthHash(dashboardUtil.bind(function (code, dataAuth) {
                if (code !== 0) return;
                Settings.init().loadOrder(function(){
                    $.ajax({
                        url: dashboardUtil.getServer() + 'widget/get',
                        type: "POST",
                        data: {
                            url: dashboardUtil.getBaseUrl(),
                            hash: dataAuth.authHash,
                            lang: dashboardUtil.getLang()
                        },
                        dataType: 'json',
                        success: dashboardUtil.bind(function (data, textStatus, jqXHR) {
                            if (textStatus === 'success' && data.status === 'OK') {
                                successHandler.apply(this, [data]);
                            }
                        }, this)
                    });
                });
            }, this));
        }

        // initialize map module
        map.init();

        this.on('invalid-session', function () {
            widget_models.each(function (model, index) { model.abort(); });
            $('#header-gug').removeClass('gug-progress');
        });
    });

    main_view.on('auth-fail', function () {
        $('#header-gug').removeClass('gug-progress');
    });
});
