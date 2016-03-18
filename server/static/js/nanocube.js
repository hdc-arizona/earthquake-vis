///////////////////////////////////////////////
// NanoCube query helpers
///////////////////////////////////////////////

var nc = {};

nc._variable_schema = {};
nc._num_feature_dimensionm = null;
nc._quadtree_level = 25;

nc.setup = function (level, s) {
    nc._quadtree_level = level;

    for(var i = 0; i < s.length; i ++) {
        nc._variable_schema[String(s[i])] = i;
    }

    // calculate the original feature dimension number
    nc._num_feature_dimensionm = Math.floor((Math.sqrt(8*(s.length)+1)-3) / 2);
};

nc.query_all = function (handleFunc) {
    $.getJSON('http://localhost:29512/count', function(data) {
        handleFunc(nc._pca(data.root.val));
    });
};

nc.query_categorty = function (c_id, handleFunc) {
    var query = 'http://localhost:29512/count.r("test_category",set(['+c_id+']))'
    $.getJSON(query, function(data) {
        handleFunc(nc._pca(data.root.val));
    });
};

nc.query_quadtree = function (extent, xExtent, yExtent, handleFunc) {
    var n = Math.pow(2, nc._quadtree_level);
    var xRange = xExtent[1]-xExtent[0];
    var yRange = yExtent[1]-yExtent[0];
    var lowXTile = Math.min(n,Math.floor(((extent[0][0]-xExtent[0])/xRange)*n));
    var lowYTile = Math.min(n,Math.floor(((extent[0][1]-xExtent[0])/xRange)*n));
    var upXTile = Math.min(n,Math.floor(((extent[1][0]-yExtent[0])/yRange)*n));
    var upYTile = Math.min(n,Math.floor(((extent[1][1]-yExtent[0])/yRange)*n));
    var query = 'http://localhost:29512/count.r("location",range2d(tile2d({0},{1},{4}),tile2d({2},{3},{4})))'.format(lowXTile,lowYTile,upXTile,upYTile,nc._quadtree_level);
    console.log(query);
    $.getJSON(query, function(data) {
        console.log(data);
        var vec = data.root.val;
        if(typeof vec === 'undefined') {
            return;
        } else {
            handleFunc(nc._pca(vec));
        }
    });
};

nc._pca = function (vec) {
    var d = nc._num_feature_dimensionm;
    var s = nc._variable_schema;

    if(vec[s.count] < d) {
        console.log('Too few selections.');
        return;
    }

    // if count < dimensions, PCA won't work
    var covMat = new Array(d);
    for(var i = 0; i < d; i ++) {
        covMat[i] = new Array(d);
    }

    // build the upper triangular area
    for(var row = 0; row < d; row ++) {
        for(var col = row; col < d; col ++) {
            var sum_x = vec[s[String(row)]];
            var sum_y = vec[s[String(col)]];
            var sum_xy = vec[s[String(row)+'*'+String(col)]];
            var count = vec[s.count];
            covMat[row][col] = (sum_xy-sum_x*sum_y/count)/(count-1);
        }
    }
    // fill the lower triangular area
    for(var row = 1; row < d; row ++) {
        for(var col = 0; col < row; col ++) {
            covMat[row][col] = covMat[col][row];
        }
    }

    // calculate eigen value and eigen vector
    var eig = numeric.eig(covMat);
    var eig_value = eig.lambda.x;
    var eig_vector = eig.E.x;
    var list = [];
    for(var i = 0; i < eig_value.length; i ++) {
        list.push({'value':eig_value[i], 'vector':eig_vector[i]});
    }
    list.sort(function(a, b) {
        return a.value - b.value;
    });
    for(var i = 0; i < eig_value.length; i ++) {
        eig_value[i] = list[i].value;
        eig_vector[i] = list[i].vector;
    }

    var results = {'cov_matrix': covMat,
                   'eig_value': eig_value,
                   'eig_vector': eig_vector};
    return results;
};
