SimpleChart
-----------

A charting framework built on top of [Raphaël][raphael].

There is no lack of JavaScript charting libraries, and many of them are based
off Raphaël, but what makes SimpleChart distinct from others is that it does not
try to wrap or reproduce or hide the features that Raphaël already provides.

It is also distinct because it is based on callbacks instead of configuration.
Most charting tools involve passing some massive JSON object that describes all
your data, and how you want it displayed.  SimpleChart works in reverse - until
you tell it how you want things to look, it makes very few assumptions about how
you want it to look.  It has *customization* in mind.

SimpleChart can produce bar charts and line charts, and these can be displayed
at the same time.

We'll start with our sample data.  I'll be using [moment][momentjs] to work with
dates.  This data will be deliberately "messy data" (not clean `[x,y]` coords),
so that this is a real-world example.

###### example01.html
```javascript
var data = [
  { date: moment().subtract('days', 7), usage: "132.4 kWh" },
  { date: moment().subtract('days', 6), usage: "15.5 kWh" },
  { date: moment().subtract('days', 5), usage: "102.8 kWh" },
  // skipping day 4 on purpose, I didn't forget!
  { date: moment().subtract('days', 3), usage: "117.6 kWh" },
  { date: moment().subtract('days', 2), usage: "36.3 kWh" },
  { date: moment().subtract('days', 1), usage: "194.2 kWh" }
];

// start by creating a SimpleChart.CartesianCanvas(). This method takes the same
// arguments as raphael.Paper()
var canvas = SimpleChart.CartesianCanvas('canvas', 512, 300);

// now let's create a line chart
var usage_chart = new SimpleChart.LineChart(data);

// add our line graph to the canvas
canvas.add_chart(usage_chart);

// and render
canvas.render();
```

![Example 01][github.com/simpleenergy/SimpleChart/examples/example01.png]

Looks awful!  Actually, it's amazing that it rendered anything, it's trying to
draw *objects*!

We need to tell the `LineChart` *how to interpret the data*.  We do this using
the `translate` method.  This is usually gonna be your first step, unless your
data is already in a nice list of points (`[[x1,y1], ..., [xN, yN]]`).

###### example02.html
```javascript
// tell the chart how to convert to [x, y]
usage_chart.translate(function(point) {
  return [point.date.unix(), parseFloat(point.usage.match(/(-?)[0-9]+/)[0])];
});
```

![Example 02][github.com/simpleenergy/SimpleChart/examples/example02.png]

It's like I said:

> It has *customization* in mind.

Our data does not look very spiffy because the defaults are as *simple* as
possible.  But now I can show you that at the end, our chart will look like
this:

But baby steps.  We'll get there.

Next let's get our graph min/max values.  Right now it is creating a bounding
box that is pretty much the *smallest* it can be.  Without setting the range
manually, we can easily add some padding to the graph.

###### example03.html
```javascript
// add some margin - these are in the same units as our data
canvas.margins([10, 43200, 0, 43200]);  // CSS order: top, right, bottom, left
```

![Example 03][github.com/simpleenergy/SimpleChart/examples/example03.png]

Neat.  But if we *do* know our ranges, we can set those, too.  This setting
*overrides* the `margins` setting.

###### example04.html
```javascript
// set the range explicitly
canvas.x_range([moment().subtract('days', 8).unix(), moment().unix()]);
canvas.y_range([0, 200]);
```

![Example 04][github.com/simpleenergy/SimpleChart/examples/example04.png]

Let's work on those axis labels.  The default behavior is to create ticks that
are evenly spaced on the axis.  It's easy, though, to put them wherever we want.
I will use our source data, and place the ticks so that they are at 12 o'clock
noon.

###### example05.html
```javascript
// set the x_ticks to use the x-data, but at noon instead of whatever time it
// happens to be right now
canvas.x_ticks(data.map(function(entry) {
  return entry.date.clone().startOf('day').add('hours', 12).unix();
}));
```

![Example 05][github.com/simpleenergy/SimpleChart/examples/example05.png]

