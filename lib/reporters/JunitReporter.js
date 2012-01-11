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

var path = require('path');
var format = require('../Colorize').format;
var Qfs = require('q-fs');

var JunitReporter = Reporter.extend(
    {

    },
    {

        getName: function() {
            return 'JUnit';
        },

        getTestCase: function(tc) {
            var output = '        <testcase name="' + tc.getName() + '">\n';

            tc.getAssertions().forEach(
                function(assertion) {
                    if (assertion.error) {
                        output += '            <failure message="' + assertion.error.toString() + '" />\n';
                    }
                }
            );

            output += '        </testcase>\n';
            return output;
        },

        getTestSuite: function(ts) {
            var t = this;

            var summary = ts.getSummary();

            var output = '    <testsuite name="' + ts.getName() + '"'
                + ' tests="' + summary.tests.total + '"'
                + ' failures="' + summary.tests.failed + '">\n';

            ts.getTests().forEach(
                function(tc) {
                    output += t.getTestCase(tc);
                }
            );

            output += '    </testsuite>\n';
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

            output += '</testsuites>\n';

            var outfile = path.resolve(t.options['junit-output']);
            return Qfs.write(outfile, output).then(
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