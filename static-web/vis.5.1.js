var N = 100; // The Size of Bin
var densityDim;
var interactions = ['Zoom','Brush'];

var prepareDensityMapCalled = false;
var densityScales = ['Linear', 'Log'];

var floorFilter = true, timeFilter = true;

var margin = {top: 25, right: 50, bottom: 25, left: 30};

var screenWidth = $(window).width();
var screenHeight = $(window).height();

var numTSPlots = 0;

var DUR_FAST = 750, DUR_MID = 1000;

var tsDivs = [];
var currentSim = null;

$('body').append("<div id='leftDiv'></div>");
$('body').append("<div id='rightDiv'></div>");
var leftDiv = d3.select("#leftDiv")
                .style("max-width", "50%");
var rightDiv = d3.select("#rightDiv")
                .style("max-width", "50%");

eqs = {
    data:[],
    sims:[],
    count:function(){return this.data.length;},
    updateMaxLength:function(){
        var max = 0;
         for (var i = 0; i < this.count(); i++) {
            max = Math.max(max,this.data[i].length);
        }
        this.maxLength = max;
    },
    updateMaxStrength:function(){
        var maxStrength = 0;
        for (var i = 0; i < this.count(); i++) {
            var extent = d3.extent(this.data[i], function(d) {return d;});
            var strength = Math.max(-extent[0],extent[1]);
            maxStrength = Math.max(strength,maxStrength);
        }
        this.maxStrength = maxStrength;
    },
    maxStrength:0,
    maxLength:0,
    add: function(eq) {
        // eq shoyld be an array
        this.data.push(eq);
        this.sims.push([]);
        this.updateMaxLength();
        this.updateMaxStrength();
        d3.select("#eqSelection").selectAll("option").data(eqs.data).enter()
                                 .append("option").attr("value", function(d,i){return i;})
                                 .text(function(d,i){return i;})
    },
    remove: function(i) {
        this.data.remove(i);
        this.sims.remove(i);
        this.updateMaxLength();
        this.updateMaxStrength();
    },
    addSim: function(i,s) {
        this.sims[i].push(s);
    }
}

function sim(eid,numStory) {
    this.eid = eid;
    this.numStory = numStory;
    this.ts = {};
    this.addTimeseries = function(ts) {
        // check legibility
        if (this.numStory == ts.numStory) {
            ts.betweenStories = false;
        } else if (this.numStory == (ts.numStory+1)) {
            ts.betweenStories = true;
        } else {
            alert("Story number doesn't match with the simulation!");
            return;
        }
        if (eqs.data[eid].length != ts.length) {
            alert("Duration doesn't match with the simulation!");
            return;
        }
        this.ts[ts.name] = ts;
    }

}
//console.log(screenHeight);
var eqPlotDiv = leftDiv.append("div")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3/3)
                    .attr("id","EQPlotDiv")
                    .attr("class", "container")

var areaPlotDiv = leftDiv.append("div")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3/3*2)
                    .attr("id","areaPlotDiv")
                    .attr("class", "container")

var tsPlotsDiv = leftDiv.append("div")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3*2)
                    .attr("id","TSPlotsDiv")
                    .attr("class", "container")


var eqPlot = eqPlotDiv.append("svg")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3/3)
                    .attr("id","EQPlot")

var areaPlot = areaPlotDiv.append("svg")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3/3*2)
                    .attr("id","AreaPlot")

var infoDiv = rightDiv.append("div")
                      .attr("width", screenWidth/2)
                      .attr("height", screenHeight/3)
                      .attr("id","InfoDiv")

var scatterDiv = rightDiv.append("div")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3*2)
                    .attr("id","scatterDiv")
                    .attr("class", "container")

var spWidth = screenWidth/2 - margin.left - margin.right;
var spHeight = screenHeight/3*2 - margin.top - margin.bottom;

var spSize = Math.min(spWidth,spHeight);
spWidth = spSize;
spHeight = spSize;

