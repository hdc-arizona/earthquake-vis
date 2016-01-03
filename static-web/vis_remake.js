/* main */

// data matrix holds the orignal data list
// each row is a frame (1/400 second)
// col 1-12 is shear
// col 13-25 is moment
// col 26-38 is dia-force
var dataMatrix = loadJSON("all.json");

var N = 100;
var densityDim = 200;
var zoomEnabled = false, pixelated = false;
var margin = {top: 10, right: 20, bottom: 10, left: 20};
var stats = [
    { type: "Shear", heatmapDimY: 12 },
    { type: "Moment", heatmapDimY: 13 },
    { type: "DiaF", heatmapDimY: 13 }
]

var brushCell;

var heatmapWidth = 900 - margin.left - margin.right;
var heatmapHeight = 300 - margin.top - margin.bottom;
var X = 0, Y = 1;

var canvasDim = [heatmapWidth, heatmapHeight];
var canvasAspect = canvasDim[Y] / canvasDim[X];

function draw()
{
    // calculate extents
    for (var s = 0; s < stats.length; s++) {
        switch(s) {
            case 0:
                stats[s].extent = getExtent(1,12);
                break;
            case 1:
                stats[s].extent = getExtent(13,25);
                break;
            case 2:
                stats[s].extent = getExtent(26,28);
                break;
        }
    }

    heatmapDimX = dataMatrix.length;

    scaleX = d3.scale.linear()
        .domain([0, heatmapDimX/400])
        .range([0, canvasDim[X]]);

    for (var s = 0; s < stats.length; s++) {
        drawHeatmap(s);
    }

    svg = d3.select("body").append("svg")
        .attr("width", 1400)
        .attr("height", canvasDim[Y]*3+100)
        .style("position", "absolute")

    zoom = d3.behavior.zoom()
        .scaleExtent([1,1000])
        .on("zoom", zoomEvent)
        .x(scaleX)
    for (var i = 0; i < stats.length; i++){
        stats[i].axisElement = svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate("+ margin.left +"," +
            (canvasDim[Y] + 300*i + margin.top) + ")")

        svg.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate("+ margin.left +"," +
            (300*i + margin.top) + ")")
          .call(stats[i].yAxis)

        var cell = svg.append("g")
            .attr("width", canvasDim[X])
            .attr("height", canvasDim[Y])
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("transform", "translate("+margin.left+"," + (300*i+margin.top) + ")")
            .style("pointer-event", "all")
            .style("fill", "none")
            .attr("id", "cell-"+1);



        stats[i].zoom = zoom;

        // This brush is for first heatmap only
        brush = d3.svg.brush()
            .x(scaleX)
            .y(stats[i].scaleY)
            .on("brushstart", brushstart)
            .on("brush", brushmove)
            .on("brushend", brushend)

        cell.call(brush);

        cell.call(zoom);

        // zoom event listener
        /*
        svg.append("rect")
            .style("pointer-events", "all")
            .attr("width", canvasDim[X])
            .attr("height", canvasDim[Y]*3+140)
            .style("fill", "none")
            .call(zoom)
        */
    }

    drawAxes();
    drawLegend();
    drawDensityMap();
    drawButtons()
}

function drawButtons() {
    drawSwitchButton();
    drawPixelateButton();
}

function drawPixelateButton() {
    pixButton = svg.append("g")
        .classed("button", true)
        .attr("cursor", "pointer")
        .on("mouseup", switchPixelation)
        .attr("transform", "translate(1060,10)")

    pixButton.append("rect")
        .attr("x", 20)
        .attr("y", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 150)
        .attr("height", 20)
        .attr("fill","#d7d7d7")

    pixButton.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text("pixelize")
        .attr("fill", "black")
}

function switchPixelation() {
    pixelated = !pixelated;
    if (pixelated) {
        pixButton.select("text").text("pixelize")
    } else {
        pixButton.select("text").text("smooth")
    }
}

function drawSwitchButton() {
    switchButton = svg.append("g")
        .classed("button", true)
        .attr("cursor", "pointer")
        .on("mouseup", modeSwitch)
        .attr("transform", "translate(900,10)")

    switchButton.append("rect")
        .attr("x", 20)
        .attr("y", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 150)
        .attr("height", 20)
        .attr("fill","#d7d7d7")

    switchButton.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text("Switch (current mode: brush)")
        .attr("fill", "black")
}

