var glob = require('glob');
var fs = require('fs');

var ignoreList = ['AmmoEngineWorker.js', 'AmmoEngineConfig.js', 'thirdparty/'];

module.exports = function(grunt){

    includeList = [];

    function makeRequirejsConfig(isAMD) {
        var common = {
            'baseUrl' : './src',
            'name' : 'qtek-physics',
            'exclude' : ['text'],
            'paths' : {
                'glmatrix' : '../../qtek/thirdparty/gl-matrix'
            },
            'optimize':"none",
            'onBuildWrite' : function(moduleName, path, content){
                // Remove the text plugin and convert to a normal module
                // Or the text plugin will have some problem when optimize the project based on qtek which also has a text plugin
                // https://groups.google.com/forum/?fromgroups#!msg/requirejs/jiaDogbA1EQ/jKrHL0gs21UJ
                // http://stackoverflow.com/questions/10196977/how-can-i-prevent-the-require-js-optimizer-from-including-the-text-plugin-in-opt
                content = content.replace(/define\([\'\"]text\!(.*?)[\'\"]/g, "define('$1'");
                // in dependencies
                content = content.replace(/define\((.*?)\[(.*?)\]/g, function(str, moduleId, dependencies){
                    dependencies = dependencies.split(",");
                    for(var i = 0; i < dependencies.length; i++){
                        if(dependencies[i]){
                            dependencies[i] = dependencies[i].replace(/[\'\"]text\!(.*?)[\'\"]/, "'$1'");
                        }
                    }
                    return "define(" + moduleId + "[" + dependencies.join(",") + "]";
                })
                content = content.replace(/require\([\'\"]text\!(.*?)[\'\"]\)/g, "require('$1')");
                return content;
            }
        }

        if (isAMD) {
            common.out = 'dist/qtek-physics.amd.js';
            common.include = includeList;
            common.exclude.push('glmatrix');
            common.exclude.push('qtek');
            common.packages = [{
                name : 'qtek-physics',
                location : '.',
                main : 'qtek-physics.amd'
            }, {
                name: 'qtek',
                location: '../../qtek/src',
                main: 'qtek'
            }]
        } else {
            common.out = 'dist/qtek-physics.js';
            common.packages = [{
                name : 'qtek-physics',
                location : '.',
                main : 'qtek-physics'
            }, {
                name: 'qtek',
                location: '../../qtek/src',
                main: 'qtek'
            }];
            common.wrap = {
                'startFile' : ['build/wrap/start.js', 'build/almond.js'],
                'endFile' : 'build/wrap/end.js'
            }
        }

        return common;
    }

    grunt.initConfig({
        jshint : {
            all : ["src/*.js"]
        },
        uglify : {
            all : {
                files : {
                    'dist/qtek-physics.min.js' : ['dist/qtek-physics.js']
                }
            },
            amd : {
                files : {
                    'dist/qtek-physics.amd.min.js' : ['dist/qtek-physics.amd.js']
                }
            }
        },
        requirejs : {
            all : {
                options : makeRequirejsConfig()
            },
            amd : {
                options : makeRequirejsConfig(true)
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['requirejs:all', 'uglify:all']);
    grunt.registerTask('amd', 'Building...', function() {
        var done = this.async();
        glob("**/*.js", {
            cwd : './src'
        }, function(err, files){
            files.forEach(function(file){
                if(file.match(/qtek-physics.*?\.js/) || file === "text.js"){
                    return;
                } else if (
                    ignoreList.filter(function(item) {return file.match(item)}).length > 0
                ) {
                    return;
                }
                includeList.push('qtek-physics/' + file.replace(/\.js$/, ''));
            });

            grunt.task.run(['requirejs:amd', 'uglify:amd']);
            done();
        });
    });
}