var tsWidth = screenWidth/2 - margin.left - margin.right;
var tsHeight =  screenHeight/3 - margin.top - margin.bottom;
var eqHeight = screenHeight/9 - margin.top - margin.bottom;
var areaHeight = screenHeight/9*2 - margin.top - margin.bottom;
var X = 0, Y = 1;

var canvasDim = [tsWidth, tsHeight];
var canvasAspect = canvasDim[Y] / canvasDim[X];

var scaleLeftXDynamic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
var scaleLeftXStatic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
var scaleEqStr = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([eqHeight,0]);
var scaleEqStrZoomed = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([areaHeight,0]);
var scaleEqColor = d3.scale.category20c();

var eqBrush = d3.svg.brush().x(scaleLeftXStatic).on("brush", eqBrushed);
var zoom = d3.behavior.zoom()
             .on("zoom", zoomEvent)
             .x(scaleLeftXStatic)
             .scaleExtent([1,1000]);

draw();
loadEQ("data/EQnew7.txt");

var linearStatic = d3.svg.line()
    .interpolate("linear")
    .x(function(d,i) { return scaleLeftXStatic(i/400); })
    .y(function(d,i) { return scaleEqStr(d); });

var linearDynamic = d3.svg.line()
    .interpolate("linear")
    .x(function(d,i) { return scaleLeftXDynamic(i/400); })
    .y(function(d,i) { return scaleEqStrZoomed(d); });

$(window).resize(function(){
    screenWidth = $(window).width();
    screenHeight = $(window).height();
    console.log(screenHeight)
    eqPlot.attr("width", screenWidth/2).attr("height", screenHeight/3/3);
    infoDiv.attr("width", screenWidth/2).attr("height", screenHeight/3);
    tsWidth = screenWidth/2 - margin.left - margin.right;
    updateDimensions(); // this will update tsHeight
    eqHeight = screenHeight/9 - margin.top - margin.bottom;
    canvasDim = [tsWidth, tsHeight];
    canvasAspect = canvasDim[Y] / canvasDim[X];
    scaleLeftXStatic.range([0,tsWidth]);
    scaleLeftXDynamic.range([0,tsWidth]);
    scaleEqStr.range([eqHeight,0]);
    scaleEqStrZoomed.range([areaHeight,0]);
    redraw();
});

function redraw() {
    updateEqPlot(eqPlot);
    updateAreaPlot(areaPlot);
    updateTimeseries();
}

function draw() {
    drawEqPlot(eqPlot);
    drawAreaPlot(areaPlot);
    drawAreaPlotControl(areaPlotDiv,areaPlot);
    drawControlPanel(rightDiv);
}

function addSim() {
    /*
    This is hardcoded for the initial dataset
    */
    var s = new sim(0,13);
    eqs.addSim(0,s);
    timeseries("shear","data/shear13.json",0,s);
    timeseries("moment","data/moment.json",0,s);
    timeseries("diaphram force", "data/diaF.json", 0,s);
    timeseries("acceleration", "data/Diaccel.json",0,s);
    timeseries("acceleration/PGA","data/DiaAcc_dividedby_PGA.json",0,s);
    timeseries("drift ratio","data/DriftRatio.json",0,s);
    timeseries("interstory drift ratio", "data/InterstoryDriftRatio.json",0, s);
    currentSim = s;
    areaPlot.addAttr.attr("disabled", null);
    areaPlot.addSim.attr("disabled", "true");
}

function loadEQ(file) {
    $.get(file,function(txt){
        var lines = txt.split("\n");
        var data = [];
        var max = 0;
        for (var i = 0, len = lines.length; i < len; i++) {
            data.push(parseFloat(lines[i].replace(/^\s+|\s+$/g, '')));
            max = Math.max(max,Math.abs(data[i]))
        }
        eqs.add(data)
        scaleLeftXStatic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
        scaleLeftXDynamic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
        scaleEqStr = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([eqHeight,0]);
        scaleEqStrZoomed = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([areaHeight,0]);
        zoom.x(scaleLeftXDynamic);
        eqBrush.x(scaleLeftXStatic);
        updateEqPlot(eqPlot);
        updateAreaPlot(areaPlot);
    });
}

