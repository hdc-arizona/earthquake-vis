var N = 50; // The Size of Bin
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

var curAttr = "diaphram force";
var selectedAttr = "diaphram force";

var tsDivs = [];
var currentSim = null;

var useLogDensityScale = false;

$('body').append("<div id='leftDiv'></div>");
$('body').append("<div id='rightDiv'></div>");
var leftDiv = d3.select("#leftDiv")
                .style("max-width", "50%");
var rightDiv = d3.select("#rightDiv")
                .style("max-width", "50%");

var sid = getUrlParameter("id");
if (!sid) {
    sid = 7;
}

if (!String.prototype.format) {
 String.prototype.format = function() {
   var args = arguments;
   return this.replace(/{(\d+)}/g, function(match, number) {
     return typeof args[number] != 'undefined'
       ? args[number]
       : match
     ;
   });
 };
}

eqs = {
    data:{},
    sims:{},
    count:function(){return Object.keys(this.data);},
    updateMaxLength:function(){
        var max = 0;
         for (var eid in eqs.data) {
            max = Math.max(max,this.data[eid].length);
        }
        this.maxLength = max;
    },
    updateMaxStrength:function(){
        var maxStrength = 0;
        for (var i in eqs.data) {
            var extent = d3.extent(this.data[i], function(d) {return d;});
            var strength = Math.max(-extent[0],extent[1]);
            maxStrength = Math.max(strength,maxStrength);
        }
        this.maxStrength = maxStrength;
    },
    maxStrength:0,
    maxLength:0,
    add: function(eid, eq) {
        // eq shoyld be an array
        this.data[eid] = eq;
        this.sims[eid] = [];
        this.updateMaxLength();
        this.updateMaxStrength();
        console.log(eid);
        console.log(Object.keys(eqs.data));
        d3.select("#eqSelection").selectAll("option").data(Object.keys(eqs.data)).enter()
                                 .append("option")
        d3.selectAll("option").attr("value", function(d,i){return d;})
                                 .text(function(d,i){return d;})
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
    console.log(eid);
    this.length = eqs.data[eid].length;
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
    };
    this.getDataMatrix = function(startTime, endTime, startFloor, endFloor) {
        result = [];
        var index = 0;
        for (var i = startTime; i < endTime; i++) {
            for (var j = startFloor; j < endFloor; j++) {
                var row = [];
                var attrs = ['shear', 'moment', 'diaphram force', 'acceleration/PGA', 'drift ratio','interstory drift ratio'];
                for (var attr in attrs) {
                    //console.log(row[attr]);
                    row.push(this.ts[attrs[attr]].data[i][j]);
                }
                result.push(row);

            }
        }
        return result;
    };
}

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
                    .attr("height", screenHeight/3)
                    .attr("id","scatterDiv")
                    .attr("class", "container")

var pcaDiv = rightDiv.append("div")
                    .attr("width", screenWidth/2)
                    .attr("height", screenHeight/3)
                    .attr("id","pcaDiv")
                    .attr("class", "container")

var spWidth = screenWidth/2 - margin.left - margin.right;
var spHeight = screenHeight/3*2 - margin.top - margin.bottom;

var spSize = ~~Math.min(spWidth,spHeight);
while (spSize % N != 0) {
    spSize--;
}
spWidth = spSize/2;
spHeight = spSize/2;

var scatterPlot = scatterDiv.append("svg").attr("width", spWidth + margin.right + margin.left)
                  .attr("height", spHeight + margin.top + margin.bottom)
var pcaPlot = pcaDiv.append("svg").attr("width", spWidth + margin.right + margin.left)
                  .attr("height", spHeight + margin.top + margin.bottom)

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
var scaleEqColor = d3.scale.category20();

var eqBrush = d3.svg.brush().x(scaleLeftXStatic).on("brush", eqBrushed);
var zoom = d3.behavior.zoom()
             .on("zoom", zoomEvent)
             .x(scaleLeftXStatic)
             .scaleExtent([1,1000]);

draw();
loadEQ(sid);
//loadEQ("data/EQnew7.txt")

var linearStatic = d3.svg.line()
    .interpolate("linear")
    .x(function(d,i) { return scaleLeftXStatic(i/400); })
    .y(function(d,i) { return scaleEqStr(d); });

