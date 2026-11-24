(function(factory) {
	if (typeof define === 'function' && define.amd) {
		if( ! window.nv)
			throw "For this plugin need library 'nv.d3'!";
		// AMD. Register as an anonymous module depending on nv (library nv.d3).
		define([],factory);
	} else {
		// No AMD. Register plugin with global nv object.
		factory();
	}
}(function() {
	if( ! window.nv)
		throw "For this plugin need library 'nv.d3'!";
	var nvD3 = window.nv;

	//Original tooltip.show function. Kept for backward compatibility.
	// pos = [left,top]
	nvD3.tooltip.show = function(pos, content, gravity, dist, parentContainer, classes) {

			//Create new tooltip div if it doesn't exist on DOM.
			var   container = document.createElement('div');
			container.className = 'nvtooltip ' + (classes ? classes : 'xy-tooltip');

			var body = parentContainer;
			if ( !parentContainer || parentContainer.tagName.match(/g|svg/i)) {
					//If the parent element is an SVG element, place tooltip in the <body> element.
					body = document.getElementsByTagName('body')[0];
			}

			container.style.left = 0;
			container.style.top = 0;
			container.style.opacity = 0;
			// Content can also be dom element
			if (typeof content !== 'string')
					container.appendChild(content);
			else
					container.innerHTML = content;
			body.appendChild(container);

			//If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
			if (parentContainer) {
					pos[0] = pos[0] - parentContainer.scrollLeft;
					pos[1] = pos[1] - parentContainer.scrollTop;
			}

			if(window.navigator.userAgent.toLowerCase().indexOf('opera') !== -1 || window.navigator.userAgent.toLowerCase().indexOf('ie') !== -1){
				pos[1] -= 35;
			}

			nv.tooltip.calcTooltipPosition(pos, gravity, dist, container);
	};

	/* global nv,d3 */
	/* global showControls,showXAxis,rightAlignYAxis,yAxis,reduceXTicks,rotateLabels,staggerLabels,transitionDuration,showYAxis */

	nv.utils.copy = function copy(source, deep) {
		var o, prop, type;

		if (typeof source != 'object' || source === null) {
				// What do to with functions, throw an error?
				o = source;
				return o;
		}

		o = new source.constructor();

		for (prop in source) {

				if (source.hasOwnProperty(prop)) {
						type = typeof source[prop];

						if (deep && type == 'object' && source[prop] !== null) {
								o[prop] = copy(source[prop]);

						} else {
								o[prop] = source[prop];
						}
				}
		}
		return o;
	};

	nvD3.models.linePlusLineChart = function() {
		"use strict";
		//============================================================
		// Public Variables with Default Settings
		//------------------------------------------------------------

		var lines1 = nv.models.line(),
			lines2 = nv.models.line(),
			xAxis = nv.models.axis(),
			y1Axis = nv.models.axis(),
			y2Axis = nv.models.axis(),
			legend = nv.models.legend();

		var margin = {
				top: 30,
				right: 60,
				bottom: 50,
				left: 60
			},
			width = null,
			height = null,
			getX = function(d) {
				return d.x;
			},
			getY = function(d) {
				return d.y;
			},
			color = nv.utils.defaultColor(),
			showLegend = true,
			tooltips = true,
			tooltip = function(key, x, y, e, graph) {
				return '<h3>' + key + '</h3>' +
					'<p>' + y + ' at ' + x + '</p>';
			},
			x, y1, y2, state = {},
			defaultState = null,
			noData = "No Data Available.",
			dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState');

		lines1
			.clipEdge(false)
			.padData(true);
		lines2
			.clipEdge(false)
			.padData(true);

		xAxis
			.orient('bottom')
			.tickPadding(7)
			.highlightZero(false);

		y1Axis
			.orient('left');

		y2Axis
			.orient('right');

		//============================================================

		//============================================================
		// Private Variables
		//------------------------------------------------------------

		var showTooltip = function(e, offsetElement) {
			var left = e.pos[0] + (offsetElement.offsetLeft || 0),
				top = e.pos[1] + (offsetElement.offsetTop || 0),
				x = xAxis.tickFormat()(lines1.x()(e.point, e.pointIndex)),
				y = (e.series.left ? y1Axis : y2Axis).tickFormat()(lines1.y()(e.point, e.pointIndex)),
				content = tooltip(e.series.key, x, y, e, chart);

			nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
		};

		function chart(selection) {
			selection.each(function(data) {
				var container = d3.select(this),
					that = this;

				var availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
					availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;

				chart.update = function() {
					container.transition().call(chart);
				};

				//set state.disabled
				state.disabled = data.map(function(d) {
					return !!d.disabled;
				});

				if (!defaultState) {
					var key;
					defaultState = {};
					for (key in state) {
						if (state[key] instanceof Array)
							defaultState[key] = state[key].slice(0);
						else
							defaultState[key] = state[key];
					}
				}

				//------------------------------------------------------------
				// Display No Data message if there's nothing to show.

				if (!data || !data.length || !data.filter(function(d) {
						return d.values.length;
					}).length) {
					var noDataText = container.selectAll('.nv-noData').data([noData]);

					noDataText.enter().append('text')
						.attr('class', 'nvd3 nv-noData')
						.attr('dy', '-.7em')
						.style('text-anchor', 'middle');

					noDataText
						.attr('x', margin.left + availableWidth / 2)
						.attr('y', margin.top + availableHeight / 2)
						.text(function(d) {
							return d;
						});

					return chart;
				} else {
					container.selectAll('.nv-noData').remove();
				}

				var dataLines1 = data.filter(function(d) {
					return !d.disabled && d.left;
				});
				var dataLines2 = data.filter(function(d) {
					return !d.disabled && !d.left;
				}); // removed the !d.disabled clause here to fix Issue #240

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Scales

				x = dataLines1.filter(function(d) {
					return !d.disabled;
				}).length && dataLines1.filter(function(d) {
					return !d.disabled;
				})[0].values.length ? lines1.xScale() : lines2.xScale();
				y1 = lines1.yScale();
				y2 = lines2.yScale();

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup containers and skeleton of chart

				var wrap = d3.select(this).selectAll('g.nv-wrap.nv-linePlusLine').data([data]);
				var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusLine').append('g');
				var g = wrap.select('g');

				gEnter.append('g').attr('class', 'nv-x nv-axis');
				gEnter.append('g').attr('class', 'nv-y1 nv-axis');
				gEnter.append('g').attr('class', 'nv-y2 nv-axis');
				gEnter.append('g').attr('class', 'nv-lines1Wrap');
				gEnter.append('g').attr('class', 'nv-lines2Wrap');
				gEnter.append('g').attr('class', 'nv-legendWrap');

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Legend

				if (showLegend) {
					legend.width(availableWidth / 2);

					g.select('.nv-legendWrap')
						.datum(data.map(function(series) {
							series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
							series.key = series.originalKey;
							return series;
						}))
						.call(legend);
					/* jshint eqeqeq:false*/
					if (margin.top != legend.height()) {
						margin.top = legend.height();
						availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;
					}

					g.select('.nv-legendWrap')
						.attr('transform', 'translate(' + (availableWidth / 3) + ',' + (-margin.top) + ')');
				}

				//------------------------------------------------------------

				wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				//------------------------------------------------------------
				// Main Chart Component(s)

				lines1
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && !data[i].left;
					}));

				lines2
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && data[i].left;
					}));

				var lines2Wrap = g.select('.nv-lines2Wrap')
					.datum(dataLines2[0] && !dataLines2[0].disabled ? dataLines2 : [{
						values: []
					}]);

				var lines1Wrap = g.select('.nv-lines1Wrap')
					.datum(dataLines1[0] && !dataLines1[0].disabled ? dataLines1 : [{
						values: []
					}]);

				d3.transition(lines2Wrap).call(lines2);
				d3.transition(lines1Wrap).call(lines1);

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Axes

				xAxis
					.scale(x)
					.ticks(availableWidth / 100)
					.tickSize(-availableHeight, 0);

				g.select('.nv-x.nv-axis')
					.attr('transform', 'translate(0,' + y1.range()[0] + ')');
				d3.transition(g.select('.nv-x.nv-axis'))
					.call(xAxis);

				y1Axis
					.scale(y1)
					.ticks(availableHeight / 36)
					.tickSize(-availableWidth, 0);

				d3.transition(g.select('.nv-y1.nv-axis'))
					.style('opacity', dataLines1.length ? 1 : 0)
					.call(y1Axis);

				y2Axis
					.scale(y2)
					.ticks(availableHeight / 36)
					.tickSize(dataLines2.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

				g.select('.nv-y2.nv-axis')
					.style('opacity', dataLines2.length ? 1 : 0)
					.attr('transform', 'translate(' + availableWidth + ',0)');

				d3.transition(g.select('.nv-y2.nv-axis'))
					.call(y2Axis);

				//------------------------------------------------------------

				//============================================================
				// Event Handling/Dispatching (in chart's scope)
				//------------------------------------------------------------

				legend.dispatch.on('stateChange', function(newState) {
					state = newState;
					dispatch.stateChange(state);
					chart.update();
				});

				dispatch.on('tooltipShow', function(e) {
					if (tooltips) showTooltip(e, that.parentNode);
				});

				// Update chart from a state object passed to event handler
				dispatch.on('changeState', function(e) {
					if (typeof e.disabled !== 'undefined') {
						data.forEach(function(series, i) {
							series.disabled = e.disabled[i];
						});

						state.disabled = e.disabled;
					}

					chart.update();
				});

				//============================================================
			});

			return chart;
		}

		//------------------------------------------------------------

		//============================================================
		// Event Handling/Dispatching (out of chart's scope)
		//------------------------------------------------------------

		lines1.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		lines1.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		lines2.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		lines2.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		dispatch.on('tooltipHide', function() {
			if (tooltips) nv.tooltip.cleanup();
		});

		//============================================================

		//============================================================
		// Expose Public Variables
		//------------------------------------------------------------

		// expose chart's sub-components
		chart.dispatch = dispatch;
		chart.legend = legend;
		chart.lines1 = lines1;
		chart.lines2 = lines2;
		chart.xAxis = xAxis;
		chart.y1Axis = y1Axis;
		chart.y2Axis = y2Axis;

		d3.rebind(chart, lines1, 'defined', 'size', 'clipVoronoi', 'interpolate');

		chart.options = nv.utils.optionsFunc.bind(chart);

		chart.x = function(_) {
			if (!arguments.length) return getX;
			getX = _;
			lines1.x(_);
			lines2.x(_);
			return chart;
		};

		chart.y = function(_) {
			if (!arguments.length) return getY;
			getY = _;
			lines1.y(_);
			lines2.y(_);
			return chart;
		};

		/* jshint eqeqeq:false*/
		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
			margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.color = function(_) {
			if (!arguments.length) return color;
			color = nv.utils.getColor(_);
			legend.color(color);
			return chart;
		};

		chart.showLegend = function(_) {
			if (!arguments.length) return showLegend;
			showLegend = _;
			return chart;
		};

		chart.tooltips = function(_) {
			if (!arguments.length) return tooltips;
			tooltips = _;
			return chart;
		};

		chart.tooltipContent = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.state = function(_) {
			if (!arguments.length) return state;
			state = _;
			return chart;
		};

		chart.defaultState = function(_) {
			if (!arguments.length) return defaultState;
			defaultState = _;
			return chart;
		};

		chart.noData = function(_) {
			if (!arguments.length) return noData;
			noData = _;
			return chart;
		};

		//============================================================

		return chart;
	};

	nvD3.models.barPlusLineChart = function() {
		"use strict";
		//============================================================
		// Public Variables with Default Settings
		//------------------------------------------------------------

		var lines = nv.models.line(),
			bars = nv.models.historicalBar(),
			xAxis = nv.models.axis(),
			y1Axis = nv.models.axis(),
			y2Axis = nv.models.axis(),
			legend = nv.models.legend();

		var margin = {
				top: 30,
				right: 60,
				bottom: 50,
				left: 60
			},
			width = null,
			height = null,
			getX = function(d) {
				return d.x;
			},
			getY = function(d) {
				return d.y;
			},
			color = nv.utils.defaultColor(),
			showLegend = true,
			tooltips = true,
			tooltip = function(key, x, y, e, graph) {
				return '<h3>' + key + '</h3>' +
					'<p>' + y + ' at ' + x + '</p>';
			},
			x, y1, y2, state = {},
			defaultState = null,
			noData = "No Data Available.",
			dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState');

		bars
			.padData(true);
		lines
			.clipEdge(false)
			.padData(true);

		xAxis
			.orient('bottom')
			.tickPadding(7)
			.highlightZero(false);

		y1Axis
			.orient('left');
		y2Axis
			.orient('right');

		//============================================================

		//============================================================
		// Private Variables
		//------------------------------------------------------------

		var showTooltip = function(e, offsetElement) {
			var left = e.pos[0] + (offsetElement.offsetLeft || 0),
				top = e.pos[1] + (offsetElement.offsetTop || 0),
				x = xAxis.tickFormat()(lines.x()(e.point, e.pointIndex)),
				y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
				content = tooltip(e.series.key, x, y, e, chart);

			nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
		};

		//------------------------------------------------------------

		function chart(selection) {
			selection.each(function(data) {
				var container = d3.select(this),
					that = this;

				var availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
					availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;

				chart.update = function() {
					container.transition().call(chart);
				};

				state.disabled = data.map(function(d) {
					return !!d.disabled;
				});
				if (!defaultState) {
					var key;
					defaultState = {};
					for (key in state) {
						if (state[key] instanceof Array)
							defaultState[key] = state[key].slice(0);
						else
							defaultState[key] = state[key];
					}
				}

				//------------------------------------------------------------
				// Display No Data message if there's nothing to show.

				if (!data || !data.length || !data.filter(function(d) {
						return d.values.length;
					}).length) {
					var noDataText = container.selectAll('.nv-noData').data([noData]);

					noDataText.enter().append('text')
						.attr('class', 'nvd3 nv-noData')
						.attr('dy', '-.7em')
						.style('text-anchor', 'middle');

					noDataText
						.attr('x', margin.left + availableWidth / 2)
						.attr('y', margin.top + availableHeight / 2)
						.text(function(d) {
							return d;
						});

					return chart;
				} else {
					container.selectAll('.nv-noData').remove();
				}

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Scales

				var dataBars = data.filter(function(d) {
					return !d.disabled && d.bar;
				});
				var dataLines = data.filter(function(d) {
					return !d.disabled && !d.bar;
				}); // removed the !d.disabled clause here to fix Issue #240

				x = dataLines.filter(function(d) {
					return !d.disabled;
				}).length && dataLines.filter(function(d) {
					return !d.disabled;
				})[0].values.length ? lines.xScale() : bars.xScale();
				y1 = lines.yScale();
				y2 = bars.yScale();

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup containers and skeleton of chart

				var wrap = d3.select(this).selectAll('g.nv-wrap.nv-barPlusLine').data([data]);
				var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-barPlusLine').append('g');
				var g = wrap.select('g');

				gEnter.append('g').attr('class', 'nv-x nv-axis');
				gEnter.append('g').attr('class', 'nv-y1 nv-axis');
				gEnter.append('g').attr('class', 'nv-y2 nv-axis');
				gEnter.append('g').attr('class', 'nv-barsWrap');
				gEnter.append('g').attr('class', 'nv-linesWrap');
				gEnter.append('g').attr('class', 'nv-legendWrap');

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Legend

				if (showLegend) {
					legend.width(availableWidth / 2);

					g.select('.nv-legendWrap')
						.datum(data.map(function(series) {
							series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
							series.key = series.originalKey;
							return series;
						}))
						.call(legend);

					/* jshint eqeqeq:false*/
					if (margin.top != legend.height()) {
						margin.top = legend.height();
						availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;
					}

					g.select('.nv-legendWrap')
						.attr('transform', 'translate(' + (availableWidth / 3) + ',' + (-margin.top) + ')');
				}

				//------------------------------------------------------------

				wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				//------------------------------------------------------------
				// Main Chart Component(s)

				bars
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && data[i].bar;
					}));

				lines
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && !data[i].bar;
					}));

				var barsWrap = g.select('.nv-barsWrap')
					.datum(dataBars.length ? dataBars : [{
						values: []
					}]);

				var linesWrap = g.select('.nv-linesWrap')
					.datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{
						values: []
					}]);

				d3.transition(barsWrap).call(bars);
				d3.transition(linesWrap).call(lines);

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Axes

				xAxis
					.scale(x)
					.ticks(availableWidth / 100)
					.tickSize(-availableHeight, 0);

				g.select('.nv-x.nv-axis')
					.attr('transform', 'translate(0,' + y1.range()[0] + ')');
				d3.transition(g.select('.nv-x.nv-axis'))
					.call(xAxis);

				y1Axis
					.scale(y1)
					.ticks(availableHeight / 36)
					.tickSize(-availableWidth, 0);

				d3.transition(g.select('.nv-y1.nv-axis'))
					.style('opacity', dataLines.length ? 1 : 0)
					.call(y1Axis);

				y2Axis
					.scale(y2)
					.ticks(availableHeight / 36)
					.tickSize(dataBars.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

				g.select('.nv-y2.nv-axis')
					.style('opacity', dataBars.length ? 1 : 0)
					.attr('transform', 'translate(' + availableWidth + ',0)');

				d3.transition(g.select('.nv-y2.nv-axis'))
					.call(y2Axis);

				//------------------------------------------------------------

				//============================================================
				// Event Handling/Dispatching (in chart's scope)
				//------------------------------------------------------------

				legend.dispatch.on('stateChange', function(newState) {
					state = newState;
					dispatch.stateChange(state);
					chart.update();
				});

				dispatch.on('tooltipShow', function(e) {
					if (tooltips) showTooltip(e, that.parentNode);
				});

				// Update chart from a state object passed to event handler
				dispatch.on('changeState', function(e) {

					if (typeof e.disabled !== 'undefined') {
						data.forEach(function(series, i) {
							series.disabled = e.disabled[i];
						});

						state.disabled = e.disabled;
					}

					chart.update();
				});

				//============================================================

			});

			return chart;
		}

		//============================================================
		// Event Handling/Dispatching (out of chart's scope)
		//------------------------------------------------------------

		lines.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		lines.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		bars.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		bars.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		dispatch.on('tooltipHide', function() {
			if (tooltips) nv.tooltip.cleanup();
		});

		//============================================================

		//============================================================
		// Expose Public Variables
		//------------------------------------------------------------

		// expose chart's sub-components
		chart.dispatch = dispatch;
		chart.legend = legend;
		chart.lines = lines;
		chart.bars = bars;
		chart.xAxis = xAxis;
		chart.y1Axis = y1Axis;
		chart.y2Axis = y2Axis;

		d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
		chart.options = nv.utils.optionsFunc.bind(chart);

		chart.x = function(_) {
			if (!arguments.length) return getX;
			getX = _;
			lines.x(_);
			bars.x(_);
			return chart;
		};

		chart.y = function(_) {
			if (!arguments.length) return getY;
			getY = _;
			lines.y(_);
			bars.y(_);
			return chart;
		};

		/* jshint eqeqeq:false*/
		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
			margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.color = function(_) {
			if (!arguments.length) return color;
			color = nv.utils.getColor(_);
			legend.color(color);
			return chart;
		};

		chart.showLegend = function(_) {
			if (!arguments.length) return showLegend;
			showLegend = _;
			return chart;
		};

		chart.tooltips = function(_) {
			if (!arguments.length) return tooltips;
			tooltips = _;
			return chart;
		};

		chart.tooltipContent = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.state = function(_) {
			if (!arguments.length) return state;
			state = _;
			return chart;
		};

		chart.defaultState = function(_) {
			if (!arguments.length) return defaultState;
			defaultState = _;
			return chart;
		};

		chart.noData = function(_) {
			if (!arguments.length) return noData;
			noData = _;
			return chart;
		};

		//============================================================

		return chart;
	};

	nvD3.models.barPlusBarChart = function() {
		"use strict";
		//============================================================
		// Public Variables with Default Settings
		//------------------------------------------------------------
		var bars1 = nv.models.historicalBarWithOffset(),
			bars2 = nv.models.historicalBarWithOffset(),
			xAxis = nv.models.axis(),
			y1Axis = nv.models.axis(),
			y2Axis = nv.models.axis(),
			legend = nv.models.legend();

		var margin = {
				top: 30,
				right: 60,
				bottom: 50,
				left: 60
			},
			width = null,
			height = null,
			getX = function(d) {
				return d.x;
			},
			getY = function(d) {
				return d.y;
			},
			color = nv.utils.defaultColor(),
			showLegend = true,
			tooltips = true,
			tooltip = function(key, x, y, e, graph) {
				return '<h3>' + key + '</h3>' +
					'<p>' + y + ' at ' + x + '</p>';
			},
			x, y1, y2, state = {},
			defaultState = null,
			noData = "No Data Available.",
			dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState');

		bars1
			.padData(true)
			.widthScale(2)
			.offset(0);

		bars2
			.padData(true)
			.widthScale(2)
			.offset(1);

		xAxis
			.orient('bottom')
			.tickPadding(7)
			.highlightZero(true)
			.showMaxMin(false)
			.tickFormat(function(d) {
				return d;
			});

		y1Axis
			.orient('left');
		y2Axis
			.orient('right');

		//============================================================

		//============================================================
		// Private Variables
		//------------------------------------------------------------

		var showTooltip = function(e, offsetElement) {
			var left = e.pos[0] + (offsetElement.offsetLeft || 0),
				top = e.pos[1] + (offsetElement.offsetTop || 0),
				x = xAxis.tickFormat()(bars1.x()(e.point, e.pointIndex)),
				y = (e.series.left ? y1Axis : y2Axis).tickFormat()(bars1.y()(e.point, e.pointIndex)),
				content = tooltip(e.series.key, x, y, e, chart);

			nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
		};

		//============================================================

		function chart(selection) {
			selection.each(function(data) {
				var container = d3.select(this),
					that = this;

				var availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
					availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;

				chart.update = function() {
					container.transition().call(chart);
				};

				state.disabled = data.map(function(d) {
					return !!d.disabled;
				});

				if (!defaultState) {
					var key;
					defaultState = {};
					for (key in state) {
						if (state[key] instanceof Array)
							defaultState[key] = state[key].slice(0);
						else
							defaultState[key] = state[key];
					}
				}

				//------------------------------------------------------------
				// Display No Data message if there's nothing to show.

				if (!data || !data.length || !data.filter(function(d) {
						return d.values.length;
					}).length) {
					var noDataText = container.selectAll('.nv-noData').data([noData]);

					noDataText.enter().append('text')
						.attr('class', 'nvd3 nv-noData')
						.attr('dy', '-.7em')
						.style('text-anchor', 'middle');

					noDataText
						.attr('x', margin.left + availableWidth / 2)
						.attr('y', margin.top + availableHeight / 2)
						.text(function(d) {
							return d;
						});

					return chart;
				} else {
					container.selectAll('.nv-noData').remove();
				}

				//------------------------------------------------------------

				var dataBar1 = data.filter(function(d) {
					return !d.disabled && d.left;
				});
				var dataBar2 = data.filter(function(d) {
					return !d.disabled && !d.left;
				});

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Scales

				x = dataBar1.filter(function(d) {
					return !d.disabled;
				}).length && dataBar1.filter(function(d) {
					return !d.disabled;
				})[0].values.length ? bars1.xScale() : bars2.xScale();
				y1 = bars1.yScale();
				y2 = bars2.yScale();

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup containers and skeleton of chart

				var wrap = d3.select(this).selectAll('g.nv-wrap.nv-barPlusBar').data([data]);
				var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-barPlusBar').append('g');
				var g = wrap.select('g');

				gEnter.append('g').attr('class', 'nv-x nv-axis');
				gEnter.append('g').attr('class', 'nv-y1 nv-axis');
				gEnter.append('g').attr('class', 'nv-y2 nv-axis');
				gEnter.append('g').attr('class', 'nv-bar1Wrap');
				gEnter.append('g').attr('class', 'nv-bar2Wrap');
				gEnter.append('g').attr('class', 'nv-legendWrap');

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Legend

				if (showLegend) {
					legend.width(availableWidth / 2);

					g.select('.nv-legendWrap')
						.datum(data.map(function(series) {
							series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
							series.key = series.originalKey;
							return series;
						}))
						.call(legend);

					/* jshint eqeqeq:false*/
					if (margin.top != legend.height()) {
						margin.top = legend.height();
						availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom;
					}

					g.select('.nv-legendWrap')
						.attr('transform', 'translate(' + (availableWidth / 3) + ',' + (-margin.top) + ')');
				}

				//------------------------------------------------------------

				wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				//------------------------------------------------------------
				// Main Chart Component(s)

				//------------------------------------------------------------

				bars1
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && data[i].left;
					}));

				bars2
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d, i) {
						return d.color || color(d, i);
					}).filter(function(d, i) {
						return !data[i].disabled && !data[i].left;
					}));

				var bar2Wrap = g.select('.nv-bar2Wrap')
					.datum(dataBar2[0] && !dataBar2[0].disabled ? dataBar2 : [{
						values: []
					}]);

				var bar1Wrap = g.select('.nv-bar1Wrap')
					.datum(dataBar1[0] && !dataBar1[0].disabled ? dataBar1 : [{
						values: []
					}]);

				d3.transition(bar2Wrap).call(bars2);
				d3.transition(bar1Wrap).call(bars1);
				//------------------------------------------------------------
				// Setup Axes

				xAxis
					.scale(x)
					.ticks(availableWidth / 100)
					.tickSize(-availableHeight, 0);

				g.select('.nv-x.nv-axis')
					.attr('transform', 'translate(0,' + y1.range()[0] + ')');
				d3.transition(g.select('.nv-x.nv-axis'))
					.call(xAxis);

				y1Axis
					.scale(y1)
					.ticks(availableHeight / 36)
					.tickSize(-availableWidth, 0);

				d3.transition(g.select('.nv-y1.nv-axis'))
					.style('opacity', dataBar1.length ? 1 : 0)
					.call(y1Axis);

				y2Axis
					.scale(y2)
					.ticks(availableHeight / 36)
					.tickSize(dataBar1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

				g.select('.nv-y2.nv-axis')
					.style('opacity', dataBar2.length ? 1 : 0)
					.attr('transform', 'translate(' + availableWidth + ',0)');

				d3.transition(g.select('.nv-y2.nv-axis'))
					.call(y2Axis);

				//------------------------------------------------------------

				//============================================================
				// Event Handling/Dispatching (in chart's scope)
				//------------------------------------------------------------

				legend.dispatch.on('stateChange', function(newState) {
					state = newState;
					dispatch.stateChange(state);
					chart.update();
				});

				dispatch.on('tooltipShow', function(e) {
					if (tooltips) showTooltip(e, that.parentNode);
				});

				// Update chart from a state object passed to event handler
				dispatch.on('changeState', function(e) {
					if (typeof e.disabled !== 'undefined') {
						data.forEach(function(series, i) {
							series.disabled = e.disabled[i];
						});

						state.disabled = e.disabled;
					}

					chart.update();
				});

			});

			return chart;
		}

		//============================================================
		// Event Handling/Dispatching (out of chart's scope)
		//------------------------------------------------------------

		bars1.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		bars1.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		bars2.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		bars2.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		dispatch.on('tooltipHide', function() {
			if (tooltips) nv.tooltip.cleanup();
		});

		//============================================================

		//============================================================
		// Expose Public Variables
		//------------------------------------------------------------

		// expose chart's sub-components
		chart.dispatch = dispatch;
		chart.legend = legend;
		chart.bars1 = bars1;
		chart.bars2 = bars2;
		chart.xAxis = xAxis;
		chart.y1Axis = y1Axis;
		chart.y2Axis = y2Axis;

		d3.rebind(chart, bars1, 'defined', 'size', 'clipVoronoi', 'interpolate');

		chart.options = nv.utils.optionsFunc.bind(chart);

		chart.x = function(_) {
			if (!arguments.length) return getX;
			getX = _;
			bars1.x(_);
			bars2.x(_);
			return chart;
		};

		chart.y = function(_) {
			if (!arguments.length) return getY;
			getY = _;
			bars1.y(_);
			bars2.y(_);
			return chart;
		};

		/* jshint eqeqeq:false*/
		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
			margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.color = function(_) {
			if (!arguments.length) return color;
			color = nv.utils.getColor(_);
			legend.color(color);
			return chart;
		};

		chart.showControls = function(_) {
			if (!arguments.length) return showControls;
			showControls = _;
			return chart;
		};

		chart.showLegend = function(_) {
			if (!arguments.length) return showLegend;
			showLegend = _;
			return chart;
		};

		chart.showXAxis = function(_) {
			if (!arguments.length) return showXAxis;
			showXAxis = _;
			return chart;
		};

		chart.showYAxis = function(_) {
			if (!arguments.length) return showYAxis;
			showYAxis = _;
			return chart;
		};

		chart.rightAlignYAxis = function(_) {
			if (!arguments.length) return rightAlignYAxis;
			rightAlignYAxis = _;
			yAxis.orient((_) ? 'right' : 'left');
			return chart;
		};

		chart.reduceXTicks = function(_) {
			if (!arguments.length) return reduceXTicks;
			reduceXTicks = _;
			return chart;
		};

		chart.rotateLabels = function(_) {
			if (!arguments.length) return rotateLabels;
			rotateLabels = _;
			return chart;
		};

		chart.staggerLabels = function(_) {
			if (!arguments.length) return staggerLabels;
			staggerLabels = _;
			return chart;
		};

		chart.tooltip = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.tooltips = function(_) {
			if (!arguments.length) return tooltips;
			tooltips = _;
			return chart;
		};

		chart.tooltipContent = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.state = function(_) {
			if (!arguments.length) return state;
			state = _;
			return chart;
		};

		chart.defaultState = function(_) {
			if (!arguments.length) return defaultState;
			defaultState = _;
			return chart;
		};

		chart.noData = function(_) {
			if (!arguments.length) return noData;
			noData = _;
			return chart;
		};

		chart.transitionDuration = function(_) {
			if (!arguments.length) return transitionDuration;
			transitionDuration = _;
			return chart;
		};

		//============================================================

		return chart;
	};

	nvD3.models.overlapBarChart = function () {
		"use strict";
		//============================================================
		// Public Variables with Default Settings
		//------------------------------------------------------------

		var overlapbar = nv.models.overlapBar()
			, xAxis = nv.models.axis()
			, yAxis = nv.models.axis()
			, legend = nv.models.legend();

		var margin = {top: 30, right: 20, bottom: 50, left: 60}
			, width = null
			, height = null
			, color = nv.utils.defaultColor()
			, showLegend = true
			, showXAxis = true
			, showYAxis = true
			, rightAlignYAxis = false
			, reduceXTicks = true // if false a tick will show for every data point
			, tooltips = true
			, tooltip = function(key, x, y, e, graph) {
					return '<h3>' + key + '</h3>' +
								 '<p>' +  y + ' on ' + x + '</p>'
				}
			, state = {}
			, defaultState = null
			, x //can be accessed via chart.xScale()
			, y //can be accessed via chart.yScale()
			, noData = "No Data Available."
			, dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
			, transitionDuration = 100;

		xAxis
			.orient('bottom')
			.tickPadding(7)
			.highlightZero(true)
			.showMaxMin(false)
			.tickFormat(function(d) { return d });

		yAxis
			.orient((rightAlignYAxis) ? 'right' : 'left')
			.tickFormat(d3.format(',.1f'));

		//============================================================


		//============================================================
		// Private Variables
		//------------------------------------------------------------

		var showTooltip = function(e, offsetElement) {
			var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
					top = e.pos[1] + ( offsetElement.offsetTop || 0),
					x = xAxis.tickFormat()(overlapbar.x()(e.point, e.pointIndex)),
					y = yAxis.tickFormat()(overlapbar.y()(e.point, e.pointIndex)),
					content = tooltip(e.series.key, x, y, e, chart);

			nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
		};

		//============================================================

		function chart(selection) {
			selection.each(function (data) {
				var container = d3.select(this),
						that = this;

				var availableWidth = (width  || parseInt(container.style('width')) || 960)
															 - margin.left - margin.right,
						availableHeight = (height || parseInt(container.style('height')) || 400)
															 - margin.top - margin.bottom;

				chart.update = function() { container.transition().duration(transitionDuration).call(chart) };
				chart.container = this;

				//set state.disabled
				state.disabled = data.map(function(d) { return !!d.disabled });

				if (!defaultState) {
					var key;
					defaultState = {};
					for (key in state) {
						if (state[key] instanceof Array)
							defaultState[key] = state[key].slice(0);
						else
							defaultState[key] = state[key];
					}
				}

				//------------------------------------------------------------
				// Display noData message if there's nothing to show.

				if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
					var noDataText = container.selectAll('.nv-noData').data([noData]);

					noDataText.enter().append('text')
						.attr('class', 'nvd3 nv-noData')
						.attr('dy', '-.7em')
						.style('text-anchor', 'middle');

					noDataText
						.attr('x', margin.left + availableWidth / 2)
						.attr('y', margin.top + availableHeight / 2)
						.text(function(d) { return d });

					return chart;
				} else {
					container.selectAll('.nv-noData').remove();
				}

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Scales

				x = overlapbar.xScale();
				y = overlapbar.yScale();

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup containers and skeleton of chart

				var wrap = container.selectAll('g.nv-wrap.nv-overlapBarWithLegend').data([data]);
				var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-overlapBarWithLegend').append('g');
				var g = wrap.select('g');

				gEnter.append('g').attr('class', 'nv-x nv-axis');
				gEnter.append('g').attr('class', 'nv-y nv-axis');
				gEnter.append('g').attr('class', 'nv-barsWrap');
				gEnter.append('g').attr('class', 'nv-legendWrap');

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Legend
				if (showLegend) {
					legend.width(availableWidth);

					g.select('.nv-legendWrap')
							.datum(data)
							.call(legend);

					if (margin.top != legend.height()) {
						margin.top = legend.height();
						availableHeight = (height || parseInt(container.style('height')) || 400)
															 - margin.top - margin.bottom;
					}

					g.select('.nv-legendWrap')
							.attr('transform', 'translate(0,' + (-margin.top) +')');
				}

				//------------------------------------------------------------

				wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				if (rightAlignYAxis) {
						g.select(".nv-y.nv-axis")
								.attr("transform", "translate(" + availableWidth + ",0)");
				}

				//------------------------------------------------------------

				// Main Chart Component(s)

				overlapbar
					//.disabled(data.map(function(series) { return series.disabled }))
					.width(availableWidth)
					.height(availableHeight)
					.color(data.map(function(d,i) {
						return d.color || color(d, i);
					}).filter(function(d,i) { return !data[i].disabled }))


				var barsWrap = g.select('.nv-barsWrap')
					.datum(data.filter(function(d) { return !d.disabled }))

				barsWrap.transition().call(overlapbar);

				//------------------------------------------------------------

				//------------------------------------------------------------
				// Setup Axes

				if (showXAxis) {
					xAxis
						.scale(x)
						.ticks( availableWidth / 100 )
						.tickSize(-availableHeight, 0);

					g.select('.nv-x.nv-axis')
						.attr('transform', 'translate(0,' + y.range()[0] + ')');
					g.select('.nv-x.nv-axis').transition()
						.call(xAxis);

					var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

					xTicks
						.selectAll('line, text')
						.style('opacity', 1)


					if (reduceXTicks)
						xTicks
							.filter(function(d,i) {
								return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
							})
							.selectAll('text, line')
							.style('opacity', 0);

					g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
						.style('opacity', 1);
				}


				if (showYAxis) {
					yAxis
						.scale(y)
						.ticks( availableHeight / 36 )
						.tickSize( -availableWidth, 0);

					g.select('.nv-y.nv-axis').transition()
						.call(yAxis);
				}


				//------------------------------------------------------------

				//============================================================
				// Event Handling/Dispatching (in chart's scope)
				//------------------------------------------------------------

				legend.dispatch.on('stateChange', function(newState) {
					state = newState;
					dispatch.stateChange(state);
					chart.update();
				});

				dispatch.on('tooltipShow', function(e) {
					if (tooltips) showTooltip(e, that.parentNode)
				});

				// Update chart from a state object passed to event handler
				dispatch.on('changeState', function(e) {
					if (typeof e.disabled !== 'undefined') {
						data.forEach(function(series, i) {
							series.disabled = e.disabled[i];
						});

						state.disabled = e.disabled;
					}

					chart.update();
				});

				//============================================================
			});

			return chart;
		}

		//============================================================
		// Event Handling/Dispatching (out of chart's scope)
		//------------------------------------------------------------

		overlapbar.dispatch.on('elementMouseover.tooltip', function(e) {
			e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
			dispatch.tooltipShow(e);
		});

		overlapbar.dispatch.on('elementMouseout.tooltip', function(e) {
			dispatch.tooltipHide(e);
		});

		dispatch.on('tooltipHide', function() {
			if (tooltips) nv.tooltip.cleanup();
		});

		//============================================================
		// Expose Public Variables
		//------------------------------------------------------------

		// expose chart's sub-components
		chart.dispatch = dispatch;
		chart.overlapbar = overlapbar;
		chart.legend = legend;
		chart.xAxis = xAxis;
		chart.yAxis = yAxis;

		d3.rebind(chart, overlapbar, 'x', 'y', 'xDomain', 'yDomain', 'xRange', 'yRange', 'clipEdge', 'id', 'delay');

		chart.options = nv.utils.optionsFunc.bind(chart);

		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.color = function(_) {
			if (!arguments.length) return color;
			color = nv.utils.getColor(_);
			legend.color(color);
			return chart;
		};

		chart.showXAxis = function(_) {
			if (!arguments.length) return showXAxis;
			showXAxis = _;
			return chart;
		};

		chart.showYAxis = function(_) {
			if (!arguments.length) return showYAxis;
			showYAxis = _;
			return chart;
		};

		chart.rightAlignYAxis = function(_) {
			if(!arguments.length) return rightAlignYAxis;
			rightAlignYAxis = _;
			yAxis.orient( (_) ? 'right' : 'left');
			return chart;
		};

		chart.reduceXTicks= function(_) {
			if (!arguments.length) return reduceXTicks;
			reduceXTicks = _;
			return chart;
		};

		chart.tooltip = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.tooltips = function(_) {
			if (!arguments.length) return tooltips;
			tooltips = _;
			return chart;
		};

		chart.tooltipContent = function(_) {
			if (!arguments.length) return tooltip;
			tooltip = _;
			return chart;
		};

		chart.state = function(_) {
			if (!arguments.length) return state;
			state = _;
			return chart;
		};

		chart.defaultState = function(_) {
			if (!arguments.length) return defaultState;
			defaultState = _;
			return chart;
		};

		chart.noData = function(_) {
			if (!arguments.length) return noData;
			noData = _;
			return chart;
		};

		chart.transitionDuration = function(_) {
			if (!arguments.length) return transitionDuration;
			transitionDuration = _;
			return chart;
		};

		//============================================================

		return chart;
	};

	nvD3.models.overlapBar = function () {
		"use strict";

		//============================================================
		// Public Variables with Default Settings
		//------------------------------------------------------------

		var margin = {top: 0, right: 0, bottom: 0, left: 0}
			, width = 960
			, height = 500
			, x = d3.scale.ordinal()
			, y = d3.scale.linear()
			, id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
			, getX = function(d) { return d.x }
			, getY = function(d) { return d.y }
			, clipEdge = true
			, forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
			, color = nv.utils.defaultColor()
			, delay = 0
			, xDomain
			, yDomain
			, xRange
			, yRange
			, dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')

		//============================================================

		//============================================================
		// Private Variables
		//------------------------------------------------------------

		var x0, y0, data0 = null; //used to store previous scales

		//============================================================

		function chart(selection) {
			selection.each(function (_data) {
				if (data0 === null) data0 = nv.utils.copy(_data, true);

					var data = [];
					for (var i = 0; i < data0.length; i++) {
							var d0 = data0[i], is_exist = false;
							for (var j = 0; j < _data.length; j++) {
									if (_data[j].key === d0.key) {
											is_exist = true;
											break;
									}
							}
							if (is_exist) {
									data.push(nv.utils.copy(d0, true));
							}
					}

				var availableWidth = width - margin.left - margin.right,
						availableHeight = height - margin.top - margin.bottom,
						container = d3.select(this);

				//add series index to each data point for reference
				data.forEach(function(series, i) {
					series.values.forEach(function(point) {
						point.series = i;
					});
				});

					var _series_val = [];
					data.forEach(function(series, i) {
							_series_val.push(series.values);
					});
					if (_series_val.length > 0) {
							var col_count = _series_val[0].length;
							for (var j = 0; j < col_count; j++) {
									var col_values = [];
									for (var i = 0; i < data.length; i++) {
											col_values.push(_series_val[i][j]);
									}
									col_values = col_values.sort(function (a, b) { return b.ay - a.ay; });
									for (var k = 0; k < col_values.length - 1; k++) {
											col_values[k].y = col_values[k].ay - col_values[k + 1].ay;
									}
									if (col_values.length === 1) {
											col_values[0].y = col_values[0].ay;
									}
									col_values = col_values.reverse();
									for (var i = 0; i < data.length; i++) {
											_series_val[i][j] = col_values[i];
									}
							}
					}

				data = d3.layout.stack()
					.offset('zero')
					.values(function(d){ return d.values })
					.y(getY)
					(data);

					//------------------------------------------------------------
					// negative value stacking
					data[0].values.map(function(d,i) {
							var posBase = 0, negBase = 0;
							data.map(function(d) {
									var f = d.values[i]
									f.size = Math.abs(f.y);
									if (f.y<0)  {
											f.y1 = negBase;
											negBase = negBase - f.size;
									} else
									{
											f.y1 = f.size + posBase;
											posBase = posBase + f.size;
									}
							});
					});

					//------------------------------------------------------------
					// Setup Scales

					// remap and flatten the data for use in calculating the scales' domains
					var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
							data.map(function(d) {
									return d.values.map(function(d,i) {
											return { x: getX(d,i), y: getY(d,i), y0: d.y0, y1: d.y1, nm: d.nm }
									})
							})

					x.domain(xDomain || d3.merge(seriesData).map(function(d) { return d.x }))
							.rangeBands(xRange || [0, availableWidth], 0.1);

					y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d) { return (d.y > 0 ? d.y1 : d.y1 + d.y )}).concat(forceY)))
							.range(yRange || [availableHeight, 0]);

					// If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
					if (x.domain()[0] === x.domain()[1])
							x.domain()[0] ?
									x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
									: x.domain([-1,1]);

					if (y.domain()[0] === y.domain()[1])
							y.domain()[0] ?
									y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
									: y.domain([-1,1]);

				x0 = x0 || x;
				y0 = y0 || y;

					var wrap = container.selectAll('g.nv-wrap.nv-multibar').data([data]);
					var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multibar');
					var defsEnter = wrapEnter.append('defs');
					var gEnter = wrapEnter.append('g');
					var g = wrap.select('g')

					gEnter.append('g').attr('class', 'nv-groups');

					wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

					//------------------------------------------------------------

					defsEnter.append('clipPath')
							.attr('id', 'nv-edge-clip-' + id)
							.append('rect');
					wrap.select('#nv-edge-clip-' + id + ' rect')
							.attr('width', availableWidth)
							.attr('height', availableHeight);

					g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

					var groups = wrap.select('.nv-groups').selectAll('.nv-group')
							.data(function(d) { return d }, function(d, i) { return i });

					groups.enter().append('g')
							.style('stroke-opacity', 1e-6)
							.style('fill-opacity', 1e-6);

					groups.exit()
							.transition()
							.selectAll('rect.nv-bar')
							.delay(function(d,i) {
									return i * delay/ data[0].values.length;
							})
							.attr('y', function(d) { return y0(d.y0) })
							.attr('height', 0)
							.remove();

					groups
							.attr('class', function(d,i) { return 'nv-group nv-series-' + i })
							.classed('hover', function(d) { return d.hover })

					groups
							.transition()
							.style('stroke-opacity', 1)
							.style('fill-opacity', .75);

					var bars = groups.selectAll('rect.nv-bar')
							.data(function(d) { return d.values; });
					bars.exit().remove();

					var barsEnter = bars.enter().append('rect')
									.attr('class', function(d, i) { return getY(d, i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
									.attr('x', function(d, i, j) {
											return 0;
									})
									.attr('y', function(d) { return y0(d.y0) })
									.attr('height', 0)
									.attr('width', x.rangeBand())
									.attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })
							;
					bars
							.style('fill', function(d,i,j){ return color(d, d.series);  })
							.style('stroke', function(d,i,j){ return color(d, d.series); })
							.on('mouseover', function(d,i) {
									d3.select(this).classed('hover', true);
									dispatch.elementMouseover({
											value: getY(d,i),
											point: d,
											series: data[d.series],
											pos: [x(getX(d,i)) + (x.rangeBand() * (data.length / 2) / data.length), y(getY(d,i) + (d.y0))],
											pointIndex: i,
											seriesIndex: d.series,
											e: d3.event
									});
							})
							.on('mouseout', function(d,i) {
									d3.select(this).classed('hover', false);
									dispatch.elementMouseout({
											value: getY(d,i),
											point: d,
											series: data[d.series],
											pointIndex: i,
											seriesIndex: d.series,
											e: d3.event
									});
							})
							.on('click', function(d,i) {
									dispatch.elementClick({
											value: getY(d,i),
											point: d,
											series: data[d.series],
											pos: [x(getX(d,i)) + (x.rangeBand() * (data.length / 2) / data.length), y(getY(d,i) + (d.y0))],
											pointIndex: i,
											seriesIndex: d.series,
											e: d3.event
									});
									d3.event.stopPropagation();
							})
							.on('dblclick', function(d,i) {
									dispatch.elementDblClick({
											value: getY(d,i),
											point: d,
											series: data[d.series],
											pos: [x(getX(d,i)) + (x.rangeBand() * (data.length / 2) / data.length), y(getY(d,i) + (d.y0))],
											pointIndex: i,
											seriesIndex: d.series,
											e: d3.event
									});
									d3.event.stopPropagation();
							});
					bars
							.attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'})
							.transition()
							.attr('transform', function(d,i) { return 'translate(' + x(getX(d,i)) + ',0)'; })

					bars.transition()
							.delay(function(d,i) {
									return i * delay / data[0].values.length;
							})
							.attr('y', function(d,i) {
									return y(d.y1);
							})
							.attr('height', function(d,i) {
									return d.is_null ? 0 : (Math.max(Math.abs(y(d.y + d.y0) - y(d.y0)), 1));
							})
							.attr('x', function(d,i) {
									return 0;
							})
							.attr('width', x.rangeBand());

				x0 = x.copy();
				y0 = y.copy();
			});
		}

		chart.dispatch = dispatch;

		chart.options = nv.utils.optionsFunc.bind(chart);

		chart.x = function(_) {
			if (!arguments.length) return getX;
			getX = _;
			return chart;
		};

		chart.y = function(_) {
			if (!arguments.length) return getY;
			getY = _;
			return chart;
		};

		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.xScale = function(_) {
			if (!arguments.length) return x;
			x = _;
			return chart;
		};

		chart.yScale = function(_) {
			if (!arguments.length) return y;
			y = _;
			return chart;
		};

		chart.xDomain = function(_) {
			if (!arguments.length) return xDomain;
			xDomain = _;
			return chart;
		};

		chart.yDomain = function(_) {
			if (!arguments.length) return yDomain;
			yDomain = _;
			return chart;
		};

		chart.xRange = function(_) {
			if (!arguments.length) return xRange;
			xRange = _;
			return chart;
		};

		chart.yRange = function(_) {
			if (!arguments.length) return yRange;
			yRange = _;
			return chart;
		};

		chart.clipEdge = function(_) {
			if (!arguments.length) return clipEdge;
			clipEdge = _;
			return chart;
		};

		chart.color = function(_) {
			if (!arguments.length) return color;
			color = nv.utils.getColor(_);
			return chart;
		};

		chart.id = function(_) {
			if (!arguments.length) return id;
			id = _;
			return chart;
		};

		chart.delay = function(_) {
			if (!arguments.length) return delay;
			delay = _;
			return chart;
		};

		return chart;
	};

	nv.models.historicalBarWithOffset = function() {
	"use strict";
	//============================================================
	// Public Variables with Default Settings
	//------------------------------------------------------------

	var margin = {top: 0, right: 0, bottom: 0, left: 0}
	  , width = 960
	  , height = 500
	  , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
	  , x = d3.scale.linear()
	  , y = d3.scale.linear()
	  , getX = function(d) { return d.x }
	  , getY = function(d) { return d.y }
	  , forceX = []
	  , forceY = [0]
	  , padData = false
	  , clipEdge = true
	  , color = nv.utils.defaultColor()
	  , xDomain
	  , yDomain
	  , xRange
	  , yRange
	  , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
	  , interactive = true
	  , offset = 0
	  , widthScale = 1
	  ;

	//============================================================


	function chart(selection) {
	  selection.each(function(data) {
		var availableWidth = width - margin.left - margin.right,
			availableHeight = height - margin.top - margin.bottom,
			container = d3.select(this);


		//------------------------------------------------------------
		// Setup Scales

		x   .domain(xDomain || d3.extent(data[0].values.map(getX).concat(forceX) ))

		if (padData)
		  x.range(xRange || [availableWidth * .5 / data[0].values.length, availableWidth * (data[0].values.length - .5)  / data[0].values.length ]);
		else
		  x.range(xRange || [0, availableWidth]);

		y   .domain(yDomain || d3.extent(data[0].values.map(getY).concat(forceY) ))
			.range(yRange || [availableHeight, 0]);

		// If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point

		if (x.domain()[0] === x.domain()[1])
		  x.domain()[0] ?
			  x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
			: x.domain([-1,1]);

		if (y.domain()[0] === y.domain()[1])
		  y.domain()[0] ?
			  y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
			: y.domain([-1,1]);

		//------------------------------------------------------------


		//------------------------------------------------------------
		// Setup containers and skeleton of chart

		var wrap = container.selectAll('g.nv-wrap.nv-historicalBar-' + id).data([data[0].values]);
		var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-historicalBar-' + id);
		var defsEnter = wrapEnter.append('defs');
		var gEnter = wrapEnter.append('g');
		var g = wrap.select('g');

		gEnter.append('g').attr('class', 'nv-bars');

		wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		//------------------------------------------------------------


		container
			.on('click', function(d,i) {
			  dispatch.chartClick({
				  data: d,
				  index: i,
				  pos: d3.event,
				  id: id
			  });
			});


		defsEnter.append('clipPath')
			.attr('id', 'nv-chart-clip-path-' + id)
		  .append('rect');

		wrap.select('#nv-chart-clip-path-' + id + ' rect')
			.attr('width', availableWidth)
			.attr('height', availableHeight);

		g   .attr('clip-path', clipEdge ? 'url(#nv-chart-clip-path-' + id + ')' : '');



		var bars = wrap.select('.nv-bars').selectAll('.nv-bar')
			.data(function(d) { return d }, function(d,i) {return getX(d,i)});

		bars.exit().remove();


		var single_bar_width = (availableWidth / data[0].values.length) / widthScale * .9;
		var barsEnter = bars.enter().append('rect')
			.attr('x', 0 )
			.attr('y', function(d,i) {  return nv.utils.NaNtoZero(y(Math.max(0, getY(d,i)))) })
			.attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.abs(y(getY(d,i)) - y(0))) })
			.attr('transform', function(d,i) {
				var transform_x = x(getX(d,i)) - availableWidth / data[0].values.length * .45;
				transform_x = transform_x + (single_bar_width * offset) + 1 * offset;
				return 'translate(' + transform_x + ',0)';
			})
			.on('mouseover', function(d,i) {
			  if (!interactive) return;
			  d3.select(this).classed('hover', true);
			  dispatch.elementMouseover({
				  point: d,
				  series: data[0],
				  pos: [x(getX(d,i)), y(getY(d,i))],
				  pointIndex: i,
				  seriesIndex: 0,
				  e: d3.event
			  });

			})
			.on('mouseout', function(d,i) {
				  if (!interactive) return;
				  d3.select(this).classed('hover', false);
				  dispatch.elementMouseout({
					  point: d,
					  series: data[0],
					  pointIndex: i,
					  seriesIndex: 0,
					  e: d3.event
				  });
			})
			.on('click', function(d,i) {
				  if (!interactive) return;
				  dispatch.elementClick({
					  //label: d[label],
					  value: getY(d,i),
					  data: d,
					  index: i,
					  pos: [x(getX(d,i)), y(getY(d,i))],
					  e: d3.event,
					  id: id
				  });
				d3.event.stopPropagation();
			})
			.on('dblclick', function(d,i) {
				if (!interactive) return;
				dispatch.elementDblClick({
					//label: d[label],
					value: getY(d,i),
					data: d,
					index: i,
					pos: [x(getX(d,i)), y(getY(d,i))],
					e: d3.event,
					id: id
				});
				d3.event.stopPropagation();
			});

		bars
			.attr('fill', function(d,i) { return color(d, i); })
			.attr('class', function(d,i,j) { return (getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i + '-' + id })
			//.transition()
			.attr('transform', function(d,i) {
				var transform_x = x(getX(d,i)) - availableWidth / data[0].values.length * .45;
				transform_x = transform_x + (single_bar_width * offset) + 1 * offset;

				return 'translate(' + transform_x + ',0)';
			})
			.attr('width', single_bar_width);

		bars.transition()
			.attr('y', function(d,i) {
			  var rval = getY(d,i) < 0 ?
					  y(0) :
					  y(0) - y(getY(d,i)) < 1 ?
						y(0) - 1 :
						y(getY(d,i));
			  return nv.utils.NaNtoZero(rval);
			})
			.attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.max(Math.abs(y(getY(d,i)) - y(0)),1)) });

	  });

	  return chart;
	}

	//Create methods to allow outside functions to highlight a specific bar.
	chart.highlightPoint = function(pointIndex, isHoverOver) {
		d3.select(".nv-historicalBar-" + id)
		  .select(".nv-bars .nv-bar-0-" + pointIndex)
				.classed("hover", isHoverOver)
				 ;
	};

	chart.clearHighlights = function() {
		d3.select(".nv-historicalBar-" + id)
		  .select(".nv-bars .nv-bar.hover")
				.classed("hover", false)
				 ;
	};
	//============================================================
	// Expose Public Variables
	//------------------------------------------------------------

	chart.dispatch = dispatch;

	chart.options = nv.utils.optionsFunc.bind(chart);

	chart.x = function(_) {
	  if (!arguments.length) return getX;
	  getX = _;
	  return chart;
	};

	chart.y = function(_) {
	  if (!arguments.length) return getY;
	  getY = _;
	  return chart;
	};

	chart.margin = function(_) {
	  if (!arguments.length) return margin;
	  margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
	  margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
	  margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
	  margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
	  return chart;
	};

	chart.offset = function (_) {
		if (!arguments.length) return offset;
		offset = _;
		return chart;
	};

	chart.widthScale = function (_) {
		if (!arguments.length) return widthScale;
		widthScale = _;
		return chart;
	}

	chart.width = function(_) {
	  if (!arguments.length) return width;
	  width = _;
	  return chart;
	};

	chart.height = function(_) {
	  if (!arguments.length) return height;
	  height = _;
	  return chart;
	};

	chart.xScale = function(_) {
	  if (!arguments.length) return x;
	  x = _;
	  return chart;
	};

	chart.yScale = function(_) {
	  if (!arguments.length) return y;
	  y = _;
	  return chart;
	};

	chart.xDomain = function(_) {
	  if (!arguments.length) return xDomain;
	  xDomain = _;
	  return chart;
	};

	chart.yDomain = function(_) {
	  if (!arguments.length) return yDomain;
	  yDomain = _;
	  return chart;
	};

	chart.xRange = function(_) {
	  if (!arguments.length) return xRange;
	  xRange = _;
	  return chart;
	};

	chart.yRange = function(_) {
	  if (!arguments.length) return yRange;
	  yRange = _;
	  return chart;
	};

	chart.forceX = function(_) {
	  if (!arguments.length) return forceX;
	  forceX = _;
	  return chart;
	};

	chart.forceY = function(_) {
	  if (!arguments.length) return forceY;
	  forceY = _;
	  return chart;
	};

	chart.padData = function(_) {
	  if (!arguments.length) return padData;
	  padData = _;
	  return chart;
	};

	chart.clipEdge = function(_) {
	  if (!arguments.length) return clipEdge;
	  clipEdge = _;
	  return chart;
	};

	chart.color = function(_) {
	  if (!arguments.length) return color;
	  color = nv.utils.getColor(_);
	  return chart;
	};

	chart.id = function(_) {
	  if (!arguments.length) return id;
	  id = _;
	  return chart;
	};

	chart.interactive = function(_) {
	  if(!arguments.length) return interactive;
	  interactive = false;
	  return chart;
	};

	//============================================================


	return chart;
  }


	return nvD3;
}));