function modeSwitch() {
    zoomEnabled = !zoomEnabled;
    if (zoomEnabled) {
        switchButton.select("text").text("Switch (current mode: zoom)");
        d3.select(brushCell).call(brush.clear())
        d3.selectAll(".extent").attr("visibility", "hidden");
    } else {
        switchButton.select("text").text("Switch (current mode: brush)");
        d3.select(brushCell).call(brush.clear())
        d3.selectAll(".extent").attr("visibility", "visible");
    }
}


function drawDensityMap() {
    var densityScale = d3.scale.log().base(10)
        .domain([1, 50, 14000])
        .range(["#efedf5","#9ebcda","#8856a7"]);
    var smdm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 75)");
    var sddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 375)");
    var mddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 675)");
    maxs = [-Infinity,-Infinity,-Infinity];
    smdm.selectAll("rect").remove();
    sddm.selectAll("rect").remove();
    mddm.selectAll("rect").remove();
    for(var x = 0; x < N; x++) {
        for(var y = 0; y < N;y++) {
            smdm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(sm[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[0] = Math.max(sm[x][y],maxs[0]);
            sddm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(sd[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[1] = Math.max(sd[x][y],maxs[1]);
            mddm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(md[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[2] = Math.max(md[x][y],maxs[2]);
        }
    }

    drawDensityAxis(smdm);
    drawDensityAxis(sddm);
    drawDensityAxis(mddm);

    for (var i = 0; i < 3; i++) {
        var maxCap = d3.max(maxs, function(d) { return d; });
        var maxLog = Math.log10(maxCap);
        var legendData = [];
        for (var j = 1; j < 100; j++) {
            legendData.push(Math.pow(10, (maxLog * j / 100)));
        }
        var legendScale = d3.scale.log().base(10).range([200,0])
                            .domain([1, maxCap]);
        var legend = d3.select("svg").append("g").classed("legend", true)
            .attr("transform", "translate(" + (heatmapWidth+50) + "," + (30+300 * i) + ")" )

        legend.selectAll("rect").data(legendData).enter().append("rect")
            .attr("x",75)
            .attr("y",50)
            .attr("width", 20)
            .attr("height", function(d) { return(legendScale(d)); })
            .attr("fill", function(d) { return densityScale(d+1); });

        var legendAxis = d3.svg.axis().scale(legendScale).orient("right")
            .ticks(2)

        switch(i) {
            case 0:
                var title = "Shear x Moment";
                break;
            case 1:
                var title = "Shear x DiaF";
                break;
            case 2:
                var title = "Moment x DiaF";
                break;
        }

        legend.append("g")
        .attr("class", "axis lAxis")
        .attr("transform", "translate(95,50)")
        .call(legendAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 0)
          .style("text-anchor", "middle")
          .text(title)
          .attr("transform", "translate(0,-20)");
    }
}

/* functions */
function loadJSON(file) {
    d3.json(file, function(error, data) {
        if (error) {
            alert("Unable to open all.json: " + error);
            return;
        }
        dataMatrix = data;
        // data list stored data as a list
        // each data point is an object
        // {row, col, value}
        dataList = loadCSV("all.csv");
        prepareDensityMap();
    });
}

function loadCSV(file) {
    d3.csv(file, function(error, data) {
        dataList = [];
        if (error) {
            alert("Unable to open all.csv: " + error);
            return;
        }
        for (var i = 0; i < data.length; i++) {
            data[i].val = parseFloat(data[i].val);
            dataList.push(data[i]);
        }
        draw();
    });
}

function getExtent(startCol, endCol) {
    return d3.extent(dataList, function(d) {
        if (d.col >= startCol && d.col <= endCol) {
            return d.val;
        } else {
            return 0;
        }
    });
}

function drawHeatmap(i) {
    var heatmapDimY = stats[i].heatmapDimY;
    heatmapAspect = heatmapDimY / heatmapDimX;
    var scaleY = d3.scale.linear()
        .domain([0, heatmapDimY])
        .range([canvasDim[Y],0]);
    stats[i].scaleY = scaleY;
    var min = stats[i].extent[0];
    var max = stats[i].extent[1];
    var maxDomain = Math.max(max, -min);
    stats[i].maxDomain = maxDomain;
    var colorScale = d3.scale.linear()
        .domain([maxDomain, 0, -maxDomain])
        .range(["#67001f", "#f7f7f7", "#053061"]);
    stats[i].colorScale = colorScale;
    d3.selectAll("canvas").select("."+stats[i].type).remove();
    var canvas = d3.select("body").append("canvas")
        .attr("width", heatmapDimX)
        .attr("height", heatmapDimY)
        .style("width", canvasDim[X] + "px")
        .style("height", canvasDim[Y] + "px")
        .style("position", "absolute")
        .attr("class", stats[i].type);
    if (i == 0) {
        canvas.style("image-rendering", "pixelated");
    }

    // x axis is dynamic
    stats[i].xAxis = d3.svg.axis().scale(scaleX).orient("bottom")
      .ticks(20);

    // y axis is locked
    stats[i].yAxis = d3.svg.axis().scale(scaleY).orient("left");

    var context = canvas.node().getContext("2d");
    stats[i].context = context;

    /* create image object */
    var imageObj = new Image();
    stats[i].imageObj = imageObj;
    var image = context.createImageData(heatmapDimX, heatmapDimY);
    for (var y = heatmapDimY-1, p = -1; y >= 0; --y) {
        for (var x = 0; x < heatmapDimX; ++x) {
            switch(i) {
                case 0:
                    var c = d3.rgb(colorScale(dataMatrix[x][y]));
                    break;
                case 1:
                    var c = d3.rgb(colorScale(dataMatrix[x][y+12]));
                    break;
                case 2:
                    var c = d3.rgb(colorScale(dataMatrix[x][y+25]));
                    break;
            }
            image.data[++p] = c.r;
            image.data[++p] = c.g;
            image.data[++p] = c.b;
            image.data[++p] = 255;
        }
    }
    context.putImageData(image, 0, 0);
    imageObj.src = canvas.node().toDataURL();
    imageDim = [imageObj.width, imageObj.height];
    imageScale = imageDim.map(function(v, j){return v / canvasDim[j]});
    console.log(imageDim)
}

function drawAxes() {
    for (var i = 0; i < stats.length; i++) {
        stats[i].axisElement.call(stats[i].xAxis);
    }
}

function zoomEvent() {
    if (zoomEnabled){
        var s = d3.event.scale;
        var n = imageDim.map(
          function(v) {return v * s});
        var t = d3.event.translate.map(function(v, i) {
          return Math.min(
            0,
            Math.max(v, canvasDim[i] - n[i] / imageScale[i]));
        });
        zoom.scale = s;
        zoom.translate(t);
        /*
        for (var c = 0; c < stats.length; c++) {
            stats[c].zoom.translate(t);
            stats[c].zoom.scale = s;
        }
        */
        var it = t.map(
          function(v, i) {return v * imageScale[i]});
        for (var c = 0; c < stats.length; c++) {
            stats[c].context.clearRect(0, 0, canvasDim[X], canvasDim[Y]);
            stats[c].context.drawImage(stats[c].imageObj, it[X], 0, n[X], imageDim[Y]);
            stats[c].context.mozImageSmoothingEnabled = !pixelated;
            stats[c].context.webkitImageSmoothingEnabled = !pixelated;
            stats[c].context.imageSmoothingEnabled = !pixelated;
        }
        drawAxes();
    }
}

function drawLegend() {
    for (var i = 0; i < stats.length; i++) {
        var maxCap = Math.ceil(stats[i].maxDomain);
        var legendData = [];
        for (var j = 0; j < 100; j++) {
            legendData.push(-maxCap+(2 * maxCap * j) / 100);
        }
        var legendScale = d3.scale.linear().range([200,0])
                            .domain([-maxCap, maxCap]);
        var legend = d3.select("svg").append("g").classed("legend", true)
            .attr("transform", "translate(" + (heatmapWidth) + "," + (30+300 * i) + ")" )

        legend.selectAll("rect").data(legendData).enter().append("rect")
            .attr("x",75)
            .attr("y",50)
            .attr("width", 20)
            .attr("height", function(d) { return(legendScale(d)); })
            .attr("fill", function(d) { return stats[i].colorScale(d); });

        var legendAxis = d3.svg.axis().scale(legendScale).orient("left")
            .ticks(5)

        legend.append("g")
        .attr("class", "axis lAxis")
        .attr("transform", "translate(75,50)")
        .call(legendAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 0)
          .style("text-anchor", "end")
          .text(stats[i].type)
          .attr("transform", "translate(0,-20)");
    }
}

function prepareDensityMap() {
    d3.csv("nall.csv", function(error, data) {
        if (error) {
            alert("Unable to open nall.csv: " + error);
            return;
        }
        adjustedMatrix = data
        sm = [];
        sd = [];
        md = [];
        for (var i = 0; i < N; i++) {
            sm.push(Array(N));
            sd.push(Array(N));
            md.push(Array(N));
            for (var j = 0; j < N; j++) {
                sm[i][j] = 0;
                sd[i][j] = 0;
                md[i][j] = 0;
            }
        }
        for (var i = 0; i < data.length; i++) {
            var s = Math.floor((parseFloat(data[i]['shear']) + 6) * N / 12);
            var m = Math.floor((parseFloat(data[i]['nMoment']) + 6) * N / 12);
            var d = Math.floor((parseFloat(data[i]['nDiaF']) + 6) * N / 12);
            sm[s][m]++;
            sd[s][d]++;
        }

        for (var i = 0; i < dataMatrix.length; i++) {
            for (var j = 0; j < 13; j++) {
                var m = Math.floor((parseFloat(dataMatrix[i][j+12]) + 6) * N / 12);
                var d = Math.floor((parseFloat(dataMatrix[i][j+25]) + 6) * N / 12);
                md[m][d]++;
            }
        }
    })
}

function recount() {
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            sm[i][j] = 0;
            sd[i][j] = 0;
            md[i][j] = 0;
        }
    }
    console.log(sx)
    for (var i = 0; i < adjustedMatrix.length; i++) {
        if (!inRange(adjustedMatrix[i]['frame'], sx)) {continue;}
        if (!inRange(adjustedMatrix[i]['floor'], sy)) {continue;}
        var s = Math.floor((parseFloat(adjustedMatrix[i]['shear']) + 6) * N / 12);
        var m = Math.floor((parseFloat(adjustedMatrix[i]['nMoment']) + 6) * N / 12);
        var d = Math.floor((parseFloat(adjustedMatrix[i]['nDiaF']) + 6) * N / 12);
        sm[s][m]++;
        sd[s][d]++;
    }

    for (var i = 0; i < dataMatrix.length; i++) {
        for (var j = 0; j < 13; j++) {
            var m = Math.floor((parseFloat(dataMatrix[i][j+12]) + 6) * N / 12);
            var d = Math.floor((parseFloat(dataMatrix[i][j+25]) + 6) * N / 12);
            md[m][d]++;
        }
    }

    var densityScale = d3.scale.log().base(10)
        .domain([1, 50, 14000])
        .range(["#efedf5","#9ebcda","#8856a7"]);
    var smdm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 75)");
    var sddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 375)");
    var mddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 675)");
    maxs = [-Infinity,-Infinity,-Infinity];
    smdm.selectAll("rect").remove();
    sddm.selectAll("rect").remove();
    mddm.selectAll("rect").remove();
    for(var x = 0; x < N; x++) {
        for(var y = 0; y < N;y++) {
            smdm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(sm[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[0] = Math.max(sm[x][y],maxs[0]);
            sddm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(sd[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[1] = Math.max(sd[x][y],maxs[1]);
            mddm.append("rect")
                .attr("x", x * (densityDim/N))
                .attr("y", y * (densityDim/N))
                .attr("fill", densityScale(md[x][y]+1))
                .attr("width", densityDim/N)
                .attr("height", densityDim/N);
            maxs[2] = Math.max(md[x][y],maxs[2]);
        }
    }
}

function inRange(value, extent) {
    if (value >= extent[0] && value <= extent[1]) {
        return true;
    } else {
        return false;
    }
}

function drawDensityAxis(g){
    var s = d3.scale.linear()
        .domain([-6, 6])
        .range([0, 200]);
    var xAxis = d3.svg.axis().scale(s).orient("top");
    var yAxis = d3.svg.axis().scale(s).orient("left");

    g.append("g")
      .attr("class", "x axis").call(xAxis);

    g.append("g")
      .attr("class", "y axis")
      .call(yAxis);
}

// Clear the previously-active brush, if any.
function brushstart(p) {
    if (brushCell !== this) {
        d3.select(brushCell).call(brush.clear());
        brushCell = this;
    }
}

// Highlight the selected circles.
function brushmove(p) {
    if (zoomEnabled) return;
    e = brush.extent()
}

// If the brush is empty, select all circles.
function brushend(p) {

    if (zoomEnabled) d3.select(brushCell).call(brush.clear());
    console.log(e)
    if (d3.select(brushCell).attr("id") != "cell-0") {
        sx = e[0];
        sy = e[1];
    }
    if (d3.select(brushCell).attr("id") != "cell-1") {
        mx = e[0];
        my = e[1];
    }
    if (d3.select(brushCell).attr("id") != "cell-2") {
        dx = e[0];
        dy = e[1];
    }
    //recount();

}