As much as I love unix timestamps (the one time to rule them all!), it's not
what most designers and projects managers and clients would call "human
readable", so that's just gotta go.

For this method - `x_label` - we need to return a different label *depending on
the x value*.  Watch!  Easy.

###### example06.html
```javascript
// this function very conveniently gets the x location *and* the index of the
// ticks.  We know that are ticks are 1::1 with our data, which has moment
// objects, which are easily formatted!
canvas.x_label(function(x, index) {
  var date = data[index].date;
  return date.fromNow();
});
```

![Example 06][github.com/simpleenergy/SimpleChart/examples/example06.png]

Our line graph isn't very... "graphy" without lines.  Let's add lines.

###### example07.html
```javascript
usage_chart.path(true);
```

![Example 07][github.com/simpleenergy/SimpleChart/examples/example07.png]

Hmm, that's not right - there is a day missing, and I would expect that to
reflect in the graph.  Yeah, we can do that.

Instead of one "path", the LineChart actually supports multiple paths, you just
need to tell it how to do that.

###### example08.html
```javascript
usage_chart.paths(function(points) {
  // this is what gets returned
  var retval = [];

  // we store each previous point so we have something to compare the current
  // point to
  var prev_point = null;

  // we'll return the last list of points that should make up a path
  var buffer = points.reduce(function(memo, point) {
    // if the distance between two points is more than one day
    if (prev_point && point[0] - prev_point[0] > 86400) {
      // add the current stack of points to the retval
      retval.push(memo);
      // and start over
      memo = [];
    }
    memo.push(point);
    prev_point = point;
    return memo;
  }, []);

  // and add the last list of points (that didn't get added using prev_point)
  retval.push(buffer);
  return retval;
});
```

![Example 08][github.com/simpleenergy/SimpleChart/examples/example08.png]

If you want, add the missing point to the data and see if it connects the line.
I will not do this with you, so I suppose it is guaranteed that there is some
obscure bug that will prevent that from working... I hope there isn't, though!

At this point, I think all we have left to do is *style*.

First, let's focus on these labels.  I'm just going to add another parameter to
the `x_label` function: `element`, which is passed in many of the callbacks. It
is the `Raphaël` element that is actually added to the canvas, so do Raphaël
stuff to it!  This is not SimpleChart code, this is straight up "Raphaël
styling."

###### example09.html
```javascript
canvas.x_label(function(x, index, element) {
  element.attr({'font-size': 12, 'font-family': 'Zapfino', 'transform': 'r-45,0,0'})
  var date = data[index].date;
  return date.fromNow();
});

// let's style the y-labels while we're at it.
canvas.y_label(function(y, index, element) {
  element.attr({'font-size': 12, 'font-family': 'Comic Sans'})
});
```

![Example 09][github.com/simpleenergy/SimpleChart/examples/example09.png]

Spectacular!

You may notice that the margins seem to be a little more liberal than they
really need to be.  Here's the thing.  In order to calculate the margins, we
need to know how wide the labels are.  Not just the labels on that side of the
graph, we need to take into account *all* the labels. *AND*, we don't know the
*location* of the label, because we don't know that until we calculate the
margins!  It's a terrible Catch-22, but it can be solved either using calculus
or by just making the margins wide enough to support *all* the labels.

Guess which we went with.

The good news, though, is that it's super easy to fix manually:

###### example10.html
```javascript
canvas.padding([-10, -80, -20, -50]);
```

I'm going to fix these eye-bleeding fonts.  It was a lame joke anyway.

![Example 10][github.com/simpleenergy/SimpleChart/examples/example10.png]

Fancy dots!  These are interesting because if you override the default you'll
immediately get no dot at all:

###### example11.html
```javascript
usage_chart.dot(true)
```

![Example 11][github.com/simpleenergy/SimpleChart/examples/example11.png]

Maybe interesting is the wrong word.  The reason the dots are wiped out is
because the `dot` function is not handed a Raphaël circle, that would be too
presumptuous.  It is handed a Raphaël `set`, to which you should *add* your dot
of choice, be it a circle, triangle, or lolcat image.

