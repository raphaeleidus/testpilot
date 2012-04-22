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

var Q = require('q');
var path = require('path');
var Colorize = require('./lib/Colorize');
var TestRun = require('./lib/TestRun').TestRun;

var availableReporters = {
    console: require('./lib/reporters/ConsoleReporter.js').reporter,
    junit: require('./lib/reporters/JunitReporter.js').reporter
};

var reporterNames = Object.keys(availableReporters);


// Configure command-line option parsing with nomnom

var nomnom = require('nomnom');
nomnom.options({
    reporter: {
        help: 'reporter to use [' + reporterNames.join('|') + ']',
        abbr: 'r',
        list: true,
        choices: reporterNames,
        'default': 'console'
    },
    'stopOnFailure': {
        help: 'stop immediately if a test fails',
        flag: true,
        full: 'stop-on-failure'
    },
    plain: {
        help: 'output only plain text, no colors or styles (console reporter)',
        flag: true
    },
    'all': {
        help: 'all tests, not just failures (console reporter)',
        flag: true
    },
    'filter': {
        help: 'only run test cases with names matching the given pattern',
        hidden: true // not yet implemented
    },
    'junitOutput': {
        help: 'file path for JUnit XML output, defaults to testlog.xml (junit reporter)',
        full: 'junit-output',
        'default': 'testlog.xml'
    },
    'paths': {
        help: 'files and directories to test',
        position: 0,
        list: true,
        required: true
    }
}).help(
    'Testpilot will accept any number of paths, and will recursively scan\n' +
    'directories. Test files must have names ending in "Test.js".'
).colors();

var opts = nomnom.parse();

var reporters = opts.reporter;
if (typeof reporters == 'string') {
    reporters = [ reporters ];
}

reporters = reporters.map(function(name) {
    var Reporter = availableReporters[name];
    if (!Reporter) {
        console.error('Error: could not find a "'+name+'" reporter.');
        process.exit(1);
    }
    return new Reporter(opts);
});



if (opts.plain) {
    Colorize.useColor(false);
}

var run = new TestRun();

// any unnamed arguments are interpreted as paths
Q.all(opts.paths.map(function(p) {
    return run.addPath(p);
})).then(
    function() {
        if (run.getSuites().length == 0) {
            console.log('\n%s : could not find any test files\n',
                Colorize.format('FAILED', 'red+bold')
            );
            return 1;
        }

        return run.run(opts).then(
            function(summary) {

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

                    var dur = run.getDuration();
                    dur = (dur > 1000) ? ((dur/1000) + ' s') : (dur + ' ms');

                    console.log();
                    if (summary.passed) {

                        console.log('All tests %s (%s tests, %s assertions)  -  %s', Colorize.format('PASSED', 'green'),
                            summary.tests.total, summary.assertions.total, dur
                        );

                    }
                    else {

                        if (summary.aborted) {
                            console.log('%s : aborted run after setUp/tearDown failure',
                                Colorize.format('FAILED', 'red+bold')
                            );
                        }
                        else {
                            console.log('%s (%s of %s tests)  -  %s',
                                Colorize.format('FAILED', 'red+bold'),
                                summary.tests.failed + summary.tests.errored,
                                summary.tests.total, dur);
                        }

                        exitCode = 1;
                    }

                    if (summary.tests.skipped) {
                        console.log('%s %s tests',
                            Colorize.format('SKIPPED', 'yellow+bold'),
                            summary.tests.skipped);
                    }

                    console.log();

                    return exitCode;
                });
            }
        );

    }
).then(
    function(exitCode) {
        setTimeout(function() {
            process.exit(exitCode);
        }, 10);
    }
).end();    // terminate the chain to ensure all errors are reported. An error reported here
            // generally indicates a bug in Testpilot, not in the code under test
