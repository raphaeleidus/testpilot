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

var Q = require('qq');

var TestSuite = require('../TestSuite').TestSuite;
var TestCase = require('../TestCase').TestCase;

var Reporter = require('../Reporter').Reporter;

var format = require('../Colorize').format;

var ConsoleReporter = Reporter.extend(
    {

    },
    {

        getName: function() {
            return 'Console';
        },

        report: function(run) {
            var t = this;

            var showPassed = t.options['show-passed'];

            if (showPassed || !run.getSummary().passed) {

                console.log();
                console.log(format('==================== Results ====================', 'bold'));

                run.getSuites().forEach(
                    function(suite) {

                        switch (suite.getResult()) {
                            case TestSuite.PASSED:
                                if (!showPassed) {
                                    break;
                                }
                            case TestSuite.FAILED:

                                console.log();
                                console.log(format(suite.getName(), 'bold'));

                                suite.getTests().forEach(
                                    function(test) {

                                        switch (test.getResult()) {
                                            case TestCase.PASSED:
                                                if (showPassed) {
                                                    console.log(format('   Pass', 'green') + ' : %s', test.getName());
                                                }
                                                break;

                                            case TestCase.FAILED:
                                                console.log(format('   FAIL', 'bold+red') + ' : %s', test.getName());

                                                switch (test.getFailure()) {
                                                    case TestCase.SETUP_TEARDOWN_ERROR:
                                                    case TestCase.GENERAL_ERROR:
                                                        var ge = test.getGeneralError();
                                                        console.log('      an %s occurred during %s:',
                                                            test.getGeneralErrorUncaught() ? format('uncaught error', 'bold+red') : 'error',
                                                            test.getGeneralErrorPhase());
                                                        console.log('         %s', ge.stack.split('\n').join('\n        '));
                                                        break;

                                                    case TestCase.ASSERTION_FAIL:
                                                        var assertions = test.getAssertions();
                                                        assertions.forEach(
                                                            function(assertion) {
                                                                if (assertion.error) {
                                                                    t.printAssertionFailure(assertion);
                                                                    console.log();
                                                                }
                                                            }
                                                        );
                                                        break;

                                                    case TestCase.ASSERTION_COUNT:
                                                        var foundAssertions = test.getAssertions();
                                                        console.log('      expected %s assertions, found %s:',
                                                            format(test.getExpectedAssertions(), 'bold'),
                                                            format(foundAssertions.length, 'bold'));
                                                        console.log();
                                                        foundAssertions.forEach(
                                                            function(assertion) {
                                                                console.log('         %s line %s (%s)',
                                                                    assertion.file,
                                                                    format(assertion.line, 'bold'),
                                                                    assertion.method);
                                                            }
                                                        );
                                                        console.log();
                                                        break;
                                                }
                                                break;

                                        }
                                    }
                                );

                                break;

                            case TestSuite.LOAD_ERROR:

                                console.log(format(suite.getName(), 'red+bold'));

                                console.log('   an error occurred while loading this file:');
                                console.log('         %s', suite.getLoadError().stack.split('\n').join('\n        '));

                                break;

                        }

                    }
                );
            }

            return Q.ref();
        },

        printAssertionFailure: function(assertion) {
            if (assertion.error.message) {
                console.log('       %s line %s: %s: %s',
                    assertion.file,
                    format(assertion.line, 'bold'),
                    assertion.error.name,
                    assertion.error.message);
                console.log('          %s %s %s',
                    this.formatOperand(assertion.error.actual),
                    assertion.error.operator,
                    this.formatOperand(assertion.error.expected));
            } else {
                console.log('       %s line %s: %s: %s %s %s',
                    assertion.file,
                    format(assertion.line, 'bold'),
                    assertion.error.name,
                    this.formatOperand(assertion.error.actual),
                    assertion.error.operator,
                    this.formatOperand(assertion.error.expected)
                );
            }
        },

        formatOperand: function(op) {
            switch (typeof op) {
                case 'string':
                    return op.length ? op : '(empty string)';
                    break;
                case 'number':
                    return format(op, 'blue');
                    break;
                case 'object':
                    try {
                        return JSON.stringify(op);
                    } catch (e) {
                        return '(cyclic object)';
                    }
                    break;
                case 'undefined':
                    return 'undefined';
                    break;
                case 'function':
                    return op.toString().substr(0, 50);
                    break;
                default:
                    return op;
            }
        }

    }
);


exports.reporter = ConsoleReporter;