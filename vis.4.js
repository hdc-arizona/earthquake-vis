/* main */

// data matrix holds the orignal data list
// each row is a frame (1/400 second)
// col 1-12 is shear
// col 13-25 is moment
// col 26-38 is dia-force

var N = 100;
var densityDim = 200;
var dataMatrix = loadJSON("St12HingeEQ7MCE.json");
var zoomEnabled = true, pixelated = false;
var prepareDensityMapCalled = false;
var useLogDensityScale = true;
var densityCountMax = 10000;
var floorFilter = true, timeFilter = true;

var margin = {top: 10, right: 20, bottom: 10, left: 20};
var F = 13;
var heatmapDimY = F;

var stats = [
    { type: "Shear"},
    { type: "Moment"},
    { type: "DiaF"}
];
var brushCell;

var heatmapWidth = 900 - margin.left - margin.right;
var heatmapHeight = 300 - margin.top - margin.bottom;
var X = 0, Y = 1;

var canvasDim = [heatmapWidth, heatmapHeight];
var canvasAspect = canvasDim[Y] / canvasDim[X];

function draw()
{
    heatmapDimX = dataMatrix.length;
    scaleX = d3.scale.linear()
        .domain([0, heatmapDimX/400])
        .range([0, canvasDim[X]]);
    // calculate extents
    for (var s = 0; s < stats.length; s++) {
        switch(s) {
            case 0:
                stats[s].extent = getExtent(0,12);
                break;
            case 1:
                stats[s].extent = getExtent(13,25);
                break;
            case 2:
                stats[s].extent = getExtent(26,28);
                break;
        }
    }
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
            (canvasDim[Y] + 300*i + margin.top) + ")");

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
            .attr("class", "cell")
            .attr("id", "cell-"+i)
            .on("mousemove", function(){console.log("Moved!")});

        stats[i].cell = cell;

        stats[i].zoom = zoom;

        // This brush is for first heatmap only

        brush = d3.svg.brush()
            .x(scaleX)
            .y(scaleY)
            .on("brushstart", brushstart)
            .on("brush", brushmove)
            .on("brushend", brushend)

        //cell.call(brush);
        stats[i].brush = brush;
        cell.call(zoom);
        //cell.on("mousemove", mousemove);
    }

    drawAxes();
    drawLegend();
    drawDensityMap();
    drawButtons();
    drawLabels();
}

function drawLabels() {
    var div = d3.select("body").append("div").attr("id", "labels").style("position", "absolute").style("top", "950px");
    div.append("strong").text("Time:")
    div.append("text").attr("id", "lTime").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("Floor:")
    div.append("text").attr("id", "lFloor").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("Shear:")
    div.append("text").attr("id", "lShear").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("Moment:")
    div.append("text").attr("id", "lMoment").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("DiaF:")
    div.append("text").attr("id", "lDiaF").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
}

function drawButtons() {
    drawSwitchButton();
    drawPixelateButton();
    drawDensityScaleButton();
}

function drawDensityScaleButton() {
    denScaleButton = svg.append("g")
        .classed("button", true)
        .attr("cursor", "pointer")
        .on("mouseup", switchDensityScale)
        .attr("transform", "translate(1100,10)")

    denScaleButton.append("rect")
        .attr("x", 20)
        .attr("y", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 100)
        .attr("height", 20)
        .attr("fill","#d7d7d7")

    denScaleButton.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text("Scale: Log")
        .attr("fill", "black")
}

function drawPixelateButton() {
    pixButton = svg.append("g")
        .classed("button", true)
        .attr("cursor", "pointer")
        .on("mouseup", switchPixelation)
        .attr("transform", "translate(1000,10)")

    pixButton.append("rect")
        .attr("x", 20)
        .attr("y", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 100)
        .attr("height", 20)
        .attr("fill","#d7d7d7")

    pixButton.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text("Rendering: Smooth")
        .attr("fill", "black")
}