/* ==================================================
||
||  Control UIs
||
================================================== */

function drawAreaPlotControl(div,svg) {
    svg.controller = div.append("div").classed("controller", true)
                        .style("left", margin.left + "px");
    svg.controller.append("label").attr("for","eqSelection").text("EQ: ")
    svg.eqSelection = svg.controller.append("select").attr("id","eqSelection");
    svg.addAttr = svg.controller.append("button").attr("id","addAttrBtn").attr("disabled","true");
    svg.addAttr.text("Add Plot").on("click",newTimeseries)
    svg.addSim = svg.controller.append("button").attr("id", "addSim").on("click",addSim);
    svg.addSim.text("Add Simulation")
}

function drawTimeseriesControl(div,svg) {
    svg.controller = div.append("div").classed("controller", true)
                        .style("left", margin.left + "px");
    svg.controller.append("label").text("Sim: ")
    svg.simSelection = svg.controller.append("select").attr("class","simSelection")

    /* attr selection */
    var keys = [];
    for(var k in currentSim.ts) keys.push(k);
    svg.controller.append("label").text(" Attr: ")
    svg.attrSelection = svg.controller.append("select").attr("class","attrSelection");
    svg.attrSelection.selectAll("option").data(keys).enter()
                     .append("option").attr("value", function(d,i){return d;})
                     .attr("selected", function(d){ return (d == "diaphram force") ? "selected" : null; })
                     .text(function(d,i){return d;})
    svg.attrSelection.on("change", function(){
        updateTimeseriesPlot(div,this.options[this.selectedIndex].value);
    });
    svg.controller.append("label").text(" Color Scale: ");

    /* color selection */
    keys = [];
    for(var k in currentSim.ts[svg.attr].colors) { keys.push(k); }
    svg.colorSelection = svg.controller.append("select").attr("class", "colorSelection").on("change", function(){
        svg.curColor = this.options[this.selectedIndex].value;
        svg.curColorScale = svg.curColor + "+" + svg.curScale;
        console.log(svg.curColorScale);
        updateTimeseriesPlot(div);
    });
    svg.colorSelection.selectAll("option").data(keys).enter()
                     .append("option").attr("value", function(d,i){return currentSim.ts[svg.attr].colors[d].value;})
                     .attr("selected", function(d){ return (d == "RedYelBlu") ? "selected" : null; })
                     .text(function(d,i){return d;})

    /* scale selection */
    keys = [];
    for(var k in currentSim.ts[svg.attr].scales) { keys.push(k); }
    svg.scaleSelection = svg.controller.append("select").attr("class", "scaleSelection").on("change", function(){
        svg.curScale = this.options[this.selectedIndex].value;
        svg.curColorScale = svg.curColor + "+" + svg.curScale;
        console.log(svg.curColorScale);
        updateTimeseriesPlot(div);
    });
    svg.scaleSelection.selectAll("option").data(keys).enter()
                     .append("option").attr("value", function(d,i){return currentSim.ts[svg.attr].scales[d].value;})
                     .attr("selected", function(d){ return (d == "Linear (MAX 1 0)") ? "selected" : null; })
                     .text(function(d,i){return d;})
    svg.removeBtn = svg.controller.append("button").text("Remove").on("click",function(){
        div.remove();
        numTSPlots--;
        updateDimensions();
        updateTimeseries();
    });
}

