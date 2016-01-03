function print(str) {
    console.log(str);
}

d3.json("all.json", function(error, data) {
    if (error) {
        alert("Unable to open all.json: " + error);
        return;
    }
    loadCSV(data);
});
var axisElements = [];
var contexts = [];
var imageObjs = [];
var axes = [];
var scales = [];

function loadCSV(matrix){
    d3.csv("all.csv", function(error, data) {
        dataList = [];
        if (error) {
            alert("Unable to open all.csv: " + error);
            return;
        }
        for (var i = 0; i < data.length; i++) {
            data[i].val = parseFloat(data[i].val);
            dataList.push(data[i]);
        }

        drawAll(matrix,data);
    });
}

function drawAll(dataMatrix, dataList) {
    X = 0, Y = 1;
    margin = {top: 10, right: 20, bottom: 10, left: 40},
        width = 900 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;
    canvasDim = [width, height];
    canvasAspect = canvasDim[Y] / canvasDim[X];
    color = d3.scale.linear();
    body = d3.select("body");
    heatmapDimX = dataMatrix.length;
    scaleX = d3.scale.linear()
      .domain([0, heatmapDimX/400])
      .range([0, canvasDim[X]]);

    draw(dataMatrix, dataList, "S");
    draw(dataMatrix, dataList, "M");
    draw(dataMatrix, dataList, "D");

    svg = body.append("svg")
    .attr("width", canvasDim[X])
    .attr("height", canvasDim[Y]*3+100)
    .style("position", "absolute")


    zoom = d3.behavior.zoom()
    .scaleExtent([1,500])
    .on("zoom", zoomEvent)
    .x(scaleX)

    svg.append("rect")
    .style("pointer-events", "all")
    .attr("width", canvasDim[X])
    .attr("height", canvasDim[Y]*3+140)
    .style("fill", "none")
    .call(zoom);

    for (var i = 0; i < 3; i++){
    axisElements.push(svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (canvasDim[Y] + 300*i) + ")"));

    svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(0," + 300*i + ")")
      .call(axes[i])
    }
    drawAxes();
}

function draw(dataMatrix, dataList, type) {
    if (type == "S")
        var heatmapDimY = 12;
    else
        var heatmapDimY = 13;
    var heatmapAspect = heatmapDimY / heatmapDimX;
    var scaleY = d3.scale.linear()
      .domain([0, heatmapDimY])
      .range([canvasDim[Y], 0]);
    scales.push[scaleY];
    var extent = d3.extent(dataList, function(d) {
        if (d.col <= 12) {
            if (type == "S") return d.val;
            else return 0;
        } else if (d.col <= 25){
            if (type == "M") return d.val;
            else return 0;
        } else {
            if (type == "D") return d.val;
            else return 0;
        }
    });
    var min = extent[0];
    var max = extent[1];
    var maxDomain = Math.max(max, -min);

    color
    .domain([maxDomain, 0, -maxDomain])
    .range([
        "#67001f",
        "#f7f7f7",
        "#053061"]);

    var canvas = body.append("canvas")
    .attr("width", heatmapDimX)
    .attr("height", heatmapDimY)
    .style("width", canvasDim[X] + "px")
    .style("height", canvasDim[Y] + "px")
    .style("position", "absolute")
    .attr("class", type);
    if (type == "S") {
        canvas.style("image-rendering","pixelated")
    }

    // x-axis
    var axis = [
    d3.svg.axis()
      .scale(scaleX)
      .orient("top")
      .ticks(20),
    d3.svg.axis()
      .scale(scaleY)
      .orient("right")
    ];
    axes.push(axis[1]);
    axisX = axis[0];
    var context = canvas.node().getContext("2d");
    contexts.push(context);
    createImageObj();
    drawAxes();
    drawLegend();

    // Compute the pixel colors; scaled by CSS.
    function createImageObj() {
    var imageObj = new Image();
    imageObjs.push(imageObj);
    var image = context.createImageData(heatmapDimX, heatmapDimY);
    for (var y = 0, p = -1; y < heatmapDimY; ++y) {
      for (var x = 0; x < heatmapDimX; ++x) {
        if (type == "S")
            var c = d3.rgb(color(dataMatrix[x][y]));
        else if (type == "M")
            var c = d3.rgb(color(dataMatrix[x][y+12]));
        else
            var c = d3.rgb(color(dataMatrix[x][y+25]));
        image.data[++p] = c.r;
        image.data[++p] = c.g;
        image.data[++p] = c.b;
        image.data[++p] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    imageObj.src = canvas.node().toDataURL();
    imageDim = [imageObj.width, imageObj.height];
    imageScale = imageDim.map(
      function(v, i){return v / canvasDim[i]});
    }
}

function drawAxes() {
    axisElements.forEach(function(v, i) {v.call(axisX)});
}

function zoomEvent() {
    s = d3.event.scale;
    print(s);
    var n = imageDim.map(
      function(v) {return v * s});
    var t = d3.event.translate.map(function(v, i) {
      return Math.min(
        0,
        Math.max(v, canvasDim[i] - n[i] / imageScale[i]));
    });
    zoom.translate(t);
    var it = t.map(
      function(v, i) {return v * imageScale[i]});
    for (var c = 0; c < contexts.length; c++) {
        contexts[c].clearRect(0, 0, canvasDim[X], canvasDim[Y]);
        contexts[c].drawImage(imageObjs[c], it[X], 0, n[X], imageDim[Y]);
        /*
        contexts[c].mozImageSmoothingEnabled = false;
        contexts[c].webkitImageSmoothingEnabled = false;
        contexts[c].imageSmoothingEnabled = false;
        */
    }
    drawAxes();
}

