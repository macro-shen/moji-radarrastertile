'use strict';

const fs = require('fs');
const path = require("path");
var sm = new (require('@mapbox/sphericalmercator'));
const zlib = require('zlib');
const archiver = require('archiver');

var mbgl = require('@mapbox/mapbox-gl-native');
var sharp = require('sharp');
// const mapnik = require('mapnik');

var stylejson = {
    "version": 8,
    "name": "Empty",
    "sources": {
      "mapbox": {
        "type": "vector",
        "maxzoom": 15,
        "tiles": [
          "result_dir/XXXX/XXXX-XX-XX/china_pbf/XXXXXXXXXXXX/{z}/{x}/{y}.pbf"
        ]
      }
    },
    "layers": [
      {
        "id": "background",
        "type": "background",
        "paint": {
          "background-color": "hsla(0, 0%, 0%, 0)"
        }
      },
      {
        "id": "mojipolygon",
        "type": "fill",
        "source": "mapbox",
        "source-layer": "XXXXXXXXXXXX",
        "filter": [
            "all",
            [
            "==",
            "idx",
            0
            ]
        ],
        "paint": {
            "fill-opacity": 1,
            "fill-color": {
                "property": "value",
                "type": "categorical",
                "stops": [
                    [1, "rgb(20, 160, 240)"],
                    [9, "rgb(20, 190, 240)"],
                    [19, "rgb(20, 220, 240)"],
                    [37, "rgb(20, 250, 240)"],
                    [55, "rgb(20, 250, 160)"],
                    [73, "rgb(135, 250, 80)"],
                    [91, "rgb(250, 250, 0)"],
                    [109, "rgb(250, 180, 0)"],
                    [127, "rgb(250, 110, 0)"],
                    [145, "rgb(250, 40, 0)"],
                    [163, "rgb(180, 40, 40)"],
                    [181, "rgb(110, 40, 80)"],
                    [199, "rgb(80, 40, 110)"],
                    [217, "rgb(50, 40, 140)"],
                    [235, "rgb(20, 40, 170)"]
                ]
            }
        }
      }
    ]
};

// generate_radar_rastertile('result_dir/2018/2018-06-18/china_pbf/201806180930', 6, [0], true);