function drawControlPanel(div) {
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

/* ==================================================
||
||  Timeseries
||
================================================== */

function Scale(value,scale,domain,length) {
    this.value = value;
    this.scale = scale;
    this.domain = domain;
    this.length = length;
}

function Color(name,color) {
    this.name = name;
    this.color = color;
}


function timeseries(name,path,eid,sim) {
    var ts = {}
    d3.json(path, function(error, data) {
        if (error) {
            alert("Unable to open " + path + ": " + error);
            return;
        }
        ts.name = name;
        ts.path = path;
        ts.eid = eid;
        ts.data = data;
        ts.numStory = data[0].length;

        ts.length = eqs.data[eid].length;
        if (ts.length != ts.data.length) {
            alert(name + " lengths doesn't match!");
        }
        var a = [];
        for (var i = 0; i < ts.length; i++) {
            for (var j = 0; j <= ts.numStory; j++) {
                a.push(ts.data[i][j]);
            }
        }
        ts.extent = d3.extent(a, function(d){ return d; });
        var min = ts.extent[0];
        var max = ts.extent[1];
        var absMax = Math.max(-min,max);
        ts.absMax = absMax;
        ts.colorScales = {
            /*
            "RedYelBlu+M10_Linear":d3.scale.linear().domain([-absMax,-1,0,1,absMax]).range(colorbrewer.RdYlBu[5]),
            "RedWhtBlu+M10_Linear":d3.scale.linear().domain([-absMax,-1,0,1,absMax]).range(colorbrewer.RdBu[5]),

            "RedYelBlu+.5_1_Threshold":d3.scale.threshold().domain([-1,-0.5,0.5,1]).range(colorbrewer.RdYlBu[5]),
            "RedWhtBlu+.5_1_Threshold":d3.scale.threshold().domain([-1,-0.5,0.5,1]).range(colorbrewer.RdBu[5])
            */
        }
        ts.colors = {
            "RedYelBlu" : new Color("RdYlBu", colorbrewer.RdYlBu),
            "RedWhtBlu" : new Color("RdBu", colorbrewer.RdBu),
            "PurWhtOrg" : new Color("PuOr", colorbrewer.PuOr),
            "BrnWhtGre" : new Color("BrBG", colorbrewer.BrBG),
            "PnkWhtGre" : new Color("PiYG", colorbrewer.PiYG),
        }

        ts.scales = {
            "Linear (Max 0)" : new Scale("LM0", d3.scale.linear(), [-absMax,-absMax/2,0,absMax/2,absMax], 5),
            "Linear (MAX 1 0)" : new Scale("LM10", d3.scale.linear(), [-absMax,-1,0,1,absMax], 5),
            "Threshold (1 0.5)" : new Scale("T1.5", d3.scale.threshold(), [-1,-0.5,0.5,1], 5),
            "Threshold (1)" : new Scale("T1", d3.scale.threshold(), [-1,-1,0,1,1], 5),
        }

        /* populate colorscales */
        for (var ck in ts.colors) {
            for (var sk in ts.scales) {
                var c = ts.colors[ck];
                var s = ts.scales[sk];
                ts.colorScales[c.value+"+"+s.value] = s.scale.copy().domain(s.domain).range(c.color[s.length]);
            }
        }

        /* create image object */
        ts.images = {}
        ts.imageObjs = {}
        var canvas = {}
        var context = {}
        for (var key in ts.colorScales) {
            canvas[key] = document.createElement('canvas');
            canvas[key].width = ts.length;
            canvas[key].height = ts.numStory;
            context[key] = canvas[key].getContext('2d');
            ts.images[key] = context[key].createImageData(ts.length, ts.numStory);
            ts.imageObjs[key] = new Image(ts.length, ts.numStory);

            for (var y = ts.numStory-1, p = -1; y >= 0; --y) {
                for (var x = 0; x < ts.length; ++x) {

                    var c = d3.rgb(ts.colorScales[key](ts.data[x][y]));
                    ts.images[key].data[++p] = c.r;
                    ts.images[key].data[++p] = c.g;
                    ts.images[key].data[++p] = c.b;
                    ts.images[key].data[++p] = 255;

                }
            }

            context[key].putImageData(ts.images[key],0,0);
            ts.imageObjs[key].src = canvas[key].toDataURL();
        }
        //ts.img = image;
        //context.putImageData(image,0,0);
        //imageObj.src = canvas.toDataURL();
        //ts.imageObj = imageObj;
        ts.imageDim = [ts.length, ts.numStory];
        sim.addTimeseries(ts);
        console.log(name + " Done!");
    });
}

function newTimeseries() {
    numTSPlots++;
    updateDimensions();
    var div = tsPlotsDiv.append("div").attr("width",screenWidth/2).attr("height", tsSVGHeight)
                .attr("class", "container");

    div.tsCanvas = div.append("canvas")
                    .attr("width", tsWidth)
                    .attr("height", tsHeight)
                    .style("width", tsWidth + "px")
                    .style("height", tsHeight + "px")
                    .style("position", "absolute")

    //console.log(screenWidth/2 + "," + tsSVGHeight);
    div.tsPlot = div.append("svg")
                    .attr("width", screenWidth/2)
                    .attr("height", tsSVGHeight)
                    .attr("class","timeseriesPlot")
                    .style("position", "relative")
    updateTimeseries();
    drawTimeseriesPlot(div,"diaphram force");
    drawTimeseriesControl(div,div.tsPlot);
    tsDivs.push(div);
}

function updateTimeseries() {
    for (var td in tsDivs) {
        tsDivs[td].select("canvas").attr("width", tsWidth).attr("height", tsHeight);
        tsDivs[td].select("svg").attr("width", screenWidth/2).attr("height", tsSVGHeight)
        updateTimeseriesPlot(tsDivs[td]);
    }
}

function updateDimensions() {
    tsSVGHeight = screenHeight/3;
    if(numTSPlots > 2) {
        tsSVGHeight = screenHeight/3 * 2/numTSPlots - 1;
    }
    tsHeight = tsSVGHeight - (margin.top+margin.bottom);
}



/* ==================================================
||
||  Plots
||
================================================== */

function drawEqPlot(svg) {
    svg.plot = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.xAxis = d3.svg.axis().scale(scaleLeftXStatic).orient("bottom");
    svg.yAxis = d3.svg.axis().scale(scaleEqStr)
                  .orient("left").innerTickSize(-tsWidth)
                  .outerTickSize(0).tickPadding(10);
    svg.plot.append("g").attr("class", "xAxis axis")
            .call(svg.xAxis).attr("transform", "translate(0,"+eqHeight+")");
    svg.xLabel = svg.select(".xAxis").append("text")
          .attr("class", "label")
          .attr("x", tsWidth+margin.right)
          .attr("y", margin.bottom)
          .style("text-anchor", "end")
          .text("time (sec)")
          //.attr("transform", "translate("+(tsWidth-25)+",25)");
    svg.plot.append("g").attr("class", "yAxis axis").call(svg.yAxis);
    svg.yLabel = svg.select(".yAxis").append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 0)
          .style("text-anchor", "left")
          .text("Earthquake Accelaration (G)")
          .attr("transform", "translate(-10,-10)");
    svg.baseline = svg.plot.append("line")
        .attr("x1", 0)
        .attr("y1", scaleEqStr(0))
        .attr("x2", tsWidth)
        .attr("y2", scaleEqStr(0))
        .style("stroke-width","1")
        .style("stroke","black")
    svg.pane = svg.append("g").attr("class", "brush")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(eqBrush);
    svg.select(".background").style("pointer-events", "none");
    svg.pane.selectAll("rect").attr("height",eqHeight);
}

