/**
 * Copyright (c) 2011 Sitelier Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Author: Chris Osborn
 * Date: 1/2/12
 */

var path = require('path');
var argv = require('optimist')
    .usage('Usage: $0 --plain -- paths')
    .boolean('plain')
    .describe('plain', 'plain console output, no color')
    .argv;

var Colorize = require('./lib/Colorize');

var TestRun = require('./lib/TestRun').TestRun;
var ConsoleReporter = require('./lib/reporters/ConsoleReporter.js').reporter;

var Q = require('qq');


// exit and uncaughtException handlers: These should not be necessary,
// but are here temporarily to help debug a problem apparently
// affecting node > 0.5.0

var onExit = function() {
    console.log('Exiting prematurely!');
};
process.on('exit', onExit);

process.on('uncaughtException', function(err) {
    console.log('Uncaught exception!');
    console.log(err.message);
    console.log(err.stack);
});

if (argv.plain) {
    Colorize.useColor(false);
}


var run = new TestRun();

// any unnamed arguments are interpreted as paths
Q.all(argv._.map(function(p) {
    return run.addPath(p);
})).then(
    function() {
        return run.run().then(
            function(summary) {

                // only ConsoleReporter supported for now
                var reporter = new ConsoleReporter();
                reporter.report(run);

                var exitCode = 0;
                console.log();
                if (summary.passed) {

                    console.log('All tests %s (%s tests, %s assertions)', Colorize.format('PASSED', 'green'),
                        summary.tests.total, summary.assertions.total);
                    console.log();

                } else {

                    console.log('%s (%s of %s tests, %s of %s assertions)',
                        Colorize.format('FAILED', 'red+bold'),
                        summary.tests.failed, summary.tests.total,
                        summary.assertions.failed, summary.assertions.total);
                    console.log();

                    exitCode = 1;
                }

                return exitCode;
            }
        );

    }
).then(
    null,
    function(err) {
        console.log(err.message);
        console.log(err.stack);
        return 1;
    }
).then(
    function(exitCode) {
        setTimeout(function() {
            process.removeListener('exit', onExit);
            process.exit(exitCode);
        }, 10);
    }
);
