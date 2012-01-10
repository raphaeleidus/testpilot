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
 * Date: 1/8/12
 */

var TestSuite = require('../TestSuite').TestSuite;
var TestCase = require('../TestCase').TestCase;

var Reporter = require('../Reporter').Reporter;

var color = require('ansi-color').set;

var ConsoleReporter = Reporter.extend(
    {

    },
    {

        report: function(run) {

            run.getSuites().forEach(
                function(suite) {
                    console.log();

                    switch (suite.getResult()) {
                        case TestSuite.PASSED:
                        case TestSuite.FAILED:

                            console.log(color(suite.getName(), 'bold'));

                            suite.getTests().forEach(
                                function(test) {

                                    switch (test.getResult()) {
                                        case TestCase.PASSED:
                                            console.log(color('   Pass', 'green') + ' : %s', test.getName());
                                            break;

                                        case TestCase.FAILED:
                                            console.log(color('   FAIL', 'bold+red') + ' : %s', test.getName());

                                            switch (test.getFailure()) {
                                                case TestCase.GENERAL_ERROR:
                                                    var ge = test.getGeneralError();
                                                    console.log('      an error occurred during %s:', test.getGeneralErrorPhase());
                                                    console.log('         %s', ge.stack.split('\n').join('\n        '));
                                                    break;

                                                case TestCase.ASSERTION_FAIL:
                                                    var assertions = test.getAssertions();
                                                    assertions.forEach(
                                                        function(assertion) {
                                                            if (assertion.error) {
                                                                console.log('       %s line %s: %s',
                                                                    assertion.file,
                                                                    color(assertion.line, 'bold'),
                                                                    assertion.error.message);
                                                            }
                                                        }
                                                    );
                                                    break;

                                                case TestCase.ASSERTION_COUNT:
                                                    var foundAssertions = test.getAssertions();
                                                    console.log('      expected %s assertions, found %s:',
                                                        color(test.getExpectedAssertions(), 'bold'),
                                                        color(foundAssertions.length, 'bold'));
                                                    console.log();
                                                    foundAssertions.forEach(
                                                        function(assertion) {
                                                            console.log('         %s line %s (%s)',
                                                                assertion.file,
                                                                color(assertion.line, 'bold'),
                                                                assertion.method);
                                                        }
                                                    );
                                                    console.log();
                                                    break;
                                            }
                                            break;

                                        case TestCase.UNTESTED:
                                            console.log(color('     NT', 'yellow') + ' : %s', test.getName());
                                            break;

                                    }
                                }
                            );

                            break;

                        case TestSuite.LOAD_ERROR:

                            console.log(color(suite.getName(), 'red+bold'));

                            console.log('   an error occurred while loading this file:');
                            console.log('         %s', suite.getLoadError().stack.split('\n').join('\n        '));

                            break;

                        case TestSuite.UNTESTED:
                            console.log(color(suite.getName(), 'yellow+bold'));
                            break;

                    }

                }
            );

        }
    }
);


exports.reporter = ConsoleReporter;