function updateEqPlot(svg) {
    svg.select(".xAxis").attr("transform", "translate(0,"+eqHeight+")");
    svg.xAxis = d3.svg.axis().scale(scaleLeftXStatic).orient("bottom");
    svg.yAxis = d3.svg.axis().scale(scaleEqStr)
                  .orient("left").innerTickSize(-tsWidth)
                  .outerTickSize(0).tickPadding(10).ticks(5);
    svg.select(".xAxis").transition().duration(DUR_MID).call(svg.xAxis);
    svg.select(".yAxis").transition().duration(DUR_MID).call(svg.yAxis);
    svg.baseline.transition().duration(DUR_MID)
        .attr("y1", scaleEqStr(0))
        .attr("y2", scaleEqStr(0))
        .attr("x2", tsWidth);
    var lines = svg.plot.selectAll(".eqLine").data(eqs.data);
    lines.enter().append("path")
        .classed("eqLine", true)

    lines.attr("d", function(d){ return linearStatic(d); })
        .style("stroke", function(d,i) {return scaleEqColor(i);})
        .style("fill","none");
    var totalLength = lines.node().getTotalLength();
    lines.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(DUR_FAST)
        .attr("stroke-dashoffset", 0);
    svg.xLabel.attr("x", tsWidth+margin.right)
          .attr("y", margin.bottom).transition().duration(DUR_MID);
    svg.pane.selectAll("rect").attr("height",eqHeight);
    svg.yLabel.attr("x", 0).attr("y", 0).transition().duration(DUR_MID);
}