function switchPixelation() {
    pixelated = !pixelated;
    if (pixelated) {
        pixButton.select("text").text("Rendering: Pixelize")
    } else {
        pixButton.select("text").text("Rendering: Pixelize")
    }
    d3.selectAll(".cell").call(zoom);
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
        .attr("width", 100)
        .attr("height", 20)
        .attr("fill","#d7d7d7")

    switchButton.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text("Interaction: None")
        .attr("fill", "black")
}

function switchDensityScale() {
    useLogDensityScale = !useLogDensityScale;
    updateDensityMap();
    if (useLogDensityScale) denScaleButton.select("text").text("Scale: log");
    else denScaleButton.select("text").text("Scale: Linear");
}

function modeSwitch() {
    d3.select(brushCell).call(brush.clear());
    zoomEnabled = !zoomEnabled;
    if (zoomEnabled) {
        switchButton.select("text").text("Interaction: Zoom");
        d3.selectAll(".extent").remove();
        for (var i = 0; i < stats.length; i++) {
            stats[i].cell.call(brush.clear());
            stats[i].cell.on(".brush", null);
            stats[i].cell.call(stats[i].zoom);
        }
        brushExtent = [[0,0],[dataMatrix.length/400, F+1]];
        sm = sm_all;
        md = md_all;
        sd = sd_all;
        updateDensityMap();
    } else {

        switchButton.select("text").text("Interaction: Brush");
        d3.selectAll(".extent").remove();
        for (var i = 0; i < stats.length; i++) {
            stats[i].cell.on(".zoom", null);
            stats[i].cell.call(stats[i].brush);
            stats[i].cell.call(brush.clear());
        }
    }
    for (var i = 0; i < stats.length; i++) {
            stats[i].cell.on("mousemove", mousemove);
        }
    brushCell = null;
}

function createBinnedPlot(block,data,scale) {
    var rows = block.selectAll(".row").data(data).enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d,i) { return "translate(" + (densityDim/N * i ) + ",0)"; })

    rows.selectAll("rect").data(function(d){return d;}).enter().append("rect")
        .attr("y", function(d,i) { return i * (densityDim/N); })
        .attr("fill", function(d) { return scale(d+1); })
        .attr("width", densityDim/N)
        .attr("height", densityDim/N);
}

function updateBinnedPlot(block,data,scale) {
    var rows = block.selectAll(".row").data(data)

    rows.selectAll("rect").data(function(d){return d;})
        .transition()
        .attr("y", function(d,i) { return i * (densityDim/N); })
        .attr("fill", function(d) { return scale(d+1); })
        .attr("width", densityDim/N)
        .attr("height", densityDim/N);

}


function updateDensityMap() {
    // calculate max count
    maxs = [-Infinity,-Infinity,-Infinity];
    for(var x = 0; x < N; x++) {
        for(var y = 0; y < N;y++) {
            maxs[0] = Math.max(sm[x][y],maxs[0]);
            maxs[1] = Math.max(sd[x][y],maxs[1]);
            maxs[2] = Math.max(md[x][y],maxs[2]);
        }
    }
    densityScales = [];
    for (var i = 0; i < 3; i++) {
        if (useLogDensityScale) {
            if (maxs[i] > 1000) {
                densityScales.push(d3.scale.log().base(10)
                .domain([1, 100, maxs[i]])
                .range(["#efedf5","#9ebcda","#8856a7"]))
            } else {
                densityScales.push(d3.scale.log().base(10)
                .domain([1, Math.sqrt(maxs[i]),maxs[i]])
                .range(["#efedf5","#9ebcda","#8856a7"]))
            }
        } else {
            if (maxs[i] > 200) {
                densityScales.push(d3.scale.linear().domain([1,100,maxs[i]]).range(["#efedf5","#9ebcda","#8856a7"]));
            } else {
                densityScales.push(d3.scale.linear().domain([1,maxs[i]/2,maxs[i]]).range(["#efedf5","#9ebcda","#8856a7"]));
            }
        }
    }
    updateBinnedPlot(smdm,sm,densityScales[0]);
    updateBinnedPlot(sddm,sd,densityScales[1]);
    updateBinnedPlot(mddm,md,densityScales[2]);

    for (var i = 0; i < 3; i++) {
        var maxLog = Math.log10(maxs[i]);
        var legendScale = densityScales[i].domain([1, maxs[i]]).range([200,0]);
        d3.selectAll("density-legend-"+i).selectAll("rect")
            .attr("fill", function(d) { return densityScales[i](d+1); });
        var legendAxis = d3.svg.axis().scale(legendScale).orient("right")
            .ticks(10)
        d3.select("#density-legend-"+i).select(".lAxis").call(legendAxis).transition();
    }
}