So let's add a new circle.  Things are gonna get a little crazy here because we
need to get the raphael object from the canvas.

###### example12.html
```javascript
// override the default with a stroked circle instead of a filled circle.
usage_chart.dot(function(point, index, dots) {
  dots.push(this.canvas.raphael.circle(point[0], point[1], 10).attr({stroke: 'blue', 'stroke-width': 4}));
});
```

![Example 12][github.com/simpleenergy/SimpleChart/examples/example12.png]

If you are *really* paying attention, you'll notice that the dots are clipped so
that they fit inside the graph area.  That's because it's awesome, and they
should probably be that way, right!?  If you need to use this feature yourself,
pass any element to `canvas.applyClip(element);` and it will be clipped to fit
inside the graph.

> But *I wanted customization*!
> We want out dots on top, and not clipped!

Then we'll need to do something crazy, and this trick is important to really
getting the most out of SimpleChart.

We'll create a *new* set, and add some circles to it.  Then we'll put it on top
of all the other graphics.  The good news is: this is actually pretty darn easy.

SimpleChart introduces a `zIndex` attribute on sets.  The ability to add these
and layer them brings a ton of power - you can add invisible overlays that can
control mouse hovers, for example, and easily place them above the graph.

###### example13.html
```javascript
// create a new set
var overlay = canvas.raphael.set();
// set its zIndex - this is NOT a raphael property!  It's an addition
// that SimpleChart adds to make "layers" easy.
// Anything at or above `SimpleChart.zIndex.top` is guaranteed to be
// on top.
overlay.zIndex = SimpleChart.zIndex.top;
usage_chart.dot(function(point, index, dots) {
  // and we just use our overlayoverlay
  overlay.push(this.canvas.raphael.circle(point[0], point[1], 10).attr({stroke: 'blue', 'stroke-width': 4}));
});
// if you don't do this step, you're gonna have a bad time.
usage_chart.sets.overlay = overlay;
```

![Example 13][github.com/simpleenergy/SimpleChart/examples/example13.png]

Fill effects, and let's not waste any more time with formalities!  We're going
to add a color fill, a gradient fill, and a pattern fill.

###### example14.html
```javascript
// add a subtle blue color fill to the graph
canvas.border({'stroke-width': 0.5, 'fill': '#ebeefe'});

// add a fill handler - we can use a different fill for the different paths
usage_chart.fill_x(function(path_points, path_index, path_element) {
  var fill;
  if ( path_index == 0 ) {
    // raphael gradient fill syntax takes some getting used to. this one is a
    // vertical (rotated 90°) gradient, starting at white, then pink, then light
    // gray
    fill = '90-#fff-#fee:20-#eee';
  }
  else {
    // pattern fills are super easy
    fill = 'url(p5.png)';
  }
  return {fill: fill};
});
```

![Example 14][github.com/simpleenergy/SimpleChart/examples/example14.png]

Let's move the ticks and labels on the y-axis *inside* the graph, add y2-axis
ticks that are in the same position as the y-axis ticks.

