'use strict';

var _ = require('lodash')
var program = require('commander');
var async = require('async');
var glob = require('glob');
var util = require('util');
var path = require('path');
var chalk = require('chalk');
var moment = require('moment');
var gm = require('gm');
var pkg = require('./package.json');

program
    .usage('[directory] [directory] [directory]')
    .version(pkg.version)
    .option('-f, --filter <extensions>', 'Filter by these file extensions', 'png jpg gif ico')
    .option('-v, --verbose', 'More output please')
    .parse(process.argv);

var no = function () {}
var w = function () { process.stdout.write(util.format.apply(util, arguments)); }
var wl = console.log.bind(console);
var vw = program.verbose ? w : no;
var vwl = program.verbose ? wl : no;

var directories = program.args;
if (directories.length === 0) {
    directories.push('.');
}

var extensions = program.extensions.split(/[, ]+/).join(',') || '*';
var filetypes = util.format('**/*.{%s}', extensions);

vw('Looking up files' + (extensions === '*' ? '' : ', filtered by ' + chalk.blue(extensions)) + '...');

async.waterfall([
    async.apply(async.map, directories, globber),
    join,
    stats
], print);

function globber (directory, done) {
    var pattern = path.resolve(__dirname, directory, filetypes);
    glob(pattern, done);
}

function join (lists, done) {
    vwl('done.');
    done(null, _.union(lists));
}

function stats (files, done) {
    var start = moment();

    vw('Processing %s (%s) file(s)...', chalk.magenta(files.length), chalk.blue(extensions));

    async.each(files, stat, finish);

    function finish (err, done) {
        if (err) { return done(err); }

        vwl(chalk.green('done in %s.'), moment.from(start, true));
        done();
    }
}

function stat (file, done) {
    var magic = gm(file);

    async.parallel({
        name: async.apply(name, file),
        size: async.apply(magic.size),
        format: async.apply(magic.format),
        color: async.apply(magic.color),
        depth: async.apply(magic.depth),
        resolution: async.apply(magic.res),
        filesize: async.apply(magic.filesize),
        orientation: async.apply(magic.orientation)
    }, done);
}

function name (file, done) {
    var relative = path.relative(__dirname, file);
    done(null, relative);
}

function print (err, stats) {
    if (err) { throw err; }

    _.each(stats, function (stat) {
        wl('%s: [%s %s] {%s %s} <%s> %s (%s)', name, size, resolution, color, depth, orientation, format, size);
    });
}