function drawDensityMap() {
    // calculate max count
    maxs = [-Infinity,-Infinity,-Infinity];
    for(var x = 0; x < N; x++) {
        for(var y = 0; y < N;y++) {
            maxs[0] = Math.max(sm[x][y],maxs[0]);
            maxs[1] = Math.max(sd[x][y],maxs[1]);
            maxs[2] = Math.max(md[x][y],maxs[2]);
        }
    }

    densityScales = [];
    for (var i = 0; i < 3; i++) {
        if (maxs[i] > 1000) {
            densityScales.push(d3.scale.log().base(10)
            .domain([1, 100, maxs[i]])
            .range(["#efedf5","#9ebcda","#8856a7"]))
        } else {
            densityScales.push(d3.scale.log().base(10)
            .domain([1, maxs[i]])
            .range(["#efedf5", "#8856a7"]))
        }
    }

    smdm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 75)");
    sddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 375)");
    mddm = d3.select("svg").append("g")
        .classed("densityMap", true)
        .attr("transform", "translate(1100, 675)");


    createBinnedPlot(smdm,sm,densityScales[0]);
    createBinnedPlot(sddm,sd,densityScales[1]);
    createBinnedPlot(mddm,md,densityScales[2]);

    drawDensityAxis(smdm);
    drawDensityAxis(sddm);
    drawDensityAxis(mddm);

    for (var i = 0; i < 3; i++) {
        var maxLog = Math.log10(maxs[i]);
        var legendData = [];
        for (var j = 1; j < 100; j++) {
            legendData.push(Math.pow(10, (maxLog * j / 100)));
        }
        var legendScale = d3.scale.log().base(10).range([200,0])
                            .domain([1, maxs[i]]);
        var legend = d3.select("svg").append("g").classed("legend", true)
            .attr("id","density-legend-"+i)
            .attr("transform", "translate(" + (heatmapWidth+50) + "," + (30+300 * i) + ")" )

        legend.selectAll("rect").data(legendData).enter().append("rect")
            .attr("x",75)
            .attr("y",50)
            .attr("width", 20)
            .attr("height", function(d) { return(legendScale(d)); })
            .attr("fill", function(d) { return densityScales[i](d+1); });

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
        //dataList = loadCSV("all.csv");
        brushExtent = [[0,0],[dataMatrix.length, F]];
        prepareDensityMap();
        draw();
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
    var a = [];
    for (var i = 0; i < dataMatrix.length; i++)
        for (var j = startCol; j <= endCol; j++) {
            a.push(dataMatrix[i][j]);
        }
    return d3.extent(a, function(d){return d;});
}

