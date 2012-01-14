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
 * Date: 1/10/12
 */


var Reporter = require('../Reporter').Reporter;

var TestSuite = require('../TestSuite').TestSuite;
var TestCase = require('../TestCase').TestCase;

var path = require('path');
var format = require('../Colorize').format;
var fs = require('../FileSystem');


function encode(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

var JunitReporter = Reporter.extend(
    {

    },
    {

        getName: function() {
            return 'JUnit';
        },

        getTestCase: function(tc) {

            var output = '';
            if (tc.getResult() != TestCase.UNTESTED) {

                output += '        <testcase name="' + encode(tc.getName()) + '"'
                    + ' time="' + (tc.getDuration() / 1000) + '">\n';

                tc.getAssertions().forEach(
                    function(assertion) {
                        if (assertion.error) {
                            output += '            <failure message="' + encode(assertion.error.toString()) + '" />\n';
                        }
                    }
                );

                var gc = tc.getGeneralError();
                if (gc) {
                    output += '            <failure message="' + encode(gc.toString()) + '" />\n';
                }

                output += '        </testcase>\n';
            }
            return output;
        },

        getTestSuite: function(ts) {
            var t = this;
            var output = '';
            if (ts.getResult() != TestSuite.UNTESTED) {

                var summary = ts.getSummary();

                output += '    <testsuite name="' + encode(ts.getName()) + '"'
                    + ' errors="' + summary.tests.errored + '"'
                    + ' failures="' + summary.tests.failed + '"'
                    + ' tests="' + summary.tests.total + '"'
                    + ' time="' + (ts.getDuration() / 1000) + '">\n';

                ts.getTests().forEach(
                    function(tc) {
                        output += t.getTestCase(tc);
                    }
                );

                output += '    </testsuite>\n';
            }

            return output;
        },

        report: function(run) {
            var t = this;

            var output = '<?xml version="1.0" encoding="UTF-8" ?>\n';
            output += '<testsuites>\n';

            run.getSuites().forEach(
                function(suite) {
                    output += t.getTestSuite(suite);
                }
            );

            output += '</testsuites>';

            var outfile = path.resolve(t.options.junitOutput);
            return fs.writeFile(outfile, output).then(
                function() {
                    console.log('\nwrote JUnit output to %s', outfile);
                },
                function(err) {
                    throw new Error('failed to write to file "'+outfile+'"');
                }
            );
        }
    }
);


exports.reporter = JunitReporter;