function drawAreaPlot(svg) {
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", tsWidth)
        .attr("height", areaHeight);
    svg.area = d3.svg.area().interpolate("linear");
    svg.plot = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.plot.append("path").attr("class","area");
    svg.area.x(function(d,i) { return scaleLeftXDynamic(i/400); })
            .y0(function(d) { return scaleEqStrZoomed(0); })
            .y1(function(d) { return scaleEqStrZoomed(d); })
    svg.xAxis = d3.svg.axis().scale(scaleLeftXDynamic).orient("bottom");
    svg.yAxis = d3.svg.axis().scale(scaleEqStrZoomed)
                  .orient("left").innerTickSize(-tsWidth)
                  .outerTickSize(0).tickPadding(10);
    svg.plot.append("g").attr("class", "xAxis axis")
            .call(svg.xAxis).attr("transform", "translate(0,"+areaHeight+")");
    svg.xLabel = svg.select(".xAxis").append("text")
          .attr("class", "label")
          .attr("x", tsWidth+margin.right)
          .attr("y", margin.bottom)
          .style("text-anchor", "end")
          .text("time (sec)")
    svg.plot.append("g").attr("class", "yAxis axis").call(svg.yAxis);
    svg.pane = svg.append("svg:rect").classed("pane", true)
                  .attr("width", tsWidth)
                  .attr("height", areaHeight)
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                  .call(zoom);
}

function updateAreaPlot(svg) {
    svg.select("#clip").select("rect").attr("width", tsWidth)
        .attr("height", areaHeight);
    svg.select(".xAxis").attr("transform", "translate(0,"+areaHeight+")");
    svg.xAxis = d3.svg.axis().scale(scaleLeftXDynamic).orient("bottom");
    svg.yAxis = d3.svg.axis().scale(scaleEqStrZoomed)
                  .orient("left").innerTickSize(-tsWidth)
                  .outerTickSize(0).tickPadding(10).ticks(9);
    svg.select(".xAxis").transition().duration(DUR_MID).call(svg.xAxis);
    svg.select(".yAxis").transition().duration(DUR_MID).call(svg.yAxis);
    var a = svg.select(".area")
        .datum(eqs.data[$("#eqSelection").val()]).attr("d",svg.area);
    svg.xLabel = svg.select(".xAxis").select(".label")
          .attr("x", tsWidth+margin.right)


}