function drawHeatmap(i) {
    heatmapAspect = heatmapDimY / heatmapDimX;
    scaleY = d3.scale.linear()
        .domain([0, heatmapDimY])
        .range([canvasDim[Y],0]);
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
    console.log(canvas)
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
    console.log(heatmapDimX)
    console.log(heatmapDimY)
    var image = context.createImageData(heatmapDimX, heatmapDimY);
    for (var y = heatmapDimY-1, p = -1; y >= 0; --y) {
        for (var x = 0; x < heatmapDimX; ++x) {
            switch(i) {
                case 0:
                    var c = d3.rgb(colorScale(dataMatrix[x][y]));
                    break;
                case 1:
                    var c = d3.rgb(colorScale(dataMatrix[x][y+F]));
                    break;
                case 2:
                    var c = d3.rgb(colorScale(dataMatrix[x][y+2*F]));
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
}

function drawAxes() {
    for (var i = 0; i < stats.length; i++) {
        stats[i].axisElement.call(stats[i].xAxis);
    }
}

function zoomEvent() {
    //console.log("zoomed")
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
        console.log(t);
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
        console.log(it[X],n[X]);
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
    var iStart = 0, iEnd = dataMatrix.length - 1;
    var jStart = 0, jEnd = F - 1;
    if (!zoomEnabled) {
        iStart = Math.ceil(brushExtent[0][X] * 400);
        iEnd = Math.ceil(brushExtent[1][X] * 400)-1;
        jStart = brushExtent[0][Y];
        jEnd = brushExtent[1][Y] - 1;
    }
    console.log([iStart,iEnd,jStart,jEnd]);
    console.log(dataMatrix.length)
    for (var i = iStart; i <= iEnd; i++) {
        for (var j = jStart; j <= jEnd; j++) {
            var s = Math.floor((parseFloat(dataMatrix[i][j]) + 6) * N / 12);
            var m = Math.floor((parseFloat(dataMatrix[i][j+F]) + 6) * N / 12);
            var d = Math.floor((parseFloat(dataMatrix[i][j+2*F]) + 6) * N / 12);
            sm[s][m]++;
            sd[s][d]++;
            md[m][d]++;
            //console.log([s,m,d])
        }
    }
    console.log("calculation completed...")

    // save the overall heatmap for quick redraw
    if (!prepareDensityMapCalled) {
        sm_all = sm;
        sd_all = sd;
        md_all = md;
        prepareDensityMapCalled = true;
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
    if (zoomEnabled) {
        d3.select(brushCell).call(brush.clear());
    }
    if (brushCell !== this) {
        d3.select(brushCell).call(brush.clear());
        brushCell = this;
    } else {
    }
}

// Highlight the selected circles.
function brushmove(p) {
    if (!zoomEnabled){
        brushExtent = brush.extent();
        // if dragged, preserve the width of the box
        if (d3.event.mode === "move") {
            var ey = brushExtent[0][Y] = Math.round(brushExtent[0][Y]);
            brushExtent[1][Y] = ey + Math.round((brushExtent[1][Y] - brushExtent[0][Y]));
            brushExtent[0][Y] = ey;
        } else {
            brushExtent[0][Y] = Math.round(brushExtent[0][Y]);
            brushExtent[1][Y] = Math.round(brushExtent[1][Y]);
        }
        console.log(brushExtent);
        d3.select(brushCell).call(brush.extent(brushExtent));
    } else {
        d3.select(brushCell).call(brush.clear());
    }
}

function brushend(p) {
    drawAxes();
    if (brush.empty()) {
        brushExtent = [[0,0],[dataMatrix.length/400, F+1]];
        prepareDensityMap();
        updateDensityMap();
    }
    if (zoomEnabled) d3.select(brushCell).call(brush.clear());
    else {
        prepareDensityMap();
        updateDensityMap();
    }
}

function mousemove() {
    var mousePos = d3.mouse(this);
    var exactTime = scaleX.invert(mousePos[X]);
    var frame = Math.max(0,Math.ceil(exactTime * 400)-1);
    var floor = Math.max(0,Math.floor(scaleY.invert(mousePos[Y])));
    var shear = dataMatrix[frame][floor];
    var moment = dataMatrix[frame][floor+13];
    var diaF = dataMatrix[frame][floor+26];

    d3.select("#lTime").text(frame/400+" sec (timestep: " + frame + ")");
    d3.select("#lFloor").text(floor);
    d3.select("#lShear").text(shear);
    d3.select("#lMoment").text(moment);
    d3.select("#lDiaF").text(diaF);
}