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
var unk = /unknown/i;
var start;

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
], finish);

function globber (directory, done) {
    var pattern = path.join(directory, filetypes);
    vwl('Globbing', pattern);
    glob(pattern, done);
}

function join (lists, done) {
    done(null, _.flatten(lists));
}

function stats (files, done) {
    vwl('Processing %s (%s) file(s)...', chalk.magenta(files.length), chalk.blue(extensions));
    start = moment();
    async.eachLimit(files, 10, stat, done);
}

function stat (file, done) {
    var magic = gm(file);

    async.waterfall([
        async.apply(async.parallel, {
            name: async.apply(name, file),
            size: async.apply(magic.size.bind(magic)),
            format: async.apply(magic.format.bind(magic)),
            color: async.apply(magic.color.bind(magic)),
            depth: async.apply(magic.depth.bind(magic)),
            resolution: async.apply(magic.res.bind(magic)),
            filesize: async.apply(magic.filesize.bind(magic)),
            orientation: async.apply(magic.orientation.bind(magic))
        }),
        print
    ], done);
}

function name (file, done) {
    var relative = path.relative(process.cwd(), file);
    done(null, relative);
}

function print (stat, done) {

    wl('%s: %s %s %s %s',
        chalk.yellow(stat.name),
        chalk.green(util.format('[%sx%s%s]',
            stat.size.width,
            stat.size.height,
            stat.resolution ? ', r: ' + stat.resolution : ''
        )),
        chalk.cyan(util.format('{ c: 0x%s, d: 0x%s }',
            stat.color.toString(16),
            stat.depth.toString(16)
        )),
        unk.test(stat.orientation) ?
            '' : chalk.red(util.format('<%s>', stat.orientation))
        ,
        chalk.magenta(util.format('%s (%s)',
            stat.format,
            stat.filesize.split(/[a-z]/).shift()
        ))
    );

    done();
}

function finish (err) {
    if (err) {
        w(chalk.red('» '));
        throw err;
    }

    vwl(chalk.green('»') + ' Done in %s.', chalk.yellow(moment.from(start, true)));
    done();
}