function drawTimeseriesPlot(div,attr) {
    var svg = div.tsPlot;
    svg.curColor = "RedYelBlu"
    svg.curScale = "M10_Linear"
    svg.curColorScale = "RedYelBlu+M10_Linear";
    var canvas = div.tsCanvas;
    svg.attr = attr || svg.attr;
    svg.plot = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var timeseries = currentSim.ts[svg.attr];
    svg.xAxis = d3.svg.axis().scale(scaleLeftXDynamic).orient("bottom");
    svg.yScale = d3.scale.linear().domain([0, timeseries.numStory]).range([tsHeight,0]);
    svg.yAxis = d3.svg.axis().scale(svg.yScale).orient("left");
    canvas.attr("width", timeseries.length).attr("height",timeseries.numStory);
    var context = canvas.node().getContext("2d");
    //var img = timeseries.img;
    //context.putImageData(img, 0, 0);
    svg.plot.append("g").attr("class", "xAxis axis")
            .call(svg.xAxis).attr("transform", "translate(0,"+tsHeight+")");
    svg.plot.append("g").attr("class", "yAxis axis").call(svg.yAxis);
    svg.brush = d3.svg.brush().x(scaleLeftXDynamic).y(svg.yScale).on("brush", tsBrushed);
    context.canvas.width = tsWidth;
    context.canvas.height = tsHeight;
    context.clearRect(0, 0, canvasDim[X], canvasDim[Y]);
    var d = scaleLeftXDynamic.domain();
    var e = d.map(function (v,i) { return Math.ceil(v * 400)});
    context.drawImage(timeseries.imageObjs[svg.curColorScale], e[0], 0, e[1]-e[0], timeseries.numStory, 0, 0, tsWidth,tsHeight);

    svg.legend = svg.append("g").classed("legend", true).attr("transform", "translate(" + (tsWidth+margin.left+10) + "," + (tsHeight/4+margin.top) + ")");
    svg.legendData = [];
    var colorScale = timeseries.colorScales[svg.curColorScale];
    var step = (timeseries.absMax * 2)/100;
    for (var i = 0; i < 100; i++) {
        svg.legendData.push(-timeseries.absMax + step * i);
    }

    svg.legendScale = d3.scale.linear().range([0, tsHeight/2]).domain([-timeseries.absMax, timeseries.absMax]);
    svg.legend.selectAll("rect").data(svg.legendData).enter().append("rect")
        .attr("x",0).attr("y",function(d){ svg.legendScale(d); }).attr("width",10)
        .attr("height", function(d){ return tsHeight/2 - svg.legendScale(d); })
        .attr("fill", function(d) { return timeseries.colorScales[svg.curColorScale](d) })
    svg.legendAxis = d3.svg.axis().scale(svg.legendScale).orient("right");
    svg.legend.append("g").attr("class", "axis lAxis")
        .attr("transform", "translate(10,0)")
        .call(svg.legendAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 0)
          .style("text-anchor", "end")

    svg.pane = svg.append("g").attr("class", "brush")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("width",tsWidth).attr("height", tsHeight)
        .style("pointer-event", "all")
        .call(svg.brush).on("mousemove", function(){ mouseoverTimeseries(svg, this); });
}