###### example15.html
```javascript
// the {xy}_tick handlers are funky ones - you return the rect that represents
// the size of the tick.  You can style it, too, but the rect is important.  The
// [0, 0] point of the tick is centered at the [x, y] location of the tick.  In
// this case we will make the tick *inside* the graph.
// Just to make things extra crazy, this function is handed the axis, so you can
// conceivably use it to format more than one axis.  Let's try it!
canvas.y_tick(function(y, index, tick_element, axis) {
  // skip the first and last tick, they look add drawn on top of the graph if
  // you're tempted to use `y_ticks` to set the ticks, and not include 0 or 200,
  // you might be surprised to find that the label would not be drawn in that
  // case.  If you want a label with no tick, you need to return null in this
  // function, but include the tick in the `{xy}_ticks` list.
  if ( y == 0 || y == 200 ) {
    return null;
  }
  tick_element.attr({'stroke': null, 'fill': 'black'});
  if (axis == 'y') {
    return [0, 0, 3, 1];  // x:0 starts at the graph edge.
  }
  // but the y2 axis is "swapped", we need to start at x:-3
  else if (axis == 'y2') {
    return [-3, 0, 3, 1];
  }
});

// To get these handlers, you call the function with no arguments. The values
// are actually stored in a "private" variable, and getting the actual values is
// a different process altogether.
canvas.y2_tick(canvas.y_tick());  // get the y_tick handler, and assign it to y2_tick.
canvas.y2_ticks(canvas.y_ticks());  // same for the y2_ticks locations
canvas.y2_label(null);  // but disable the labels

// adjust the padding - we don't need any space on the left, so let's use a
// function so we can calculate that at runtime!
canvas.padding(function() {
  // there is also a method `get_graph_margin_left`, but it depends on
  // `padding`.  So don't use it here!
  var margin_left = this.get_x_tick_width();
  var margin_right = this.get_x2_tick_width();
  return [-10, -margin_left, 0, -margin_right];
});
```

![Example 15][github.com/simpleenergy/SimpleChart/examples/example15.png]

Another nice graphical thingy to have would be a gray bar along the bottom.
This will use properties of the canvas that are computed in the `render` method,
so they must occur after that method is called.  In keeping with the "callback"
tradition you can use the `decorations` handler for this purpose.  It is handed
two sets: one is guaranteed to be above the graph, the other is guaranteed to be
below it.

###### example16.html
```javascript
// we will add our graph decoration to the bottom
canvas.decorations(function(above, below) {
  var corner_radius = 15;
  var left = canvas.get_graph_left();
  var top = canvas.get_graph_bottom() - corner_radius;
  var width = canvas.get_graph_width();
  var height = canvas.get_graph_margin_bottom() + corner_radius;
  var rect = canvas.raphael.rect(left, top, width, height);
  rect.attr({r: corner_radius, 'stroke': '#ddd', 'stroke-width': 1, 'fill': '#eee'});
  below.push(rect);
});
```

![Example 16][github.com/simpleenergy/SimpleChart/examples/example16.png]

Whew!  You still with us?  We've almost covered every darn option there is for
the line chart.  Just a few more.

If you want to have an interesting curve connect your line graph, you can use
the `segment` handler.  It is given two points (`x1: segment_points[0][0]`) and
a "default" path object.  Usually this is turned off, but watch THIS.

###### example17.html
```javascript
// turn off the path for now
usage_chart.path(null);
usage_chart.segment(function(points, index, path) {
  path.attr({path: Raphael.format('M{0},{1} C{2},{1},{0},{3},{2},{3}', points[0][0], points[0][1], points[1][0], points[1][1])});
});
```

![Example 17][github.com/simpleenergy/SimpleChart/examples/example17.png]

To take this further you would want to modify the `fill_x` handler to draw a new
path that uses this same curve.  I won't do it.  Not because I can't.  I totally
could.  What?  WHAT?  FINE!!

###### example18.html
```javascript
usage_chart.fill_x(function(path_points, path_index, path_element) {
  var fill;
  if ( path_index == 0 ) {
    // raphael gradient fill syntax takes some getting used to. this one is a
    // vertical (rotated 90°) gradient, starting at white, then pink, then light
    // gray
    fill = '90-#fff-#fee:20-#eee';
  }
  else {
    // pattern fills are super easy
    fill = 'url(p5.png)';
  }
  var path_str = Raphael.format('M{1},{0} L{1},{2}', this.canvas.get_graph_bottom(), path_points[0][0], path_points[0][1]);
  var prev_point = path_points[0];
  var point = prev_point; // this should get overridden, but in case it *doesn't*
  for ( var point_i = 1; point_i < path_points.length; point_i++ ) {
    point = path_points[point_i];
    path_str += Raphael.format(' C{2},{1},{0},{3},{2},{3}', prev_point[0], prev_point[1], point[0], point[1]);
    prev_point = point;
  }
  path_str += Raphael.format(' L{0},{1} Z', point[0], this.canvas.get_graph_bottom());
  return {fill: fill, path: path_str};
});
```

