var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var app = express();
const path = require("path");


//http://localhost:9095/mojidemo_radar2.html?type=localvectortile&currenttimestring=201705311736
//http://localhost:9095/mojidemo.html?radius=100&zerodata=true
//https://www.mapbox.cn/bites/011/mojidemo.html?radius=100&zerodata=true

// serve static files
app.use(express.static(__dirname + '/public'));

app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	if (req.method == "OPTIONS") res.send(200);
	else next();
});


var output_path = 'result_dir/';
var filetemplate = 'yyyyMMddhhmm.000.png';
var subpathtemplate = 'yyyy/yyyy-MM-dd/';
var outputsubpath = 'china_pbf/';
app.get('/ajax/tilejson', function(req, res) {

	//201705311342
	var p = req.originalUrl.substr(req.originalUrl.indexOf('?') + 1);

    var startDate = convertString2Date(0, p);
	var newoutput_path = output_path + formatDate(startDate, subpathtemplate) + outputsubpath + formatDate(startDate, path.basename(filetemplate, '.000.png')) + '/';
	var filelocal = newoutput_path  + 'metadata.json';

	console.log('filelocal: ' + filelocal);

	fs.readFile(filelocal, function(err, data) {
		if (err) {
			res.send("Error: No data: ");
		} else {
			// var resultstr = JSON.stringify(data);
			// console.log('resultstr: ' + data);
			res.send(JSON.parse(data));
		}
	});
	
});

app.get('/ajax/mojitiles', function(req, res) {

	//http://localhost:9094/ajax/mojitiles?201705311342/4/13/6.pbf
	var filelocal = req.originalUrl.substr(req.originalUrl.indexOf('?') + 1);
	var startDate = convertString2Date(0, filelocal.substr(0, 12));
	var newoutput_path = output_path + formatDate(startDate, subpathtemplate) + outputsubpath;
	
	filelocal = newoutput_path  + filelocal;
	console.log('filelocal: ' + filelocal);

	fs.readFile(filelocal, function(err, data) {
		if (err) {
			res.send("Error: No data: ");
		} else {

            res.setHeader("Content-Encoding", "gzip");
            res.setHeader('Content-Type', 'application/x-protobuf');//res.setHeader('Content-Type', 'application/gzip');
			res.send(data);
		}
	});

});
app.get('/ajax/mojirastertiles', function(req, res) {

	//http://localhost:9094/ajax/mojitiles?201705311342/4/13/6.png
	var filelocal = req.originalUrl.substr(req.originalUrl.indexOf('?') + 1);
	var startDate = convertString2Date(0, filelocal.substr(0, 12));
	var newoutput_path = output_path + formatDate(startDate, subpathtemplate) + outputsubpath;
	
	filelocal = newoutput_path  + filelocal;
	console.log('filelocal: ' + filelocal);

	fs.readFile(filelocal, function(err, data) {
		if (err) {
			res.send("Error: No data: ");
		} else {

            // res.setHeader("Content-Encoding", "gzip");
            // res.setHeader('Content-Type', 'application/x-protobuf');//res.setHeader('Content-Type', 'application/gzip');
			res.send(data);
		}
	});

});

app.get('/ajax/sunsettiles', function(req, res) {

	var filelocal = req.originalUrl.substr(req.originalUrl.indexOf('?') + 1);
	
	filelocal = 'sunsetglowdata/result/'  + filelocal;
	console.log('filelocal: ' + filelocal);

	fs.readFile(filelocal, function(err, data) {
		if (err) {
			res.send("Error: No data: ");
		} else {

            res.setHeader("Content-Encoding", "gzip");
            res.setHeader('Content-Type', 'application/x-protobuf');//res.setHeader('Content-Type', 'application/gzip');
			res.send(data);
		}
	});

});

// start listening
app.listen('9095', function() {
	console.log('Listening on port 9095 for moji project');
});


function formatDate(date, fmt) {
    var o = {
        "M+": date.getMonth() + 1, //月份 
        "d+": date.getDate(), //日 
        "h+": date.getHours(), //小时 
        "m+": date.getMinutes(), //分 
        "s+": date.getSeconds(), //秒 
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
        "S": date.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function convertString2Date(type, str) {
    
    if (type == 0) { //201711010633

        var YYYY = parseInt(str.substr(0, 4));
        var MM = parseInt(str.substr(4, 2));
        var DD = parseInt(str.substr(6, 2));
        var HH = parseInt(str.substr(8, 2));
        var mm = parseInt(str.substr(10, 2));
        var a = new Date(YYYY, MM - parseInt(1), DD, HH, mm, 0);
        return a;
    }
    else if (type == 1) { //2016-04-25T04:10:00.000Z
        var strArray = str.split("T");
        var strDate = strArray[0].split("-");
        var strTime = strArray[1].split(":");
        var strSecond = strTime[2].split(".");
        var a = new Date(strDate[0], (strDate[1] - parseInt(1)), strDate[2], strTime[0], strTime[1], strSecond[0]);

        return a;
    } else if (type == 2) { //2016-07-26 14:51:51
        var strArray = str.split(" ");
        var strDate = strArray[0].split("-");
        var strTime = strArray[1].split(":");
        var a = new Date(strDate[0], (strDate[1] - parseInt(1)), strDate[2], strTime[0], strTime[1], strTime[2]);

        return a;
    } else if (type == 3) { //2016-07-26
        var strDate = str.split("-");
        var a = new Date(strDate[0], (strDate[1] - parseInt(1)), strDate[2], 0, 0, 0);

        return a;
    }

    return (new Date());
}