var linearDynamic = d3.svg.line()
    .interpolate("linear")
    .x(function(d,i) { return scaleLeftXDynamic(i/400); })
    .y(function(d,i) { return scaleEqStrZoomed(d); });

var tsBrush = d3.svg.brush().x(scaleLeftXDynamic)
        .on("brushstart", tsBrushedStart)
        .on("brush", tsBrushMove)
        .on("brushend", tsBrushEnd);

$(window).resize(function(){
    screenWidth = $(window).width();
    screenHeight = $(window).height();
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
    drawControlPanel(infoDiv);
    drawScatterPlot(scatterPlot);
    drawScatterPlot(pcaPlot);
}

function addSim(sid) {
    /*
    This is hardcoded for the initial dataset
    */
    var s = new sim(sid,13);
    eqs.addSim(sid,s);
    timeseries("shear","data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/1_ShearNormalized.json",sid,s);
    timeseries("moment","data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/2_MomentNormalized.json",sid,s);
    timeseries("diaphram force", "data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/3_DiaphForceNormalized.json",sid,s);
    timeseries("acceleration/PGA", "data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/4_DiaAcc_dividedby_PGA.json",sid,s);
    timeseries("drift ratio","data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/5_DriftRatio.json",sid,s);
    timeseries("interstory drift ratio", "data/earthquakes/dataforEQ" + sid + "/dataforSIM" + sid + "/6_InterstoryDriftRatio.json",sid,s);
    currentSim = s;
    areaPlot.addAttr.attr("disabled", null);
    //areaPlot.addSim.attr("disabled", "true");
}

function loadEQ(eid) {
    console.log(eid);
    file = "data/earthquakes/dataforEQ" + eid + "/EQnew" + eid + ".txt";
    $.get(file,function(txt){
        var lines = txt.split("\n");
        var data = [];
        var max = 0;
        for (var i = 0, len = lines.length; i < len; i++) {
            if (lines[i]) {
                data.push(parseFloat(lines[i].replace(/^\s+|\s+$/g, '')));
                max = Math.max(max,Math.abs(data[i]))
            }
        }
        eqs.add(eid, data)
        scaleLeftXStatic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
        scaleLeftXDynamic = d3.scale.linear().domain([0, eqs.maxLength/400]).range([0,tsWidth]);
        scaleEqStr = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([eqHeight,0]);
        scaleEqStrZoomed = d3.scale.linear().domain([-eqs.maxStrength,eqs.maxStrength]).range([areaHeight,0]);
        zoom.x(scaleLeftXDynamic);
        eqBrush.x(scaleLeftXStatic);
        updateEqPlot(eqPlot);
        updateAreaPlot(areaPlot);
        addSim(eid);
    });
}

function loadSim(sid) {
    var sid = $("#sidInput").val();
    loadEQ(sid);
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
    svg.eqSelection = svg.controller.append("select").attr("id","eqSelection").on("change", function(){
        currentSim = eqs.sims[$("#eqSelection").val()][0];
        redraw();
    });
    svg.addAttr = svg.controller.append("button").attr("id","addAttrBtn").attr("disabled","true");
    svg.addAttr.text("Add Plot").on("click",newTimeseries)
    svg.controller.append("label").attr("for","sidInput").text(" | Load simulation: ")
    svg.sidInput = svg.controller.append("input").attr("type", "text").attr("name", "sid").attr("id", "sidInput").attr("placeholder", "id");
    svg.addSim = svg.controller.append("button").attr("id", "manageSim").on("click", loadSim);
    svg.addSim.text("Load")
    svg.manageSim = svg.controller.append("a").attr("href",'/').attr("target", "_blank").append("button").attr("id", "manageSim");
    svg.manageSim.text("Manage Simulations")
    //svg.addSim.attr("disabled", "true");
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
                     .text(function(d,i){return d;});
    keys.unshift("None");
    // side quest, update spy selection as well
    infoDiv.spy.selectAll("option").data(keys).enter().append("option")
    infoDiv.spy.selectAll("option").attr("value", function(d,i){return d;})
                     .text(function(d,i){return d;})

    svg.attrSelection.on("change", function(){
        selectedAttr = this.options[this.selectedIndex].value;
        d3.select(brushCell).call(tsBrush.clear());
        updateTimeseriesPlot(div,this.options[this.selectedIndex].value);
        updateScatterPlot(scatterPlot);
        updatePCABins(svg);
        updatePCAPlot(pcaPlot);
    });
    var s = ["None"];
    for (var i = 0; i < currentSim.numStory; i++) {
        s.push(i);
    }
    infoDiv.altStory.selectAll("option").data(s).enter()
        .append("option").attr("value", function(d,i){return d;})
        .text(function(d,i){return d;});

    svg.controller.append("label").text(" Color Scale: ");

    /* color selection */
    keys = [];
    for(var k in currentSim.ts[svg.attr].colors) { keys.push(k); }
    svg.colorSelection = svg.controller.append("select").attr("class", "colorSelection").on("change", function(){
        svg.curColor = this.options[this.selectedIndex].value;
        svg.curColorScale = svg.curColor + "+" + svg.curScale;
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
        updateTimeseriesPlot(div);
    });
    svg.scaleSelection.selectAll("option").data(keys).enter()
                     .append("option").attr("value", function(d,i){return currentSim.ts[svg.attr].scales[d].value;})
                     .attr("selected", function(d){ return (d == "Linear (MAX 1 0)") ? "selected" : null; })
                     .text(function(d,i){return d;})
    svg.refreshBtn = svg.controller.append("button").text("Update").on("click",function(){
        updateTimeseriesPlot(div);
    });
    svg.removeBtn = svg.controller.append("button").text("X").on("click",function(){
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
    div.append("strong").text("Attr:")
    div.append("text").attr("id", "lAttr").text("N/A");
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("Value:")
    div.append("text").attr("id", "lValue").text("N/A");
    div.append("br");div.append("br");
    div.append("strong").text("Y Attr:")
    div.spy = div.append("select").attr("id","spySelection").on("change", function() {
        spyAttr = this.options[this.selectedIndex].value;
        updateScatterPlot(scatterPlot);
        //updatePCABins(svg);
        updatePCAPlot(pcaPlot);
    });
    div.spy.append("option").attr("value", "None").text("None");
    spyAttr = "None";
    div.append("text").attr("class", "devider").text("   | ")
    div.append("strong").text("Alt Y Story:")
    div.altStory = div.append("select").attr("id","spySelection").on("change", function() {
        altStory = this.options[this.selectedIndex].value;
        updateScatterPlot(scatterPlot);
        //updatePCABins(svg);
        updatePCAPlot(pcaPlot);
    });
    altStory = "None";
    div.altStory.append("option").attr("value", "None").text("None");
    div.append("br");div.append("br");
    div.append("button").text("Change Color Scale").on("click", function(){
        useLogDensityScale = !useLogDensityScale;
        updateScatterPlot(scatterPlot);
        //updatePCABins(svg);
        updatePCAPlot(pcaPlot);
    })
}

/* ==================================================
||
||  Timeseries
||
================================================== */

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
        console.log(eid);
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
            "RedYelBlu" : {
                "value": "RedYelBlu",
                "color": colorbrewer.RdYlBu
            },
            "RedWhtBlu" : {
                "value": "RedWhtBlu",
                "color": colorbrewer.RdBu
            },
            "PurWhtOrg" : {
                "value": "OrgWhtPur",
                "color": colorbrewer.PuOr
            },
            "BrnWhtGre" : {
                "value": "BrnWhtGre",
                "color": colorbrewer.BrBG
            },
            "PnkWhtGre" : {
                "value": "PnkWhtGre",
                "color": colorbrewer.PiYG
            },
        }
        ts.scales = {
            "Linear (Max 0)" : {
                "value": "M0_Linear",
                "scale": d3.scale.linear(),
                "domain": [-absMax,-absMax/2,0,absMax/2,absMax],
                "length": 5
            },
            "Linear (MAX 1 0)" : {
                "value" : "M10_Linear",
                "scale" : d3.scale.linear(),
                "domain" : [-absMax,-1,0,1,absMax],
                "length" : 5
            },
            "Threshold (1 0.5)" : {
                "value" : ".5_1_Threshold",
                "scale" : d3.scale.threshold(),
                "domain" : [-1,-0.5,0.5,1],
                "length" : 5
            },
            "Threshold (1)" : {
                "value" : "1_Threshold",
                "scale" : d3.scale.threshold(),
                "domain" : [-1,-1,1,1],
                "length" : 5
            }
        }

        /* populate colorscales */
        for (var ck in ts.colors) {
            for (var sk in ts.scales) {
                var c = ts.colors[ck];
                var s = ts.scales[sk]
                var cs = c.color[s.length].slice(); // duplicate array
                cs.reverse();
                ts.colorScales[c.value+"+"+s.value] = s.scale.copy().domain(s.domain).range(cs);
            }
        }

        /* create image object */
        ts.images = {}
        ts.imageObjs = {}
        ts.canvas = {}
        ts.context = {}
        for (var key in ts.colorScales) {
            ts.canvas[key] = document.createElement('canvas');
            ts.canvas[key].width = ts.length;
            ts.canvas[key].height = ts.numStory;
            ts.context[key] = ts.canvas[key].getContext('2d');
            ts.images[key] = ts.context[key].createImageData(ts.length, ts.numStory);
            ts.imageObjs[key] = null;
            //new Image(ts.length, ts.numStory);
            /* Skip image generation
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
            */
        }
        //ts.img = image;
        //context.putImageData(image,0,0);
        //imageObj.src = canvas.toDataURL();
        //ts.imageObj = imageObj;
        ts.imageDim = [ts.length, ts.numStory];
        ts.getImageObj = function(key) {
            if (this.imageObjs[key] == null) {
                this.imageObjs[key] = new Image(this.length, this.numStory);
                for (var y = this.numStory-1, p = -1; y >= 0; --y) {
                    for (var x = 0; x < this.length; ++x) {

                        var c = d3.rgb(this.colorScales[key](this.data[x][y]));
                        this.images[key].data[++p] = c.r;
                        this.images[key].data[++p] = c.g;
                        this.images[key].data[++p] = c.b;
                        this.images[key].data[++p] = 255;

                    }
                }
                this.context[key].putImageData(this.images[key],0,0);
                this.imageObjs[key].src = this.canvas[key].toDataURL();

            }
            return this.imageObjs[key];
        }
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

    div.tsPlot = div.append("svg")
                    .attr("width", screenWidth/2)
                    .attr("height", tsSVGHeight)
                    .attr("class","timeseriesPlot")
                    .style("position", "relative")
    updateTimeseries();
    drawTimeseriesPlot(div,"diaphram force");
    drawTimeseriesControl(div,div.tsPlot);
    tsDivs.push(div);
    tsBrushExtent = [[scaleLeftXDynamic.domain()[0],0], [scaleLeftXDynamic.domain()[1], currentSim.numStory]];
    updateScatterPlot(scatterPlot);
    updatePCABins(pcaPlot);
    updatePCAPlot(pcaPlot);
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
    //svg.select(".background").style("pointer-events", "none");
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
    data = []
    for (eid in eqs.data) {
        data.push(eqs.data[eid]);
    }
    var lines = svg.plot.selectAll(".eqLine").data(data);
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
    context.canvas.width = tsWidth;
    context.canvas.height = tsHeight;
    context.clearRect(0, 0, canvasDim[X], canvasDim[Y]);
    var d = scaleLeftXDynamic.domain();
    var e = d.map(function (v,i) { return Math.ceil(v * 400)});
    context.drawImage(timeseries.getImageObj(svg.curColorScale), e[0], 0, e[1]-e[0], timeseries.numStory, 0, 0, tsWidth,tsHeight);

    svg.legend = svg.append("g").classed("legend", true).attr("transform", "translate(" + (tsWidth+margin.left+10) + "," + (tsHeight/4+margin.top) + ")");
    svg.legendData = [];
    var colorScale = timeseries.colorScales[svg.curColorScale];
    var step = (timeseries.absMax * 2)/100;
    for (var i = 0; i < 100; i++) {
        svg.legendData.push(-timeseries.absMax + step * (i));
    }

    svg.legendScale = d3.scale.linear().range([tsHeight/2,0]).domain([-timeseries.absMax, timeseries.absMax]);
    svg.legend.selectAll("rect").data(svg.legendData).enter().append("rect")
        .attr("x",0).attr("y",function(d){ tsHeight/2 - svg.legendScale(d); }).attr("width",10)
        .attr("height", function(d){ return svg.legendScale(d); })
        .attr("fill", function(d) { return timeseries.colorScales[svg.curColorScale](d) })
    svg.legendAxis = d3.svg.axis().scale(svg.legendScale).orient("right");
    svg.legend.append("g").attr("class", "axis lAxis")
        .attr("transform", "translate(10,0)")
        .call(svg.legendAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", 0)
          .attr("y", 0)
          .style("text-anchor", "end");
    tsBrush.x(scaleLeftXDynamic).y(svg.yScale);
    svg.pane = svg.append("g").attr("class", "brush")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("width",tsWidth).attr("height", tsHeight)
        .style("pointer-event", "all")
        .call(tsBrush).on("mousemove", function(){ mouseoverTimeseries(svg, this); })
        .on("mousedown", function() { mousedownTimeseries(svg,this); });
}

function updateTimeseriesPlot(div,attr) {
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

    tsBrush.x(scaleLeftXDynamic).y(svg.yScale);

    var step = (timeseries.absMax * 2)/100;
    svg.legendData = [];
    for (var i = 0; i < 100; i++) {
        svg.legendData.push(-timeseries.absMax + step * (i));
    }
    svg.legend.attr("transform", "translate(" + (tsWidth+margin.left+10) + "," + (tsHeight/4+margin.top) + ")");
    svg.legendScale.range([tsHeight/2,0]).domain([-timeseries.absMax, timeseries.absMax])
    svg.selectAll("rect").data(svg.legendData)
        .attr("x",0).attr("y",function(d){ tsHeight/2 - svg.legendScale(d); }).attr("width",10)
        .attr("height", function(d){ return svg.legendScale(d); })
        .attr("fill", function(d) { return timeseries.colorScales[svg.curColorScale](d) })
    svg.legendAxis = d3.svg.axis().scale(svg.legendScale).orient("right");
    svg.legend.select(".lAxis").call(svg.legendAxis);
    svg.pane.attr("width",tsWidth).attr("height", tsHeight)

    context.canvas.width = tsWidth;
    context.canvas.height = tsHeight;
    context.clearRect(0, 0, canvasDim[X], canvasDim[Y]);

    var dom = scaleLeftXDynamic.domain();
    var e = dom.map(function (v,i) { return Math.ceil(v * 400)});
    context.drawImage(timeseries.getImageObj(svg.curColorScale), e[0], 0, e[1]-e[0], timeseries.numStory, 0, 0, tsWidth,tsHeight);
    svg.pane.attr("width",tsWidth).attr("height", tsHeight);

}

function drawScatterPlot(svg) {
    svg.plot = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.xScale = d3.scale.linear().domain([0,N]).range([0,spWidth]);
    svg.yScale = d3.scale.linear().domain([0,N]).range([spHeight,0]);
    svg.xData = null;
    svg.yData = null;
    svg.xAxis = d3.svg.axis().scale(svg.xScale).orient("bottom");
    svg.yAxis = d3.svg.axis().scale(svg.yScale).orient("left");
    svg.bins = new Array(N);
    for (var i = 0; i < N; i++) {
        svg.bins[i] = new Array(N);
        for (var j = 0; j < N; j++) {
            svg.bins[i][j] = 0;
        }
    }
    svg.xBin = new Array(N);
    svg.yBin = new Array(N);
    svg.cScale = d3.scale.linear().domain([0,1,2,3,4]).range(colorbrewer.PuBu[5]);
    var cols = svg.plot.selectAll(".col").data(svg.bins).enter().append("g").attr("class", "col").attr("transform", function(d,i) { return "translate(" + (spWidth/N * i ) + ",0)"; });

    cols.selectAll("rect").data(function(d){return d;}).enter().append("rect")
        .attr("y", function(d,i) { return i * (spHeight/N); })
        .attr("fill", function(d) { return svg.cScale(d); })
        .style("stroke-width",1)
        .style("stroke", "#DDDDDD")
        .attr("width", spWidth/N)
        .attr("height", spHeight/N);

    svg.plot.append("g").attr("class", "xAxis axis")
            .call(svg.xAxis).attr("transform", "translate(0,"+spHeight+")");
    svg.plot.append("g").attr("class", "yAxis axis").call(svg.yAxis);
}

function updateScatterPlot(svg) {

    updateBins(svg);

    // calculate max count
    var maxCount = -Infinity;
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            maxCount = Math.max(maxCount, svg.bins[i][j]);
        }
    }

    // update scale
    if (useLogDensityScale) {
        if (maxCount > 1000) {
            svg.cScale = d3.scale.log().base(10)
            .domain([1, 100, maxCount])
            .range(["#efedf5","#9ebcda","#8856a7"])
        } else {
            svg.cScale = d3.scale.log().base(10)
            .domain([1, Math.sqrt(maxCount),maxCount])
            .range(["#efedf5","#9ebcda","#8856a7"])
        }
    } else {
        if (maxCount > 200) {
            svg.cScale = d3.scale.linear().domain([1,100,maxCount]).range(["#efedf5","#9ebcda","#8856a7"]);
        } else {
            svg.cScale = d3.scale.linear().domain([1,maxCount/2,maxCount]).range(["#efedf5","#9ebcda","#8856a7"]);
        }
    }

    var cols = svg.selectAll(".col").data(svg.bins)

    cols.selectAll("rect").data(function(d){return d;})
        .transition()
        .attr("y", function(d,i) { return i * (spHeight/N); })
        .attr("fill", function(d) { return svg.cScale(d+1); })
        .attr("width", spWidth/N)
        .attr("height", spHeight/N);
    var yAttr = selectedAttr;
    if (spyAttr != "None") {
        yAttr = spyAttr;
    }
    svg.xScale.domain([-currentSim.ts[selectedAttr].absMax,currentSim.ts[selectedAttr].absMax]).range([0,spWidth]);
    svg.yScale.domain([-currentSim.ts[yAttr].absMax,currentSim.ts[yAttr].absMax]).range([spHeight,0]);
    svg.xAxis.scale(svg.xScale);
    svg.yAxis.scale(svg.yScale);
    svg.select(".xAxis").transition().call(svg.xAxis);
    svg.select(".yAxis").transition().call(svg.yAxis);
}