function updateTimeseriesPlot(div,attr) {
    console.log(tsHeight);
    div.attr("width",tsWidth).attr("height",tsHeight);
    var svg = div.tsPlot;
    var canvas = div.tsCanvas;
    svg.attr = attr || svg.attr;
    var timeseries = currentSim.ts[svg.attr];
    svg.xAxis = d3.svg.axis().scale(scaleLeftXDynamic).orient("bottom");
    svg.yScale = d3.scale.linear().domain([0, timeseries.numStory]).range([tsHeight,0]);
    svg.yAxis = d3.svg.axis().scale(svg.yScale).orient("left");
    canvas.attr("width", timeseries.length).attr("height",timeseries.numStory);
    svg.select(".xAxis").attr("transform", "translate(0,"+tsHeight+")");
    canvas.style("width",null).style("height",null);
    canvas.node().width = tsWidth;
    canvas.node().height = tsHeight;
    svg.select(".xAxis").call(svg.xAxis);
    svg.select(".yAxis").call(svg.yAxis);

    var context = canvas.node().getContext("2d");

    var step = (timeseries.absMax * 2)/100;
    svg.legendData = [];
    for (var i = 0; i < 100; i++) {
        svg.legendData.push(-timeseries.absMax + step * i);
    }

    svg.legend.attr("transform", "translate(" + (tsWidth+margin.left+10) + "," + (tsHeight/4+margin.top) + ")");
    svg.legendScale.range([0, tsHeight/2]).domain([-timeseries.absMax, timeseries.absMax]);
    svg.selectAll("rect").data(svg.legendData)
        .attr("x",0).attr("y",function(d){ svg.legendScale(d); }).attr("width",10)
        .attr("height", function(d,i){ return tsHeight/2 - svg.legendScale(d); })
        .attr("fill", function(d) { return timeseries.colorScales[svg.curColorScale](d) })
    svg.legendAxis = d3.svg.axis().scale(svg.legendScale).orient("right");
    svg.legend.select(".lAxis").call(svg.legendAxis);
    svg.pane.attr("width",tsWidth).attr("height", tsHeight)

    context.canvas.width = tsWidth;
    context.canvas.height = tsHeight;
    context.clearRect(0, 0, canvasDim[X], canvasDim[Y]);

    var dom = scaleLeftXDynamic.domain();
    var e = dom.map(function (v,i) { return Math.ceil(v * 400)});
    context.drawImage(timeseries.imageObjs[svg.curColorScale], e[0], 0, e[1]-e[0], timeseries.numStory, 0, 0, tsWidth,tsHeight);
    svg.pane.attr("width",tsWidth).attr("height", tsHeight);

}

function drawScatterPlot(svg) {
    svg.plot = svg.append("svg")
}

/* ==================================================
||
||  Event Handlers
||
================================================== */

function eqBrushed() {
    // diable brush
    /*
    var d = eqBrush.empty() ? scaleLeftXStatic.domain() : eqBrush.extent();
    d[0] = Math.max(scaleLeftXStatic.domain()[0],d[0]);
    d[1] = Math.min(scaleLeftXStatic.domain()[1],d[1]);
    scaleLeftXDynamic.domain(d);
    areaPlot.select(".area").attr("d",areaPlot.area);
    areaPlot.select(".xAxis").call(areaPlot.xAxis);
    updateTimeseries();
    zoom.x(scaleLeftXDynamic);
    */
}

function tsBrushed() {

}

function zoomEvent() {
    var s = d3.event.scale;
    var n = eqs.maxLength * s;
    var x = d3.event.translate[X];
    var t = Math.min(0,Math.max(x,tsWidth - n / (eqs.maxLength / tsWidth)));
    zoom.translate([t,0]);
    zoom.scale(s);
    areaPlot.select(".area").attr("d",areaPlot.area);
    areaPlot.select(".xAxis").call(areaPlot.xAxis);
    eqBrush.extent(scaleLeftXDynamic.domain());
    eqPlot.select(".brush").call(eqBrush);
    eqPlot.select(".resize").style("pointer-events", "none");
    eqPlot.select(".extent").style("pointer-events", "none");
    updateTimeseries();
}

function mouseoverTimeseries(svg, event) {
    var mousePos = d3.mouse(event);
    var exactTime = scaleLeftXDynamic.invert(mousePos[X]);
    var frame = Math.max(0,Math.ceil(exactTime * 400));
    var floor = Math.max(0,Math.floor(svg.yScale.invert(mousePos[Y])));
    d3.select("#lTime").text(frame/400+" sec (timestep: " + frame + ")");
    d3.select("#lFloor").text(floor);
    //d3.select("#lShear").text(shear);
    //d3.select("#lMoment").text(moment);
    //d3.select("#lDiaF").text(diaF);
}

