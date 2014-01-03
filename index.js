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
    .option('-f, --filter <extensions>', 'Filter by these file <extensions>', 'png jpg gif ico')
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

var extensions = program.filter.split(/[, ]+/).join(',') || '*';
var filetypes = util.format('**/*.{%s}', extensions);

vwl('Looking up files' + (extensions === '*' ? '' : ', filtered by ' + chalk.blue(extensions)) + '...');

async.waterfall([
    async.apply(async.map, directories, globber),
    join,
    stats
], print);

function globber (directory, done) {
    var pattern = path.join(directory, filetypes);
    vwl('Globbing', pattern);
    glob(pattern, done);
}

function join (lists, done) {
    done(null, _.flatten(lists));
}

function stats (files, done) {
    var start = moment();

    vw('Processing %s (%s) file(s)...', chalk.magenta(files.length), chalk.blue(extensions));

    async.eachLimit(files, 10, stat, finish);

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
        size: async.apply(magic.size.bind(magic)),
        format: async.apply(magic.format.bind(magic)),
        color: async.apply(magic.color.bind(magic)),
        depth: async.apply(magic.depth.bind(magic)),
        resolution: async.apply(magic.res.bind(magic)),
        filesize: async.apply(magic.filesize.bind(magic)),
        orientation: async.apply(magic.orientation.bind(magic))
    }, done);
}

function name (file, done) {
    var relative = path.relative(process.cwd(), file);
    done(null, relative);
}

function print (err, stats) {
    if (err) { throw err; }

    _.each(stats, function (stat) {
        wl('%s: [%s %s] {%s %s} <%s> %s (%s)',
            stat.name,
            stat.size,
            stat.resolution,
            stat.color,
            stat.depth,
            stat.orientation,
            stat.format,
            stat.size
        );
    });
}
