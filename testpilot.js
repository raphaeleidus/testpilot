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

var Q = require('qq');
var path = require('path');
var Colorize = require('./lib/Colorize');
var TestRun = require('./lib/TestRun').TestRun;
var argv = require('optimist')
    .boolean('plain')
    .string('reporter')
    .default('reporter', 'console')
    .boolean('stop-on-failure')     // Stop as soon as a test fails - not yet implemented
    .boolean('show-passed')         // ConsoleReporter shows passed tests - not yet implemented
    .default('show-passed', false)
    .string('junit-output')
    .default('junit-output', 'testlog.xml')
    .argv;

var availableReporters = {
    console: require('./lib/reporters/ConsoleReporter.js').reporter,
    junit: require('./lib/reporters/JunitReporter.js').reporter
};

var reporters = argv.reporter;
if (typeof reporters == 'string') {
    reporters = [ reporters ];
}

reporters = reporters.map(function(name) {
    var Reporter = availableReporters[name];
    if (!Reporter) {
        console.error('Error: could not find a "'+name+'" reporter.');
        process.exit(1);
    }
    return new Reporter(argv);
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
//                var reporter = new ConsoleReporter();
//                reporter.report(run);

                var exitCode = 0;

                var done;
                reporters.forEach(function(reporter) {
                    done = Q.when(done, function() {
                        return reporter.report(run);
                    }).then(null, function(err) {
                        console.error('The %s reporter returned an error: %s',
                            Colorize.format(reporter.getName(), 'bold'),
                            Colorize.format(err.message || err.toString(), 'red+bold'));
                        throw err;
                    });
                });

                return Q.when(done, function() {
                    console.log();
                    if (summary.passed) {

                        console.log('All tests %s (%s tests, %s assertions)', Colorize.format('PASSED', 'green'),
                            summary.tests.total, summary.assertions.total);

                    }
                    else {

                        if (summary.aborted) {
                            console.log('%s : aborted run after setUp/tearDown failure',
                                Colorize.format('FAILED', 'red+bold')
                            );
                        }
                        else {
                            console.log('%s (%s of %s tests)',
                                Colorize.format('FAILED', 'red+bold'),
                                summary.tests.failed + summary.tests.errored,
                                summary.tests.total);
                        }

                        exitCode = 1;
                    }
                    console.log();

                    return exitCode;
                });
            }
        );

    }
).then(
    null,
    function(err) {
        return 1;
    }
).then(
    function(exitCode) {
        setTimeout(function() {
            process.exit(exitCode);
        }, 10);
    }
);