/* ==================================================
||
||  Event Handlers
||
================================================== */

function eqBrushed() {

    var d = eqBrush.empty() ? scaleLeftXStatic.domain() : eqBrush.extent();
    d[0] = Math.max(scaleLeftXStatic.domain()[0],d[0]);
    d[1] = Math.min(scaleLeftXStatic.domain()[1],d[1]);
    scaleLeftXDynamic.domain(d);
    areaPlot.select(".area").attr("d",areaPlot.area);
    areaPlot.select(".xAxis").call(areaPlot.xAxis);
    updateTimeseries();
    zoom.x(scaleLeftXDynamic);
    d3.select(brushCell).call(tsBrush.clear());
    tsBrushExtent = [[scaleLeftXDynamic.domain()[0],0], [scaleLeftXDynamic.domain()[1], currentSim.numStory]];
    updateScatterPlot(scatterPlot);
    updatePCABins(svg);
    updatePCAPlot(pcaPlot);
}

var brushCell = null;

function tsBrushedStart() {
    if (brushCell != this) {
        d3.select(brushCell).call(tsBrush.clear());
        brushCell = this;
    }

}

function tsBrushMove() {
    tsBrushExtent = tsBrush.extent();
    if (d3.event.mode === "move") {
        var ey = tsBrushExtent[0][Y] = Math.round(tsBrushExtent[0][Y]);
        tsBrushExtent[1][Y] = ey + Math.round((tsBrushExtent[1][Y] - tsBrushExtent[0][Y]));
        tsBrushExtent[0][Y] = ey;
    } else {
        tsBrushExtent[0][Y] = Math.round(tsBrushExtent[0][Y]);
        tsBrushExtent[1][Y] = Math.round(tsBrushExtent[1][Y]);
    }
    d3.select(brushCell).call(tsBrush.extent(tsBrushExtent));
    updateScatterPlot(scatterPlot);
    //updatePCAPlot(pcaPlot);
}

