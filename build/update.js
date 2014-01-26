var glob = require('glob');
var fs = require('fs');

var ROOT = "../src/";
var OUTPUT_PORTAL = "qtek-physics.js";

var template = fs.readFileSync("qtek_physics_tpl.js", "utf-8")

var ignoreList = ['AmmoEngineWorker.js', 'AmmoEngineConfig.js'];

glob("**/*.js", {
    cwd : ROOT
}, function(err, files){

    var namespace = {};

    files.forEach(function(file){
        if(file.match(/qtek-physics.*?\.js/) || file === "text.js"){
            return;
        } else if (ignoreList.indexOf(file) >= 0) {
            return;
        }
        var filePathWithOutExt = file.slice(0, -3);
        var pathArray = filePathWithOutExt.split("/");
        var baseName = pathArray.pop();

        var object = pathArray.reduce(function(memo, propName){
            if( ! memo[propName] ){
                memo[propName] = {};
            }
            return memo[propName];
        }, namespace);
        
        object[baseName] = "__require('qtek/physics/"+filePathWithOutExt+"')__";
    })

    var jsString = JSON.stringify( namespace, null, '\t' );
    jsString = jsString.replace(/\"\__require\((\S*?)\)__\"/g, 'require($1)')

    var output = template.replace(/\{\{\$exportsObject\}\}/, jsString);

    fs.writeFileSync( ROOT+OUTPUT_PORTAL, output, "utf-8");
});