![Example 18][github.com/simpleenergy/SimpleChart/examples/example18.png]

Those paying very close attention will have notice that `paths` is giving the
entire list of data points as they are returned by our translate handler, but
`path` is giving points that are in the graph's coordinate system.  The goal is
that any function that is giving a raphael element is giving coordinates that
have been converted to the graph's coordinate system.

Since `paths` is not giving a raphael element, the coordinates are in the
chart's coordinate system.

Okay, let's add a `BarChart`.  We'll make up some new data:

###### example19
```javascript
var data = [
  { date: moment().subtract('days', 7), usage: "132.4 kWh", previous_usage: "21.2 kWh" },
  { date: moment().subtract('days', 6), usage: "15.5 kWh", previous_usage: "91.3 kWh" },
  { date: moment().subtract('days', 5), usage: "102.8 kWh", previous_usage: "65.8 kWh" },
  { date: moment().subtract('days', 3), usage: "117.6 kWh", previous_usage: "56.8 kWh" },
  { date: moment().subtract('days', 2), usage: "36.3 kWh", previous_usage: "79.0 kWh" },
  { date: moment().subtract('days', 1), usage: "194.2 kWh", previous_usage: "28.5 kWh" }
];
```

Actually, that's the same data, but with a new attribute "previous_usage".

```javascript
var prev_usage_chart = new SimpleChart.BarChart();

prev_usage_chart.translate(function(point) {
  return [point.date.unix(), parseFloat(point.previous_usage.match(/(-?)[0-9]+/)[0])];
});

canvas.add_chart(prev_usage_chart);
```

![Example 19][github.com/simpleenergy/SimpleChart/examples/example19.png]

BoxCharts have much less complexity than LineCharts - they just draw bars, after
all.  Much like the `dots` handler, the box handler is handed a set into which
you add your own raphael object, be it a path or rect.

Something I neglected to mention about `dot`, though, and this applies to `box`
so I'll just mention it here, is that you *can* style the defaults.  Just hand
this method an object instead of a function, and that will be applied to the
default box or dot.

```javascript
// you can apply styling easily
prev_usage_chart.box({'fill': 'black', 'stroke': null});  // don't forget stroke: null!
// but let's take it up a notch, we'll use alternating colors
var colors = colors = [
    '#79c36a',
    '#599ad3',
    '#f9a65a',
    '#9e66ab',
    '#cd7058'
  ];
prev_usage_chart.box(function(rect, box_i, boxes) {
  var color = colors[box_i % colors.length];
  // the `rect` variable is not centered, it is located *at* the `x` location.
  // This makes it easier to stack multiple bar graphs side by side.
  var box = this.canvas.raphael.rect(rect.x - rect.width / 2, rect.y, rect.width, rect.height);
  // it's very easy to forget stroke: null, and Raphaël objects have
  // stroke:'black' by default
  box.attr({fill: color, 'fill-opacity': 0.2, stroke: null});
  boxes.push(box);
});
```

Lastly, it's easy to turn charts on and off.  You can `show` and `hide` charts,
or use `fadein` and `fadeout`.

```javascript
var ping = function() {
  prev_usage_chart.fadeout();
  usage_chart.fadein();
  setTimeout(pong, 1000);
};
var pong = function() {
  prev_usage_chart.fadein();
  usage_chart.fadeout();
  setTimeout(ping, 1000);
};
setTimeout(ping, 1000);
```

As long as I don't point out that the gradient doesn't fade in and out, you
won't notice, right?  Crap!?  You noticed.  Now you can't stop looking at it!!

This is a defect of SVG, or VML, or Raphaël.  [Google it yourself][gradient-bug]

# The End

[raphael]: http://raphaeljs.com
[momentjs]: http://momentjs.com
[example21]: https://github.com/simpleenergy/SimpleChart/tree/master/example/example21.html
[gradient-bug]: http://lmgtfy.com/?q=raphael+gradient+fill+opacity