function tsBrushEnd() {
    if (tsBrush.empty()) {
        tsBrushExtent = [[scaleLeftXDynamic.domain()[0],0], [scaleLeftXDynamic.domain()[1], currentSim.numStory]];
    }
    updateScatterPlot(scatterPlot);
    updatePCABins(pcaPlot);
    updatePCAPlot(pcaPlot);
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
    //eqPlot.select(".resize").style("pointer-events", "none");
    //eqPlot.select(".extent").style("pointer-events", "none");
    updateTimeseries();
    d3.select(brushCell).call(tsBrush.clear());
    tsBrushExtent = [[scaleLeftXDynamic.domain()[0],0], [scaleLeftXDynamic.domain()[1], currentSim.numStory]];
    updateScatterPlot(scatterPlot);
    updatePCABins(svg);
    updatePCAPlot(pcaPlot);
}

function mouseoverTimeseries(svg, event) {
    var mousePos = d3.mouse(event);
    var exactTime = scaleLeftXDynamic.invert(mousePos[X]);
    curAttr = svg.attr;
    var frame = Math.max(0,Math.ceil(exactTime * 400));
    var floor = Math.max(0,Math.floor(svg.yScale.invert(mousePos[Y])));
    d3.select("#lTime").text(frame/400+" sec (timestep: " + frame + ")");
    d3.select("#lFloor").text(floor);
    d3.select("#lAttr").text(curAttr);
    d3.select("#lValue").text(currentSim.ts[curAttr].data[frame][floor]);
    //d3.select("#lShear").text(shear);
    //d3.select("#lMoment").text(moment);
    //d3.select("#lDiaF").text(diaF);
}

