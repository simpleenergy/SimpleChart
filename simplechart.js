;(function(module, Raphael, undefined) {
  /*jshint eqnull:true */
  var fmt = Raphael.format;
  var SimpleChart = {};

  // You can use these to place your own layers
  SimpleChart.zIndex = {};
  SimpleChart.zIndex.height = 10; // the "safe" distance between two layers
  SimpleChart.zIndex.bottom = 0;  // anything below this is guaranteed to be below the graph

  SimpleChart.zIndex.border = 10;
  SimpleChart.zIndex.fills = 20;
  SimpleChart.zIndex.axisLines = 30;
  SimpleChart.zIndex.boxes = 40;
  SimpleChart.zIndex.paths = 50;
  SimpleChart.zIndex.segments = 60;
  SimpleChart.zIndex.dots = 70;
  SimpleChart.zIndex.labels = 80;
  SimpleChart.zIndex.decorations = 90;
  SimpleChart.zIndex.top = 100;  // anything above this is guaranteed to be above the graph

  var Point = function Point(x, y) {
    if ( x.length )
    {
      y = x[1];
      x = x[0];
    }
    this.x = x;
    this.y = y;
  };

  var Size = function Point(w, h) {
    if ( w.length )
    {
      h = w[1];
      w = w[0];
    }
    this.width = w;
    this.height = h;
  };

  var Rect = function Rect(x, y, w, h) {
    if ( x.length )
    {
      y = x[1];
      w = x[2];
      h = x[3];
      x = x[0];
    }
    var min_x = Math.min(x, x + w);
    var min_y = Math.min(y, y + h);
    var width = Math.abs(w);
    var height = Math.abs(h);

    this.x = min_x;
    this.x2 = min_x + width;
    this.y = min_y;
    this.y2 = min_y + height;
    this.width = width;
    this.height = height;
  };

  // `nodes` is a collection of Elements and Sets. This method applies a
  // function only to the elements.
  var raphaelSetApply = function(elements, fn, ret) {
    if ( ! ret )
      ret = [];

    if ( elements.length != null ) {
      elements.forEach(function(element) {
        raphaelSetApply(element, fn, ret);
      });
    }
    else {
      ret.push(fn(elements));
    }
    return ret;
  };

  // either applies the arguments or returns the value
  var superApply = function superApply(context, value, args) {
    if ( ! args )
      args = [];

    if ( typeof value == 'function' )
      value = value.apply(context, args);
    return value;
  };

  // returns ticks evenly spaced between min and max.  if n == 1, the tick is in
  // the middle, otherwise there is a tick at min and max and evenly spaced
  // between the two.
  function nTicksEvery(n, _min, _max) {
    if ( ! n || _min == _max )
      return [];
    var min = Math.min(_min, _max),
        max = Math.max(_min, _max),
        delta = max - min;
    if ( n == 1 )
      return [min + delta / 2];
    var retval = [min];
    for ( var i = 1; i < n - 1; i++ ) {
      retval.push(min + delta * i / (n - 1));
    }
    retval.push(max);
    return retval;
  }

  function plot_scale(range, ticks) {
    var max = Math.pow(ticks, Math.ceil(Math.log(range)/Math.log(ticks)));
    if ( max > ticks ) {
      max = Math.ceil(range / max * ticks) * (max / ticks);
    }
    return max / ticks;
  }

  function generate_ticks(min, max, ticks) {
    var width = plot_scale(max - min, ticks);
    var ret = [];
    for ( var i = 0; i <= ticks; i++ ) {
      var tick = min + width * i;
      ret.push(tick);
    }
    return ret;
  }

  var num_x_ticks_default = function num_x_ticks_default() {
      if ( this.raphael.width > 500 ) {
        return 11;
      }
      else if ( this.raphael.width > 60 ) {
        return 6;
      }
      return 0;
    };
  var num_y_ticks_default =  function num_y_ticks_default() {
      if ( this.raphael.height > 400 ) {
        return 9;
      }
      else if ( this.raphael.height > 50 ) {
        return 5;
      }
      return 0;
    };

  var CartesianCanvas = function CartesianCanvas() {
    this.raphael = Raphael.apply({}, arguments);
    // space between lable and tick
    this.lbl_tick_space = 3;

    var options = {};

    this.options = options;
    this.sets = {}; // stores the sets (border, lines, annotations, paths, dots, decorations)

    // stores the list of LineChart/BarChart items
    this.charts = [];

    options.decorations = null;
    options.padding = [0, 0, 0, 0];
    options.margins = [0, 0, 0, 0];
    options.border = { 'stroke': 'black', 'stroke-width': 1 };

    options.x_range = function x_range() {
      var max_x = this.get_max_x();
      var min_x = this.get_min_x();
      return [min_x, max_x];
    };

    options.y_range = function y_range() {
      var max_y = this.get_max_y();
      var min_y = 0;
      return [min_y, max_y];
    };

    // x/y ticks - evenly spaced, depend on size of chart.
    // x_ticks: either 11 or 6
    // y_ticks: either 9 or 5
    options.x_ticks = function x_ticks() {
      var ticks = this.get_num_x_ticks();
      if ( ! ticks )
        return [];
      return nTicksEvery(ticks, this.get_min_graph_x(), this.get_max_graph_x());
    };
    options.x2_ticks = function x_ticks() {
      var ticks = this.get_num_x2_ticks();
      if ( ! ticks )
        return [];
      return nTicksEvery(ticks, this.get_min_graph_x(), this.get_max_graph_x());
    };

    options.num_x_ticks = num_x_ticks_default;
    options.num_x2_ticks = 0;

    options.y_ticks = function y_ticks() {
      var ticks = this.get_num_y_ticks();
      if ( ! ticks )
        return [];
      return nTicksEvery(ticks, this.get_min_y(), this.get_max_y());
    };
    options.y2_ticks = function y_ticks() {
      var ticks = this.get_num_y2_ticks();
      if ( ! ticks )
        return [];
      return nTicksEvery(ticks, this.get_min_y(), this.get_max_y());
    };

    options.num_y_ticks = num_y_ticks_default;
    options.num_y2_ticks = 0;

    function label_formatter(axis) { return function(value, index, element) {
      if ( value.prototype == Date )
        return (value.getMonth() + 1) + '/' + value.getDate() + '/' + value.getFullYear();
      return value.toString();
    }; }

    options.x_label = label_formatter('x');
    options.x_default_label = {'font-size': 20, 'text-anchor': 'end', 'transform': 'r-90,0,0'};
    options.x2_label = label_formatter('x2');
    options.x2_default_label = {'font-size': 20, 'text-anchor': 'start', 'transform': 'r-90,0,0'};
    options.y_label = label_formatter('y');
    options.y_default_label = {'font-size': 20, 'text-anchor': 'end'};
    options.y2_label = label_formatter('y2');
    options.y2_default_label = {'font-size': 20, 'text-anchor': 'start'};

    var transform = function(point, index, element) {
      // apply transform to the label to move it to the correct location
      element.attr({transform: fmt('t{0},{1}...', point[0], point[1])});
    };
    options.x_label_transform = transform;
    options.y_label_transform = transform;
    options.x2_label_transform = transform;
    options.y2_label_transform = transform;

    var default_tick_size = [-3, -0.5, 3, 1];
    var default_tick = function(tick, index, tick_element) {
      tick_element.attr({'fill': 'black', 'stroke': null});
      return default_tick_size;
    };
    options.x_tick = default_tick;
    options.x2_tick = default_tick;
    options.y_tick = default_tick;
    options.y2_tick = default_tick;

    options.x_lines = [];
    options.y_lines = [];

    options.x_line = { 'stroke': 'rgba(25%, 25%, 25%, 0.4)', 'stroke-width': 1, 'stroke-dasharray': '.'};
    options.y_line = { 'stroke': 'rgba(25%, 25%, 25%, 0.4)', 'stroke-width': 1, 'stroke-dasharray': '.'};

    options.annotate = null;
    options.decorations = null;
  };

  CartesianCanvas.prototype.add_chart = function add_graph(graph) {
    this.charts.push(graph);
  };

  CartesianCanvas.prototype.clear = function clear(chart) {
    this.charts = [];
  };

  CartesianCanvas.prototype.applyClip = function clear(element) {
    element.attr('clip-rect', fmt('{0} {1} {2} {3}', this.get_graph_left(), this.get_graph_top(), this.get_graph_width(), this.get_graph_height()));
  };

  CartesianCanvas.prototype.get_min_graph_x = function get_min_graph_x() {
    if (this._get_min_graph_x != null) {
      return this._get_min_graph_x;
    }

    // otherwise use graph values
    var min_x;
    for ( var graph_i = 0; graph_i < this.charts.length ; graph_i++ ) {
      var graph = this.charts[graph_i];
      if ( min_x == null || min_x > graph.get_min_x() ) {
        min_x = graph.get_min_x();
      }
    }

    if ( min_x == null ) {
      min_x = 0;
    }

    var margins = this.get_margins();
    var margin_left = margins[1];

    this._get_min_graph_x = min_x - margin_left;
    return min_x;
  };
  CartesianCanvas.prototype.get_min_x = function get_min_x() {
    // return minimum value from options.x_range if it is an array
    if (typeof this.options.x_range == 'object') {
      return this.options.x_range[0];
    }
    var margins = this.get_margins();
    var margin_left = margins[1];
    return this.get_min_graph_x() - margin_left;
  };
  CartesianCanvas.prototype.get_max_graph_x = function get_max_graph_x() {
    if (this._get_max_graph_x != null) {
      return this._get_max_graph_x;
    }

    // otherwise use graph values
    var max_x;
    for ( var graph_i = 0; graph_i < this.charts.length ; graph_i++ ) {
      var graph = this.charts[graph_i];
      if ( max_x == null || max_x < graph.get_max_x() )
        max_x = graph.get_max_x();
    }

    if ( max_x == null ) {
      max_x = 0;
    }


    this._get_max_graph_x = max_x;
    return max_x;
  };
  CartesianCanvas.prototype.get_max_x = function get_max_x() {
    // return maximum value from options.x_range if it is an array
    if (typeof this.options.x_range == 'object') {
      return this.options.x_range[1];
    }
    var margins = this.get_margins();
    var margin_right = margins[3];
    return this.get_max_graph_x() + margin_right;
  };
  CartesianCanvas.prototype.get_min_graph_y = function get_min_graph_y() {
    if (this._get_min_graph_y != null) {
      return this._get_min_graph_y;
    }

    // otherwise use graph values
    var min_y;
    for ( var graph_i = 0; graph_i < this.charts.length ; graph_i++ ) {
      var graph = this.charts[graph_i];
      if ( min_y == null || min_y > graph.get_min_y() )
        min_y = graph.get_min_y();
    }

    if ( min_y == null ) {
      min_y = 0;
    }

    this._get_min_graph_y = min_y;
    return min_y;
  };
  CartesianCanvas.prototype.get_min_y = function get_min_y() {
    // return minimum value from options.y_range if it is an array
    if (typeof this.options.y_range == 'object') {
      return this.options.y_range[0];
    }
    var margins = this.get_margins();
    var margin_bottom = margins[2];
    return this.get_min_graph_y() - margin_bottom;
  };
  CartesianCanvas.prototype.get_max_graph_y = function get_max_graph_y() {
    if (this._get_max_graph_y != null) {
      return this._get_max_graph_y;
    }

    // otherwise use graph values
    var max_y;
    for ( var graph_i = 0; graph_i < this.charts.length ; graph_i++ ) {
      var graph = this.charts[graph_i];
      if ( max_y == null || max_y < graph.get_max_y() )
        max_y = graph.get_max_y();
    }

    if ( max_y == null ) {
      max_y = 0;
    }

    this._get_max_graph_y = max_y;
    return max_y;
  };
  CartesianCanvas.prototype.get_max_y = function get_max_y() {
    // return maximum value from options.y_range if it is an array
    if (typeof this.options.y_range == 'object') {
      return this.options.y_range[1];
    }
    var margins = this.get_margins();
    var margin_top = margins[0];
    return this.get_max_graph_y() + margin_top;
  };

  CartesianCanvas.prototype.get_x_tick_width = function() { return Math.max(this._x_tick_width, this._y_tick_width); };
  CartesianCanvas.prototype.get_x2_tick_width = function() { return Math.max(this._x_tick_width, this._y2_tick_width); };
  CartesianCanvas.prototype.get_y_tick_width = function() { return Math.max(this._x_tick_height, this._y_tick_height); };
  CartesianCanvas.prototype.get_y2_tick_width = function() { return Math.max(this._x2_tick_height, this._y_tick_height); };

  CartesianCanvas.prototype.get_graph_margin_left = function get_graph_margin_left() {
    var padding = this.get_padding();
    return padding[3] + this.get_x_tick_width();
  };
  CartesianCanvas.prototype.get_graph_left = CartesianCanvas.prototype.get_graph_margin_left;

  CartesianCanvas.prototype.get_graph_margin_top = function get_graph_margin_top() {
    var padding = this.get_padding();
    return padding[0] + this.get_y2_tick_width();
  };
  CartesianCanvas.prototype.get_graph_top = CartesianCanvas.prototype.get_graph_margin_top;

  CartesianCanvas.prototype.get_graph_margin_right = function get_graph_margin_right() {
    var padding = this.get_padding();
    return padding[1] + this.get_x2_tick_width();
  };
  CartesianCanvas.prototype.get_graph_right = function get_graph_margin_right() {
    return this.raphael.width - this.get_graph_margin_right();
  };

  CartesianCanvas.prototype.get_graph_margin_bottom = function get_graph_margin_bottom() {
    var padding = this.get_padding();
    return padding[2] + this.get_y_tick_width();
  };
  CartesianCanvas.prototype.get_graph_bottom = function get_graph_margin_bottom() {
    return this.raphael.height - this.get_graph_margin_bottom();
  };

  CartesianCanvas.prototype.get_graph_width = function get_graph_width() {
    return this.raphael.width - this.get_graph_margin_left() - this.get_graph_margin_right();
  };
  CartesianCanvas.prototype.get_graph_height = function get_graph_height() {
    return this.raphael.height - this.get_graph_margin_top() - this.get_graph_margin_bottom();
  };

  CartesianCanvas.prototype.convert_x = function convert_x(x) {
    var min_x = this.get_x_range()[0];
    var max_x = this.get_x_range()[1];
    if ( max_x - min_x === 0 ) {
      return this.get_graph_margin_left();
    }
    return this.get_graph_margin_left() + this.get_graph_width() * (x - min_x) / (max_x - min_x);
  };

  CartesianCanvas.prototype.convert_y = function convert_y(y) {
    var min_y = this.get_y_range()[0];
    var max_y = this.get_y_range()[1];
    if ( max_y - min_y === 0 ) {
      return this.raphael.height - this.get_graph_margin_bottom();
    }
    return this.raphael.height - this.get_graph_margin_bottom() - (this.get_graph_height() * (y - min_y) / (max_y - min_y));
  };

  CartesianCanvas.prototype.get_padding = function padding() {
    return superApply(this, this.options.padding, arguments) || [0, 0, 0, 0];
  };

  var tick_generator = function(axis, property) { return function() {
    var real_axis = axis[0];  // x2 => x, y2 => y

    if ( arguments.length === 0 )
      return this.options[fmt('{0}_{1}', axis, property)];

    var value = arguments[0];
    if ( typeof value == 'number' ) {
      this.options[fmt('num_{0}_ticks', axis)] = value;
      this.options[fmt('{0}_{1}', axis, property)] = function() {
        var min = this[fmt('get_min_{0}', real_axis)]();
        var max = this[fmt('get_max_{0}', real_axis)]();
        return nTicksEvery(value, min, max);
      };
    }
    else {
      if ( typeof value == 'object' ) {
        this.options[fmt('num_{0}_ticks', axis)] = value.length;
      }
      else {
        this.options[fmt('num_{0}_ticks', axis)] = function() {
          return this[fmt('get_{0}_{1}', real_axis, property)]().length;
        };
      }

      this.options[fmt('{0}_{1}', axis, property)] = value;
    }
  };};
  var num_ticks_generator = function(axis) { return function() {
    var real_axis = axis[0];

    if ( arguments.length === 0 )
      return this.options[fmt('num_{0}_ticks', axis)];

    var value = arguments[0];
    this.options[fmt('num_{0}_ticks', axis)] = value;
    this.options.x_ticks = function() {
      var min = this[fmt('get_min_{0}', real_axis)]();
      var max = this[fmt('get_max_{0}', real_axis)]();
      return nTicksEvery(value, min, max);
    };
  };};

  CartesianCanvas.prototype.x_ticks = tick_generator('x', 'ticks');
  CartesianCanvas.prototype.x_lines = tick_generator('x', 'lines');
  CartesianCanvas.prototype.x2_ticks = tick_generator('x2', 'ticks');

  CartesianCanvas.prototype.num_x_ticks = num_ticks_generator('x');
  CartesianCanvas.prototype.num_x2_ticks = num_ticks_generator('x2');

  CartesianCanvas.prototype.y_ticks = tick_generator('y', 'ticks');
  CartesianCanvas.prototype.y_lines = tick_generator('y', 'lines');
  CartesianCanvas.prototype.y2_ticks = tick_generator('y2', 'ticks');

  CartesianCanvas.prototype.num_y_ticks = num_ticks_generator('y');
  CartesianCanvas.prototype.num_y2_ticks = num_ticks_generator('y2');

  var setter_i;
  var setters = [
    'padding', 'margins', 'border', 'decorations',
    'x_range', 'y_range',
    'x_ticks', 'num_x_ticks', 'x_tick',
    'x2_ticks', 'num_x2_ticks', 'x2_tick',
    'y_ticks', 'num_y_ticks', 'y_tick',
    'y2_ticks', 'num_y2_ticks', 'y2_tick',
    'x_lines', 'y_lines', 'x_line', 'y_line',
    'x_label', 'x_label_transform',
    'x2_label', 'x2_label_transform',
    'y_label', 'y_label_transform',
    'y2_label', 'y2_label_transform'
  ];
  for ( setter_i = 0; setter_i < setters.length; setter_i++ ) {
    (function(attr) {
      if ( ! CartesianCanvas.prototype[attr] ) {
        CartesianCanvas.prototype[attr] = function setter(value) {
          if ( arguments.length === 0 )
            return this.options[attr];
          this.options[attr] = value;
        };
      }

      if ( ! CartesianCanvas.prototype['get_' + attr] ) {
        CartesianCanvas.prototype['get_' + attr] = function getter() {
          return superApply(this, this.options[attr], arguments);
        };
      }
    })(setters[setter_i]);
  }

  // the reorder function is called after all the elements are added, and before
  // the layers are reordered
  CartesianCanvas.prototype.render = function render(reorder) {
    // reset
    var self = this;
    this.raphael.clear();
    // used to determine graph margins. "tick" here means "tick AND label". if
    // you have a better word, please use it instead!
    this._get_min_graph_x = null;
    this._get_max_graph_x = null;
    this._get_min_graph_y = null;
    this._get_max_graph_y = null;
    this._x_tick_width = 0;
    this._x_tick_height = 0;
    this._x2_tick_width = 0;
    this._x2_tick_height = 0;
    this._y_tick_width = 0;
    this._y_tick_height = 0;
    this._y2_tick_width = 0;
    this._y2_tick_height = 0;

    // this just stores local variables, but this way I can access them by
    // string (in methods that take 'axis')
    var scope = {};
    var sets = this.sets;
    // reset the "internal" sets
    this.sets.__border = this.raphael.set();
    this.sets.__axis_lines = this.raphael.set();
    this.sets.__labels = this.raphael.set();
    this.sets.__decorations_above = this.raphael.set();
    this.sets.__decorations_below = this.raphael.set();

    var canvas_width = this.raphael.width;
    var canvas_height = this.raphael.height;

    var padding = this.get_padding();
    var padding_top    = (padding && padding[0]) || 0;
    var padding_right  = (padding && padding[1]) || 0;
    var padding_bottom = (padding && padding[2]) || 0;
    var padding_left   = (padding && padding[3]) || 0;
    var should_add;

    //|
    //|  CALC GRAPH RECT
    //|
    scope.x_ticks = this.get_x_ticks();
    scope.x2_ticks = this.get_x2_ticks();
    scope.y_ticks = this.get_y_ticks();
    scope.y2_ticks = this.get_y2_ticks();
    var calc_margin = function calc_margin(axis) {
      var real_axis = axis[0];
      var secondary_axis = axis[1] == '2';
      var ticks = scope[fmt('{0}_ticks', axis)];
      var stored_ticks = [];
      var tick_elements = [];
      var label_elements = [];

      if ( ticks && ticks.length > 0 ) {
        var num_ticks = ticks.length;

        for ( var tick_i = 0; tick_i < num_ticks ; tick_i++ ) {
          var tick = ticks[tick_i];
          if ( tick == null ) {
            continue;
          }

          if ( real_axis == 'x' ) {
            if ( tick < self.get_min_x() || tick > self.get_max_x() ) {
              continue;
            }
          }
          else {
            if ( tick < self.get_min_y() || tick > self.get_max_y() ) {
              continue;
            }
          }
          stored_ticks.push(tick);

          var tick_element = self.raphael.rect(0, 0, 0, 0);
          var new_rect;
          new_rect = superApply(self, self.options[fmt('{0}_tick', axis)], [tick, tick_i, tick_element, axis]);
          if ( new_rect ) {
            new_rect = new Rect(new_rect);
          }
          else {
            tick_element.remove();
            tick_element = null;
          }
          tick_elements.push([tick_element, new_rect]);

          var outer_tick_width = 0;
          var outer_tick_height = 0;
          // the width of the part of the tick that is outside the graph area
          if ( new_rect ) {
            if ( real_axis == 'x' )
              outer_tick_height = Math.max(0, -new_rect.x);
            if ( real_axis == 'x2' )
              outer_tick_height = Math.max(0, new_rect.x2);
            else if ( axis == 'y' )
              outer_tick_width = Math.max(0, -new_rect.x);
            else if ( axis == 'y2')
              outer_tick_width = Math.max(0, new_rect.x2);
          }

          if ( real_axis == 'y' )
            outer_tick_width += self.lbl_tick_space;
          else
            outer_tick_height += self.lbl_tick_space;

          var lbl = self.raphael.text(0, 0, '');
          var lbl_text = tick.toString();
          var lbl_attrs;
          var default_attrs = self.options[fmt('{0}_default_label', axis)];
          if ( default_attrs ) {
            lbl.attr(default_attrs);
          }
          lbl_attrs = superApply(self, self.options[fmt('{0}_label', axis)], [tick, tick_i, lbl, axis]);
          if ( typeof lbl_attrs == 'string' ){
            lbl_text = lbl_attrs;
          }
          else if (lbl_attrs && typeof lbl_attrs == 'object') {
            lbl.attr(lbl_attrs);
          }
          else if (lbl_attrs === null || lbl_attrs === false) {
            // this is only applied if the return value is explicitly null or
            // false.  a return value of undefined uses the default label
            lbl_text = null;
          }

          var lbl_width = 0;
          var lbl_height = 0;
          var box;

          // apply label_element method?
          if ( lbl_text && lbl_text.length ) {
            lbl.attr({text: lbl_text});
            box = lbl.getBBox();
            // the width of the part of the label that is outside the graph area
            if ( axis == 'x' ){
              lbl_width = box.width;
              lbl_height = Math.max(0, box.y2);
            }
            else if ( axis == 'x2' ){
              lbl_width = box.width;
              lbl_height = Math.max(0, -box.y);
            }
            else if ( axis == 'y' ){
              lbl_width = Math.max(0, -box.x);
              lbl_height = box.height;
            }
            else if ( axis == 'y2' ) {
              lbl_width = Math.max(0, box.x2);
              lbl_height = box.height;
            }
            lbl_width += outer_tick_width;
            lbl_height += outer_tick_height;
            // lbl_width = box.width + outer_tick_width;
            // lbl_height = box.height + outer_tick_height;
            sets.__labels.push(lbl);
            label_elements.push(lbl);
          }
          else {
            lbl.remove();
            label_elements.push(null);
          }

          // these values are use in convert_x/convert_y - the graph size cannot
          // be determined until these are set
          scope[fmt('{0}_ticks', axis)] = stored_ticks;
          self[fmt('_{0}_tick_width', axis)] = Math.max(self[fmt('_{0}_tick_width', axis)], lbl_width);
          self[fmt('_{0}_tick_height', axis)] = Math.max(self[fmt('_{0}_tick_height', axis)], lbl_height);
        }
      }

      scope[fmt('{0}_tick_elements', axis)] = tick_elements;
      scope[fmt('{0}_label_elements', axis)] = label_elements;
    };
    calc_margin('x');
    calc_margin('x2');
    calc_margin('y');
    calc_margin('y2');

    //|
    //|  BORDER
    //|
    if ( this.options.border ) {
      var border_element = this.raphael.rect(
        this.get_graph_left(), this.get_graph_top(),
        this.get_graph_width(),
        this.get_graph_height()
        );
      var border_attrs = this.get_border(border_element);
      border_element.attr(border_attrs);
      sets.__border.push(border_element);
    }

    //|
    //|  GRID LINES
    //|
    var line_i;
    var line;
    var x_lines = this.get_x_lines();
    var y_lines = this.get_y_lines();
    if ( x_lines ) {
      for ( line_i = 0; line_i < x_lines.length; line_i++ ) {
        var line_x = x_lines[line_i];
        var x = this.convert_x(line_x);
        var y0 = this.get_graph_top();
        var y1 = this.get_graph_bottom();
        if ( x == null ) {
          continue;
        }

        line = this.raphael.path(fmt('M{0},{1} L{0},{2}', x, y0, y1));

        should_add = this.get_x_line(line_x, line_i, line);
        if ( ! should_add && should_add !== undefined )
          line.remove();
        else {
          if ( typeof should_add == 'object' )
            line.attr(should_add);
          sets.__axis_lines.push(line);
        }
      }
    }

    if ( y_lines ) {
      for ( line_i = 0; line_i < y_lines.length; line_i++ ) {
        var line_y = y_lines[line_i];
        var y = Math.round(this.convert_y(line_y)) + 0.5;
        var x0 = this.get_graph_left();
        var x1 = this.get_graph_right();

        line = this.raphael.path(fmt('M{1},{0} L{2},{0}', y, x0, x1));

        should_add = this.get_y_line(line_y, line_i, line);
        if ( ! should_add && should_add !== undefined ) {
          line.remove();
        }
        else {
          if ( typeof should_add == 'object' ) {
            line.attr(should_add);
          }
          sets.__axis_lines.push(line);
        }
      }
    }

    //|
    //|  TICKS & LABELS
    //|
    var draw_ticks = function draw_ticks(axis) {
      var real_axis = axis[0];
      var ticks = scope[fmt('{0}_ticks', axis)];
      if ( ! ticks )
        return;

      var tick_elements = scope[fmt('{0}_tick_elements', axis)];
      var label_elements = scope[fmt('{0}_label_elements', axis)];
      var num_ticks = ticks.length;
      var max = self[fmt('get_max_{0}', real_axis)]();
      var min = self[fmt('get_min_{0}', real_axis)]();
      var tick_formatter = self.options[fmt('{0}_tick', axis)];

      for ( var tick_i = 0; tick_i < num_ticks ; tick_i++ ) {
        var tick = ticks[tick_i];
        var label_element = label_elements[tick_i];
        // skip ticks that are not in the graph range
        if ( tick > max || tick < min ) {
          if ( label_element )
            label_element.remove();
          break;
        }

        var tick_element = tick_elements[tick_i][0];
        var new_rect = tick_elements[tick_i][1];
        var offset = 0;

        if ( tick_element && new_rect ) {
          if ( axis == 'y' )
            offset = Math.max(0, -new_rect.x);
          else if ( axis == 'y2' )
            offset = Math.max(0, new_rect.x2);
          else if ( axis == 'x' )
            offset = Math.max(0, -new_rect.y);
          else
            offset = Math.max(0, new_rect.y2);

          if ( axis == 'x' ) {
            tick_element.attr({
              x: self.convert_x(tick) + new_rect.y / 2,
              y: self.get_graph_bottom() - new_rect.x - new_rect.width,
              width: new_rect.height,
              height: new_rect.width
            });
          }
          else if ( axis == 'x2' ) {
            tick_element.attr({
              x: self.convert_x(tick) + new_rect.y / 2,
              y: self.get_graph_top() - new_rect.x - new_rect.width,
              width: new_rect.height,
              height: new_rect.width
            });
          }
          else if ( axis == 'y' ) {
            tick_element.attr({
              x: self.get_graph_left() + new_rect.x,
              y: self.convert_y(tick) + new_rect.y,
              width: new_rect.width,
              height: new_rect.height
            });
          }
          else if ( axis == 'y2' ) {
            tick_element.attr({
              x: self.get_graph_right() + new_rect.x,
              y: self.convert_y(tick) + new_rect.y,
              width: new_rect.width,
              height: new_rect.height
            });
          }
          sets.__border.push(tick_element);
        } else if ( tick_element ) {
          tick_element.remove();
        }

        if ( label_element ) {
          var x, y;
          if ( axis == 'x' ) {
            x = self.convert_x(tick);
            y = self.get_graph_bottom() + self.lbl_tick_space + offset;
          }
          else if ( axis == 'x2' ) {
            x = self.convert_x(tick);
            y = self.get_graph_top() - self.lbl_tick_space - offset;
          }
          else if ( axis == 'y' ) {
            x = self.get_graph_left() - self.lbl_tick_space - offset;
            y = self.convert_y(tick);
          }
          else if ( axis == 'y2' ) {
            x = self.get_graph_right() + self.lbl_tick_space + offset;
            y = self.convert_y(tick);
          }
          self[fmt('get_{0}_label_transform', axis)]([x, y], tick_i, label_element, axis);
        }
      }
    };
    draw_ticks('x');
    draw_ticks('x2');
    draw_ticks('y');
    draw_ticks('y2');

    //|
    //|  DECORATIONS
    //|
    this.get_decorations(this.sets.__decorations_above, this.sets.__decorations_below);

    //|
    //|  ORDERING
    //|

    sets.__border.zIndex = SimpleChart.zIndex.border;
    sets.__axis_lines.zIndex = SimpleChart.zIndex.axisLines;
    sets.__labels.zIndex = SimpleChart.zIndex.labels;
    sets.__decorations_above.zIndex = SimpleChart.zIndex.decorations;
    sets.__decorations_below.zIndex = SimpleChart.zIndex.bottom;

    //|
    //|  GRAPHS
    //|
    var ordered_sets = [sets];
    var unique_z_vals = {};
    var z_val;
    var set;

    for ( var chart_i = 0; chart_i < this.charts.length; chart_i++ ) {
      var chart = this.charts[chart_i];
      chart.render(this);
      ordered_sets.push(chart.sets);
    }

    for ( var some_set_index in ordered_sets ) {
      if ( ordered_sets.hasOwnProperty(some_set_index) ) {
        var some_sets = ordered_sets[some_set_index];
        for ( var a_set in some_sets ) {
          if ( some_sets.hasOwnProperty(a_set) ) {
            unique_z_vals[some_sets[a_set].zIndex] = true;
          }
        }
      }
    }

    if ( reorder ) {
      reorder.apply(this, [this]);
    }

    var z_vals = [];
    for ( z_val in unique_z_vals ) {
      if ( unique_z_vals.hasOwnProperty(z_val) ) {
        z_vals.push(parseFloat(z_val));
      }
    }
    z_vals = z_vals.sort(function(a, b) { return a - b; });

    for ( var z_val_index in z_vals ) {
      if ( z_vals.hasOwnProperty(z_val_index) ) {
        z_val = z_vals[z_val_index];
        for ( var ordered_i = 0; ordered_i < ordered_sets.length; ordered_i++ ) {
          for ( set in ordered_sets[ordered_i] ) {
            if ( ordered_sets[ordered_i].hasOwnProperty(set) ) {
              if ( ordered_sets[ordered_i][set].zIndex == z_val ) {
                ordered_sets[ordered_i][set].toFront();
              }
            }
          }
        }
      }
    }
  };


  var default_colors = [
    '#79c36a',
    '#599ad3',
    '#f9a65a',
    '#9e66ab',
    '#cd7058'
  ];
  var default_color_i = 0;

  var Chart = function Chart(data) {
    var options = {
      is_hidden: false
    };
    this.options = options;
    this.sets = {}; // stores the fills, paths, segments, and dots

    options.points = data || [];
    options.translate = function(point, point_i) {
      if (point && point.length != null) {
        return point;
      }
      return [point_i, point];
    };
  };

  Chart.prototype.hide = function() {
    for ( var set in this.sets ) {
      if ( this.sets.hasOwnProperty(set) ) {
        raphaelSetApply(this.sets[set], function(element) {
          var opacity = element.attr('opacity');
          var fill_opacity = element.attr('fill-opacity');
          var stroke_opacity = element.attr('stroke-opacity');
          element.data('simplechart-fill-opacity', fill_opacity || element.data('simplechart-fill-opacity') || 1);
          element.data('simplechart-stroke-opacity', stroke_opacity || element.data('simplechart-stroke-opacity') || 1);
          element.data('simplechart-opacity', opacity || element.data('simplechart-opacity') || 1);
          element.attr({'opacity': 0, 'fill-opacity': 0, 'stroke-opacity': 0});
          if (element.node.style) {
            element.node.style.opacity = 0;
            element.node.style.strokeOpacity = 0;
            element.node.style.fillOpacity = 0;
          }
        });
      }
    }
    this.options.is_hidden = true;
  };
  Chart.prototype.show = function() {
    for ( var set in this.sets ) {
      if ( this.sets.hasOwnProperty(set) ) {
        raphaelSetApply(this.sets[set], function(element) {
          // does nothing if the element is already visible
          var opacity = element.data('simplechart-opacity') || element.attr('opacity') || 1;
          var fill_opacity = element.data('simplechart-fill-opacity') || element.attr('fill-opacity') || 1;
          var stroke_opacity = element.data('simplechart-stroke-opacity') || element.attr('stroke-opacity') || 1;

          element.attr({'opacity': opacity, 'fill-opacity': fill_opacity, 'stroke-opacity': stroke_opacity});
          if (element.node.style) {
            element.node.style.opacity = opacity;
            element.node.style.fillOpacity = fill_opacity;
            element.node.style.strokeOpacity = stroke_opacity;
          }
        });
      }
    }
    this.options.is_hidden = false;
  };
  Chart.prototype.fadeout = function(duration) {
    if ( duration == null ) {
      duration = 300;
    }
    var el = this;
    var animate_with = null;
    var animation = Raphael.animation({'opacity': 0, 'fill-opacity': 0, 'stroke-opacity': 0}, duration, 'linear', function() {
      el.hide();
    });
    for ( var set in this.sets ) {
      if ( this.sets.hasOwnProperty(set) ) {
        raphaelSetApply(this.sets[set], function(element) {
          var opacity = element.attr('opacity');
          var fill_opacity = element.attr('fill-opacity');
          var stroke_opacity = element.attr('stroke-opacity');
          animate_with = animate_with || element;
          element.data('simplechart-opacity', opacity || element.data('simplechart-opacity') || 1);
          element.data('simplechart-fill-opacity', fill_opacity || element.data('simplechart-fill-opacity') || 1);
          element.data('simplechart-stroke-opacity', stroke_opacity || element.data('simplechart-stroke-opacity') || 1);
          element.animateWith(animate_with, null, animation, 'linear');
        });
      }
    }
    this.options.is_hidden = true;
  };
  Chart.prototype.fadein = function(duration) {
    if ( duration == null ) {
      duration = 300;
    }
    var el = this;
    var animate_with = null;
    for ( var set in this.sets ) {
      if ( this.sets.hasOwnProperty(set) ) {
        raphaelSetApply(this.sets[set], function(element) {
          // does nothing if the element is already visible
          var opacity = element.data('simplechart-opacity') || element.attr('opacity') || 1;
          var fill_opacity = element.data('simplechart-fill-opacity') || element.attr('fill-opacity') || 1;
          var stroke_opacity = element.data('simplechart-stroke-opacity') || element.attr('stroke-opacity') || 1;
          animate_with = animate_with || element;
          element.animateWith(animate_with, null, {'fill-opacity': fill_opacity, 'stroke-opacity': stroke_opacity, 'opacity': opacity}, duration, 'linear', function() {
            el.show();
          });
        });
      }
    }
    this.options.is_hidden = false;
  };

  Chart.prototype.get_min_x = function get_min_x() {
    if ( this._get_min_x != null )
      return this._get_min_x;

    var min_x;
    for ( var point_i = 0; point_i < this.options.points.length ; point_i++ ) {
      var point = this.get_translate(this.options.points[point_i], point_i);
      if ( ! point || point[0] == null || point[1] == null ) {
        continue;
      }

      var x = point[0];
      if ( min_x == null || min_x > x ) {
        min_x = x;
      }
    }
    if ( min_x == null ) {
      min_x = 0;
    }

    this._get_min_x = min_x;
    return min_x;
  };
  Chart.prototype.get_max_x = function get_max_x() {
    if ( this._get_max_x != null )
      return this._get_max_x;

    var max_x;
    for ( var point_i = 0; point_i < this.options.points.length ; point_i++ ) {
      var point = this.get_translate(this.options.points[point_i], point_i);
      if ( ! point || point[0] == null || point[1] == null ) {
        continue;
      }

      var x = point[0];
      if ( max_x == null || max_x < x ) {
        max_x = x;
      }
    }

    if ( max_x == null ) {
      max_x = 0;
    }

    this._get_max_x = max_x;
    return max_x;
  };
  Chart.prototype.get_min_y = function get_min_y() {
    if ( this._get_min_y != null )
      return this._get_min_y;

    var min_y;
    for ( var point_i = 0; point_i < this.options.points.length ; point_i++ ) {
      var point = this.get_translate(this.options.points[point_i], point_i);
      if ( ! point || point[0] == null || point[1] == null ) {
        continue;
      }

      var y = point[1];

      if ( min_y == null || min_y > y ) {
        min_y = y;
      }
    }

    if ( min_y == null ) {
      min_y = 0;
    }

    this._get_min_y = min_y;
    return min_y;
  };
  Chart.prototype.get_max_y = function get_max_y() {
    if ( this._get_max_y != null )
      return this._get_max_y;

    var max_y;
    for ( var point_i = 0; point_i < this.options.points.length ; point_i++ ) {
      var point = this.get_translate(this.options.points[point_i], point_i);
      if ( ! point || point[0] == null || point[1] == null ) {
        continue;
      }

      var y = point[1];

      if ( max_y == null || max_y < y ) {
        max_y = y;
      }
    }

    if ( max_y == null ) {
      max_y = 0;
    }

    this._get_max_y = max_y;
    return max_y;
  };

  //|
  //|  Inherits from Chart
  //|
  var BarChart = function BarChart() {
    Chart.apply(this, arguments);
    var options = this.options;

    var default_color = null;

    options._box_attrs = null;
    options.box = function(rect, index, set) {
      var x = rect.x;
      var y = rect.y;
      var width = rect.width;
      var height = rect.height;
      var attrs;
      if ( options._box_attrs ) {
        attrs = options._box_attrs;
      }
      else {
        if ( ! default_color ) {
          default_color = default_colors[default_color_i];
          default_color_i += 1;
          default_color_i %= default_colors.length;
        }
        attrs = { fill: default_color, stroke: null };
      }
      x -= width / 2 + 0.5;
      width -= 1;
      var stuff = [x, y, width, height];
      set.push(
        this.canvas.raphael.rect(x, y, width, height).attr(attrs)
        );
    };
  };

  BarChart.prototype = new Chart();

  BarChart.prototype.box = function() {
    if ( ! arguments.length )
      return this.options.box;
    var value = arguments[0];
    if ( typeof value == 'object' ) {
      this.options._box_attrs = value;
    }
    else {
      this.options.box = value;
    }
  };

  setters = [
    'points', 'box', 'translate'
  ];
  for ( setter_i = 0; setter_i < setters.length; setter_i++ ) {
    (function(attr) {
      if ( ! BarChart.prototype[attr] ) {
        BarChart.prototype[attr] = function setter(value) {
          if ( arguments.length === 0 )
            return this.options[attr];
          this.options[attr] = value;
        };
      }

      if ( ! BarChart.prototype['get_' + attr] ) {
        BarChart.prototype['get_' + attr] = function getter() {
          return superApply(this, this.options[attr], arguments);
        };
      }
    })(setters[setter_i]);
  }

  BarChart.prototype.render = function render(canvas) {
    // reset
    this.canvas = canvas;
    var self = this;
    var raphael = canvas.raphael;

    this._get_min_x = null;
    this._get_max_x = null;
    this._get_min_y = null;
    this._get_max_y = null;

    var line_path;
    var sets = this.sets;
    // reset the "internal" sets
    this.sets.__boxes = raphael.set();

    //|
    //|  BOXES
    //|
    var points = this.get_points();
    var box_elements = [];
    var box_points = [];
    var x, y;
    var box, box_i;
    for ( box_i = 0; box_i < points.length; box_i++ ) {
      box_entry = points[box_i];
      box = this.get_translate(box_entry, box_i);
      if ( ! box || box[0] == null || box[1] == null ) {
        continue;
      }
      x = canvas.convert_x(box[0]);
      y = canvas.convert_y(box[1]);

      if ( x >= this.canvas.get_graph_left() &&
           x <= this.canvas.get_graph_right() &&
           y <= this.canvas.get_graph_bottom() ) {
        y = Math.max(this.canvas.get_graph_top(), y);
        box_points.push(new Point(x, y));
      }
    }

    box_points = box_points.sort(function(pa, pb) {
      return pa.x - pb.x;
    });

    var box_width;
    for ( box_i = 1; box_i < box_points.length; box_i++ ) {
      var delta = box_points[box_i].x - box_points[box_i - 1].x;
      if ( delta != null && delta != NaN && (box_width == null || box_width > delta) ) {
        box_width = delta;
      }
    }

    if ( box_width == null ) {
      box_width = canvas.get_graph_width() / box_points.length / 2;
    }

    var y0 = canvas.get_graph_bottom();
    var scratch_set;
    for ( box_i = 0; box_i < box_points.length; box_i++ ) {
      box = box_points[box_i];
      var w = box_width;
      y = box.y;
      var h = y0 - y;
      x = box.x;

      var rect = new Rect(x, y, w, h);
      if ( rect.height > 0 ) {
        scratch_set = raphael.set();
        should_add = this.get_box(rect, box_i, scratch_set);
        if ( ! should_add && should_add !== undefined ) {
          scratch_set.remove();
        }
        else {
          if ( typeof should_add == 'object' ) {
            scratch_set.attr(should_add);
          }
          raphaelSetApply(scratch_set, function(element) {
            canvas.applyClip(element);
          });
          sets.__boxes.push(scratch_set);
        }
      }
    }

    sets.__boxes.zIndex = SimpleChart.zIndex.boxes;

    if ( this.options.is_hidden )
      this.hide();
  };

  //|
  //|  Inherits from Chart
  //|
  var LineChart = function LineChart(data) {
    Chart.apply(this, arguments);
    var options = this.options;

    options.translated = function(points) {
      var retval = [];
      for ( var entry_i = 0; entry_i < points.length ; entry_i++ ) {
        var entry = this.get_translate(points[entry_i], entry_i);
        if ( ! entry || entry[0] == null || entry[1] == null ) {
          continue;
        }
        retval.push(entry);
      }
      return retval;
    };
    options.paths = function(points) {
      return [points];
    };

    options.segment = null;
    options.path = null;
    options._dot_attrs = { fill: 'black', stroke: null };
    options.dot = function(point, index, set) {
      var x = point[0];
      var y = point[1];
      var dot = this.canvas.raphael.circle(x, y, 4);
      if (options._dot_attrs) {
        dot.attr(options._dot_attrs);
      }
      set.push(dot);
    };

    this.options.fill_x = null;
    this.options.fill_y = null;
  };

  LineChart.prototype = new Chart();

  LineChart.prototype.dot = function() {
    if ( ! arguments.length )
      return this.options.dot;
    var value = arguments[0];
    if ( typeof value == 'object' ) {
      this.options._dot_attrs = value;
    }
    else {
      this.options.dot = value;
    }
  };

  setters = [
    'points', 'dot', 'paths', 'translated', 'path',
    'fill_x', 'fill_y',
    'segment', 'translate'
  ];
  for ( setter_i = 0; setter_i < setters.length; setter_i++ ) {
    (function(attr) {
      if ( ! LineChart.prototype[attr] ) {
        LineChart.prototype[attr] = function setter(value) {
          if ( arguments.length === 0 )
            return this.options[attr];
          this.options[attr] = value;
        };
      }

      if ( ! LineChart.prototype['get_' + attr] ) {
        LineChart.prototype['get_' + attr] = function getter() {
          return superApply(this, this.options[attr], arguments);
        };
      }
    })(setters[setter_i]);
  }

  LineChart.prototype.render = function render(canvas) {
    // reset
    this.canvas = canvas;
    var self = this;
    var raphael = canvas.raphael;

    this._get_min_x = null;
    this._get_max_x = null;
    this._get_min_y = null;
    this._get_max_y = null;

    var line_path;
    var sets = this.sets;
    // reset the "internal" sets
    this.sets.__fills = raphael.set();
    this.sets.__paths = raphael.set();
    this.sets.__segments = raphael.set();
    this.sets.__dots = raphael.set();

    //|
    //|  PATHS
    //|
    var points = this.get_translated(this.get_points());
    var paths = this.get_paths(points);
    var scratch_set;
    var path;
    var should_add;

    for ( var path_i = 0; path_i < paths.length; path_i++ ) {
      var path_points = paths[path_i];
      var translated_path_points = [];
      var path_str = '';
      var fill_x_str = '';
      var fill_y_str = '';
      var segment_points = [];
      var segment_str = null;

      for ( var entry_i = 0; entry_i < path_points.length ; entry_i++ ) {
        var path_entry = path_points[entry_i];
        var x = canvas.convert_x(path_entry[0]);
        var y = canvas.convert_y(path_entry[1]);
        var point = [x, y];
        translated_path_points.push(point);

        scratch_set = raphael.set();
        should_add = this.get_dot(point, entry_i, scratch_set);
        if ( ! should_add && should_add !== undefined ) {
          scratch_set.remove();
        }
        else {
          if ( typeof should_add == 'object' )
            scratch_set.attr(should_add);
          raphaelSetApply(scratch_set, function(element) {
            canvas.applyClip(element);
          });
          sets.__dots.push(scratch_set);
        }

        var here = fmt(' L{0},{1}', x, y);
        if ( path_str.length ) {
          path_str += here;
          fill_x_str += here;
          fill_y_str += here;
          if ( entry_i == path_points.length - 1 ) {
            fill_x_str += fmt(' L{0},{2}', x, y, canvas.convert_y(canvas.get_min_y()));
            fill_y_str += fmt(' L{2},{1}', x, y, canvas.convert_x(canvas.get_min_x()));
          }
        }
        else {
          path_str = fmt('M{0},{1}', x, y);
          fill_x_str = fmt('M{0},{2} L{0},{1}', x, y, canvas.convert_y(canvas.get_min_y()));
          fill_y_str = fmt('M{2},{1} L{0},{1}', x, y, canvas.convert_x(canvas.get_min_x()));
        }

        if ( segment_str && this.options.segment ) {
          segment_points.push(point);
          segment_str += here;
          path = canvas.raphael.path(segment_str);
          should_add = this.get_segment(segment_points, entry_i - 1, path);

          if ( ! should_add && should_add !== undefined ) {
            path.remove();
          }
          else {
            if ( typeof should_add == 'object' ) {
              path.attr(should_add);
            }
            raphaelSetApply(path, function(element) {
              canvas.applyClip(element);
            });
            sets.__segments.push(path);
          }
        }
        segment_str = fmt('M{0},{1}', x, y);
        segment_points = [point];
      }

      path = canvas.raphael.path(path_str);
      should_add = this.get_path(translated_path_points, path_i, path);
      if ( ! should_add && should_add !== undefined ) {
        path.remove();
      }
      else {
        if ( typeof should_add == 'object' ) {
          path.attr(should_add);
        }
        raphaelSetApply(path, function(element) {
          canvas.applyClip(element);
        });
        sets.__paths.push(path);
      }

      if ( this.options.fill_x && fill_x_str ) {
        fill_x_str += ' Z';
        path = canvas.raphael.path(fill_x_str).attr({stroke:null});
        should_add = this.get_fill_x(translated_path_points, path_i, path);
        if ( ! should_add && should_add !== undefined) {
          path.remove();
        }
        else {
          if ( typeof should_add == 'object' ) {
            path.attr(should_add);
          }
          raphaelSetApply(path, function(element) {
            canvas.applyClip(element);
          });
          sets.__fills.push(path);
        }
      }

      if ( this.options.fill_y && fill_y_str ) {
        fill_y_str += ' Z';
        path = canvas.raphael.path(fill_y_str).attr({stroke:null});
        should_add = this.get_fill_x(translated_path_points, path_i, path);
        if ( ! should_add && should_add !== undefined) {
          path.remove();
        }
        else {
          if ( typeof should_add == 'object' ) {
            path.attr(should_add);
          }
          raphaelSetApply(path, function(element) {
            canvas.applyClip(element);
          });
          sets.__fills.push(path);
        }
      }
    }

    sets.__fills.zIndex = SimpleChart.zIndex.fills;
    sets.__paths.zIndex = SimpleChart.zIndex.paths;
    sets.__segments.zIndex = SimpleChart.zIndex.segments;
    sets.__dots.zIndex = SimpleChart.zIndex.dots;

    this.canvas = null;

    if ( this.options.is_hidden )
      this.hide();
  };

  SimpleChart.CartesianCanvas = CartesianCanvas;
  SimpleChart.Point = Point;
  SimpleChart.Size = Size;
  SimpleChart.Rect = Rect;

  SimpleChart.LineChart = LineChart;
  SimpleChart.BarChart = BarChart;

  SimpleChart.nTicksEvery = nTicksEvery;

  module.SimpleChart = SimpleChart;
})(window, Raphael);