function generate_radar_rastertile(tile_path, maxtilezoom, idxArr, checkIdx, callback) {

    console.log('StartTime: ' + (new Date()).toLocaleString());

    var sub_dirarr = fs.readdirSync(tile_path);
    if(sub_dirarr.length > 1){

        //check idxArr
        if(checkIdx == true)
            idxArr = checkIdxArr(idxArr, tile_path);

        maxtilezoom = (maxtilezoom <= 10)?maxtilezoom:10;
        
        console.log('idxArr length: ' + idxArr.length);
        console.log('maxtilezoom: ' + maxtilezoom);
        console.log('source-layer: ' + path.basename(tile_path));
        stylejson.layers[1]["source-layer"] = path.basename(tile_path);

        var stylejsonArr = [];
        for(var ss= 0;ss < idxArr.length;ss ++){

            var newstylejson = JSON.parse(JSON.stringify(stylejson));
            newstylejson.layers[1].filter[1] = [ "==", "idx", idxArr[ss]];
            stylejsonArr.push(newstylejson);
        }
    
        var zoomArr = [];
        for(var i = 0;i < sub_dirarr.length;i ++) {
    
            // console.log('current zoom: ' + sub_dirarr[i]);
            var sub_dir = tile_path + '/' + sub_dirarr[i];
            var export_sub_dir = tile_path + '/raster/' + sub_dirarr[i];
            var stat = fs.statSync(sub_dir);
            if(stat.isDirectory()){
                zoomArr.push({zoom: parseInt(sub_dirarr[i]), zoom_dir: sub_dir, export_zoom_dir: export_sub_dir});
            }
        }

        if(zoomArr.length > 0){

            var wholePBFArr = [];

            for(var currentZoomIdx = 0;currentZoomIdx < zoomArr.length;currentZoomIdx ++){

                if(zoomArr[currentZoomIdx].zoom <= maxtilezoom) {

                    var current_zoom = zoomArr[currentZoomIdx].zoom;
                    var sub_dir = zoomArr[currentZoomIdx].zoom_dir;
                    var export_sub_dir = zoomArr[currentZoomIdx].export_zoom_dir;

                    console.log('currentZoom: ' + current_zoom);

                    var sub_sub_dirarr = fs.readdirSync(sub_dir);
                    for(var j = 0;j < sub_sub_dirarr.length;j ++) {

                        var sub_sub_dir = sub_dir + '/' + sub_sub_dirarr[j];
                        var sub_stat = fs.statSync(sub_sub_dir);
                        if(sub_stat.isDirectory()){
                            var export_sub_sub_dir = export_sub_dir + '/' + sub_sub_dirarr[j];

                            var pbf_arr = fs.readdirSync(sub_sub_dir);
                            for(var k = 0;k < pbf_arr.length;k ++){

                                var pbf = sub_sub_dir + '/' + pbf_arr[k];
                                if(path.extname(pbf) == '.pbf') {
                                    // exportPNG(pbf, sub_sub_dir + '/', export_sub_sub_dir + '/', current_zoom, sub_sub_dirarr[j], path.basename(pbf_arr[k], '.pbf'), idxArr, stylejsonArr);
                                    wholePBFArr.push({thepbf: pbf, theurl: sub_sub_dir + '/', theexporturl: export_sub_sub_dir + '/', z: current_zoom, x: sub_sub_dirarr[j],y: path.basename(pbf_arr[k], '.pbf')});
                                }
                            }
                        }
                    }
                }
            }
        }

        if(wholePBFArr.length > 0){
            console.log('wholePBFArr: ' + wholePBFArr.length);
            for(var currentpbfIdx = 0; currentpbfIdx < wholePBFArr.length; currentpbfIdx++){
                var currentpbf = wholePBFArr[currentpbfIdx];
                var islastpbf = (currentpbfIdx == (wholePBFArr.length - 1))?true:false;
                exportPNG(islastpbf, currentpbf.thepbf, currentpbf.theurl, currentpbf.theexporturl, currentpbf.z, currentpbf.x, currentpbf.y, idxArr, stylejsonArr)
            }
        }


        var result = 'Start ...';
        callback(null, result);
    }

    function exportPNG(islastpbf, thepbf, theurl, theexporturl, z, x, y, idxArr, stylejsonArr){

        z = parseInt(z);
        x = parseInt(x);
        y = parseInt(y);

        var bbox = sm.bbox(x, y, z, false, '900913');
        var center = sm.inverse([(bbox[0] + bbox[2])/2, (bbox[1] + bbox[3])/2]);

        var map = new mbgl.Map({
            request: function(req, callback) {
                fs.readFile(thepbf, function(err, data) {
                    // console.log('thepbf: ' +thepbf);
                    try {
                        data = zlib.gunzipSync(data);
                    }
                    catch(error){
                        // callback(error, null);
                    }
                    // if(data == ' '){
                    //     // console.log('data is string.');
                    // }
                    // else {
                    //     callback(err, { data: data });
                    // }
                    callback(err, { data: data });
                });
            },
            ratio: 1
        });

        mkdirs(theexporturl, null, function(err) {
            
            var pngfileArr = [];
            var currentstylejsonIdx = 0;
            loopMapRender(map, theurl, theexporturl, z, y, center, currentstylejsonIdx, stylejsonArr, idxArr, pngfileArr, islastpbf);
        });
    }
    function loopMapRender(map, theurl, theexporturl, z, y, center, currentstylejsonIdx, stylejsonArr, idxArr, pngfileArr, islastpbf){
        
        var thestylejson= stylejsonArr[currentstylejsonIdx];
        var theidx = idxArr[currentstylejsonIdx];

        map.load(thestylejson);
        map.render({zoom: z, center: center}, function(err, buffer) {
            if (err) {
                map.release();
                if(islastpbf && z == maxtilezoom){
                    console.log('EndTime: ' + (new Date()).toLocaleString());
                }
                return;
                // throw err;
            }
            // map.release();
            if(buffer) {
                var pngfile = theexporturl + y + '_' + theidx + '.png';
                pngfileArr.push(pngfile);

                var image = sharp(buffer, {
                    raw: {
                        width: 512,
                        height: 512,
                        channels: 4
                    }
                });       
                image.toFile(pngfile, function(err) {
                    if (err) throw err;
                });
            }

            if(++currentstylejsonIdx < stylejsonArr.length){
                loopMapRender(map, theurl, theexporturl, z, y, center, currentstylejsonIdx, stylejsonArr, idxArr, pngfileArr, islastpbf);
            }
            else {

                archivePNG(theexporturl + y + '.zip', pngfileArr);

                map.release();
                if(islastpbf && z == maxtilezoom){
                    console.log('EndTime: ' + (new Date()).toLocaleString());
                }
            }

        });
    }

    function archivePNG(outputdir, pngArr){

        // create a file to stream archive data to.
        var output = fs.createWriteStream(outputdir);
        var archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        output.on('close', function() {
            console.log('Archive OK: ' + outputdir);

            for(var j = 0;j < pngArr.length;j ++){
                fs.unlink(pngArr[j], function(err){
                    if (err) {
                        console.log('Error: ' + err);
                    }
                });
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', function(err) {
            status = false;
            throw err;
        });

        // pipe archive data to the file
        archive.pipe(output);

        for(var i = 0;i < pngArr.length;i ++){
            archive.file(pngArr[i], { name: path.basename(pngArr[i]) });
        }

        archive.finalize();

    }

    //Try to use mapnik, it doesn't seem work.
    // function exportPNG_old(thepbf, theurl, z, x, y){

    //     z = parseInt(z);
    //     x = parseInt(x);
    //     y = parseInt(y);

    //     if(z == 0 && x == 0 && y == 0){
    //         var vt = new mapnik.VectorTile(z,x,y);
    //         var data_buffer = fs.readFileSync(thepbf);
    //         vt.addDataSync(data_buffer);

    //         console.log(vt.x, vt.y, vt.z);
    //         console.log(vt.tileSize, vt.bufferSize);
    //         var tileSize = vt.tileSize;

    //         var map = new mapnik.Map(tileSize, tileSize);
    //         vt.render(map, new mapnik.Image(256,256), function(err, image) {
    //         if (err) throw err;   
    //             // save the rendered image to an existing image file somewhere
    //             // see mapnik.Image for available methods
    //             image.save(theurl + y +'.png', 'png32');
    //         });
    //     }

    // }

    function checkIdxArr(idxArr, tile_path) {

        if(idxArr.length < 2) {
            var metdata_dir = tile_path + '/metadata.json';
            if(fs.existsSync(metdata_dir)){
                var data = fs.readFileSync(metdata_dir, 'utf-8');
                if (data) {
                    var metadatajson = JSON.parse(data);
                    var jj = JSON.parse(metadatajson.json);
                    if(jj && jj.tilestats && jj.tilestats.layers && jj.tilestats.layers.length > 0 && jj.tilestats.layers[0].attributes){
    
                        var attributes = jj.tilestats.layers[0].attributes;
                        for(var i = 0;i < attributes.length;i ++){
                            if(attributes[i].attribute == 'idx'){
                                
                                idxArr = jj.tilestats.layers[0].attributes[i].values;
                                return idxArr;
                            }
                        }
                    }
                    else
                        return idxArr;
                }
                else
                    return idxArr;
            }
            else
                return idxArr;
        }
        else
            return idxArr;
    }

    function mkdirs(dirname, mode, callback){
        fs.exists(dirname, function (exists){
            if(exists){
                callback();
            }else{
                // console.log(path.dirname(dirname));
                mkdirs(path.dirname(dirname), mode, function (){
                    fs.mkdir(dirname, mode, callback);
                });
            }
        });
    }
}
// function deepClone(obj){
//     var result,oClass=isClass(obj);
//     if(oClass === "Object"){
//         result = {};
//     }else if(oClass === "Array"){
//         result = [];
//     }else{
//         return obj;
//     }
//     for(key in obj){
//         var copy=obj[key];
//         if(isClass(copy) == "Object"){
//             result[key] = arguments.callee(copy);
//         }else if(isClass(copy) == "Array"){
//             result[key] = arguments.callee(copy);
//         }else{
//             result[key] = obj[key];
//         }
//     }
//     return result;
// }
// function isClass(o){
//     if(o === null) return "Null";
//     if(o === undefined) return "Undefined";
//     return Object.prototype.toString.call(o).slice(8,-1);
// }

module.exports = generate_radar_rastertile;