function mousedownTimeseries(svg, event) {
    selectedAttr = svg.attr;
}

function updateBins(svg) {
    var iStart = 0, iEnd = currentSim.length - 1;
    var jStart = 0, jEnd = currentSim.numStory - 1;

    iStart = Math.ceil(tsBrushExtent[0][X] * 400);
    iEnd = Math.ceil(tsBrushExtent[1][X] * 400)-1;
    jStart = tsBrushExtent[0][Y];
    jEnd = tsBrushExtent[1][Y] - 1;
    clearBins(svg);
    var yAttr = selectedAttr;
    if (spyAttr != "None") {
        yAttr = spyAttr;
    }
    svg.xts = currentSim.ts[selectedAttr];
    svg.yts = currentSim.ts[yAttr];
    if (altStory != "None") {
        var altS = +altStory;
        for (var i = iStart; i <= iEnd; i++) {
            var x = Math.floor((svg.xts.data[i][jStart] + svg.xts.absMax) * N / (2 * svg.xts.absMax));
            var y = Math.floor((svg.yts.data[i][altS] + svg.yts.absMax) * N / (2 * svg.yts.absMax));
            y = N - y - 1;
            svg.bins[x][y]++;
        }
        return;
    }
    for (var i = iStart; i <= iEnd; i++) {
        for (var j = jStart; j <= jEnd; j++) {
            var x = Math.floor((svg.xts.data[i][j] + svg.xts.absMax) * N / (2 * svg.xts.absMax));
            var y = Math.floor((svg.yts.data[i][j] + svg.yts.absMax) * N / (2 * svg.yts.absMax));
            x = Math.min(49,x);
            y = N - y - 1;
            try {
                svg.bins[x][y]++;
            } catch(err) {
                console.log([x,y])
                console.error(err.message)
            }
        }
    }
}

