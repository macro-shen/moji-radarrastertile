'use strict';

//main.js 
const fs = require('fs');

var radar_rastertile = require('./radar_rastertile_generator.js');

//Deault paramaters:
// var tile_path = "result_dir/2018/2018-05-18/china_pbf/201805181500";
var tile_path = "result_dir/2018/2018-12-07/china_pbf/201812071200";
var maxtilezoom = 3;
var idxArr = [0];
var checkIdx = true;

//Update paramaters:
var args = process.argv.splice(2);
for(var i = 0;i < args.length;i ++){
    var ss = args[i].split('=');
    if(ss.length == 2){
        if(ss[0] == '--tile_path'){
            tile_path = ss[1];
        }
        else if(ss[0] == '--maxtilezoom'){
            maxtilezoom = parseInt(ss[1]);
        }
        else if(ss[0] == '--checkidx'){
            if(ss[1] == 'false')
                checkIdx = false;
        }
    }
}

radar_rastertile(tile_path, maxtilezoom, idxArr, checkIdx, function(err, result) {
    if(err == null)
        console.log('OK: ' + result);
    else
        console.log('Error: ' + err);
});