function clearBins(svg) {
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            svg.bins[i][j] = 0;
        }
    }
}


/* ==================================================
||
||  PCA Plot
||
================================================== */
function drawPCAPlot(svg) {
    drawScatterPlot(svg);
}

function updatePCAPlot(svg) {
    // calculate max count
    var maxCount = -Infinity;
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            maxCount = Math.max(maxCount, svg.bins[i][j]);
        }
    }

    // update scale
    if (useLogDensityScale) {
        if (maxCount > 1000) {
            svg.cScale = d3.scale.log().base(10)
            .domain([1, 100, maxCount])
            .range(["#efedf5","#9ebcda","#8856a7"])
        } else {
            svg.cScale = d3.scale.log().base(10)
            .domain([1, Math.sqrt(maxCount),maxCount])
            .range(["#efedf5","#9ebcda","#8856a7"])
        }
    } else {
        if (maxCount > 200) {
            svg.cScale = d3.scale.linear().domain([1,100,maxCount]).range(["#efedf5","#9ebcda","#8856a7"]);
        } else {
            svg.cScale = d3.scale.linear().domain([1,maxCount/2,maxCount]).range(["#efedf5","#9ebcda","#8856a7"]);
        }
    }

    var cols = svg.selectAll(".col").data(svg.bins)

    cols.selectAll("rect").data(function(d){return d;})
        .transition()
        .attr("y", function(d,i) { return i * (spHeight/N); })
        .attr("fill", function(d) { return svg.cScale(d+1); })
        .attr("width", spWidth/N)
        .attr("height", spHeight/N);
    var yAttr = selectedAttr;
    /*
    if (spyAttr != "None") {
        yAttr = spyAttr;
    }
    */
    svg.xAxis.scale(svg.xScale);
    svg.yAxis.scale(svg.yScale);
    svg.select(".xAxis").transition().call(svg.xAxis);
    svg.select(".yAxis").transition().call(svg.yAxis);
}

function executeAsync(func) {
    setTimeout(func, 0);
}

function updatePCABins(svg) {
    function handler(result) {
        nano_end = performance.now();
        //console.log(matrix);
        //console.log(result);
        matrix = numeric.dot(matrix, numeric.transpose(result.eig_vector));
        //console.log(matrix);
        pcaXExtent = d3.extent(matrix, function(data){ return data[0]; });
        pcaYExtent = d3.extent(matrix, function(data){ return data[1]; });
        svg.xScale.domain(pcaXExtent);
        svg.yScale.domain(pcaYExtent);
        for (var i = 0; i < matrix.length; i++) {
            //debugger;
            var x, y;
            if (pcaXExtent[0] == pcaXExtent[1]) x = matrix[i][0];
            else
                x = Math.floor((matrix[i][0] - pcaXExtent[0]) * N / (pcaXExtent[1] - pcaXExtent[0]));
            if (pcaYExtent[0] == pcaYExtent[1]) y = matrix[i][1];
            else
                y = Math.floor((matrix[i][1] - pcaYExtent[0]) * N / (pcaYExtent[1] - pcaYExtent[0]));
            x = Math.max(x, 0);
            x = Math.min(x, N-1);
            y = Math.max(y, 0);
            y = Math.min(y, N-1);
            try {
                svg.bins[x][y]++;
            } catch(err) {
                console.log([matrix[i]]);
                console.log([x,y])
                console.error(err.message)
            }
        }
        executeAsync(function() {
            updatePCAPlot(svg);
        });

        js_start = performance.now();
        var pca = new PCA();
        matrix = pca.scale(matrix,true,true);
        matrix = pca.pca(matrix);
        js_end = performance.now();
        console.log([nano_start, nano_end, js_start, js_end, iStart, iEnd, jStart, jEnd]);
        $.post("log",
            {
                floorStart: jStart,
                floorEnd: jEnd,
                timeStart: iStart,
                timeEnd: iEnd,
                nanoTime: nano_end - nano_start,
                jsTime: js_end - js_start,
                sim: sid
            },
            function(data, status){
                console.log("Data: " + data + "\nStatus: " + status);
            });

    }
    console.log("Update PCA Bins!")
    var iStart = 0, iEnd = currentSim.length - 1;
    var jStart = 0, jEnd = currentSim.numStory - 1;
    iStart = Math.ceil(tsBrushExtent[0][X] * 400);
    iEnd = Math.ceil(tsBrushExtent[1][X] * 400)-1;
    jStart = tsBrushExtent[0][Y];
    jEnd = tsBrushExtent[1][Y] - 1;
    matrix = currentSim.getDataMatrix(iStart, iEnd, jStart, jEnd);
    clearBins(svg);
    /*
    var yAttr = selectedAttr;
    if (spyAttr != "None") {
        yAttr = spyAttr;
    }
    svg.xts = currentSim.ts[selectedAttr];
    svg.yts = currentSim.ts[yAttr];
    */

    var quadtree_level = 25;
    var variable_schema = ['0', '1', '2', '3', '4', '5','0*0',
                           '0*1', '0*2', '0*3', '0*4', '0*5',
                           '1*1', '1*2', '1*3', '1*4', '1*5',
                           '2*2', '2*3', '2*4', '2*5', '3*3',
                           '3*4', '3*5', '4*4', '4*5', '5*5',
                           'count'];

    extent = [[iStart, iEnd], [jStart, jEnd]];
    xExtent = [0, currentSim.length-1];
    yExtent = [0, currentSim.numStory-1];

    nc.setup(quadtree_level, variable_schema);
    nano_start = performance.now();
    nc.query_quadtree_eq(extent, xExtent, yExtent, handler, sid);

    /*
    var beforeMatrix = new Date().getTime();
    matrix = currentSim.getDataMatrix(iStart, iEnd+1, jStart, jEnd+1);
    var afterMatrix = new Date().getTime();
    console.log("Prepare Matrix: " + (afterMatrix - beforeMatrix));
    matrix = pca.scale(matrix,true,true);
    matrix = pca.pca(matrix);
    var afterPCA = new Date().getTime();
    console.log("Calculate PCA: " + (afterPCA - afterMatrix));
    */

}

