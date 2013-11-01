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

var Q = require('q');
var util = require('util');

var TestSuite = require('../TestSuite').TestSuite;
var TestCase = require('../TestCase').TestCase;

var Reporter = require('../Reporter').Reporter;

var format = require('../Colorize').format;

var ConsoleReporter = Reporter.extend(
    {

    },
    {

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the name of this reporter.
         */
        getName: function() {
            return 'Console';
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report on a finished test run.
         *
         * @param run finished TestRun
         */
        report: function(run) {
            var t = this;

            var showPassed = t.options['all'];

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
                                                    console.log(t.reportPassedTest(test, 3));
                                                }
                                                break;

                                            case TestCase.FAILED:
                                                console.log(t.reportFailedTest(test, 3));
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

            return Q();
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Format an assertion operand.
         *
         * @param op operand
         */
        formatOperand: function(op) {
            switch (typeof op) {
                case 'boolean':
                    return op ? 'true' : 'false';
                    break;
                case 'string':
                    return op.length ? op : format('(empty string)', 'magenta');
                    break;
                case 'number':
                    return format(op, 'blue');
                    break;
                case 'object':
                    // Use JSON stringify in pretty-printing mode to format the object. Stringify
                    // does not preserve undefined values, so a replacer is used to turn undefined
                    // into ||UNDEFINED||, which is then converted back into the string undefined,
                    // without quotes.
                    return JSON.stringify(
                        op,
                        function(key, val) { return val === undefined ? '||UNDEFINED||' : val; },
                        3
                    ).replace(/"\|\|UNDEFINED\|\|"/g, 'undefined');
                    break;
                case 'undefined':
                    return 'undefined';
                    break;
                case 'function':
                    return op.toString();
                    break;
                default:
                    return op;
            }
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report that the given test passed.
         *
         * @param test
         */
        reportPassedTest: function(test, indent) {
            return this.pad(indent) + format('Pass', 'green') + ' : ' + test.getName();
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report that the given test failed, then go on to provide details.
         *
         * @param test
         */
        reportFailedTest: function(test, indent) {
            var output = this.pad(indent) + format('FAIL', 'bold+red') + ' : ' + test.getName() + '\n';

            switch (test.getFailure()) {
                case TestCase.SETUP_TEARDOWN_ERROR:
                case TestCase.GENERAL_ERROR:
                    output += this.reportGeneralError(test, indent+3);
                    break;

                case TestCase.ASSERTION_FAIL:
                    output += this.reportAssertionFailures(test, indent+3);
                    break;

                case TestCase.ASSERTION_COUNT:
                    output += this.reportAssertionCountMismatch(test, indent+3);
                    break;
            }

            return output;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report details concerning a general error for the given test.
         *
         * @param test
         */
        reportGeneralError: function(test, indent) {
            return util.format('%san %s occurred during %s:\n%s',
                this.pad(indent),
                test.getGeneralErrorUncaught() ? format('uncaught error', 'bold+red') : 'error',
                test.getGeneralErrorPhase(),
                this.reportErrorTrace(test.getGeneralError(), indent+3)
            );
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report assertion failure details for the given test.
         *
         * @param test
         */
        reportAssertionFailures: function(test, indent) {
            var t = this;
            var output = '';
            var assertions = test.getAssertions();
            var failures = [];
            assertions.forEach(
                function(assertion) {
                    if (assertion.error) {
                        failures.push(t.reportAssertionFailure(assertion, indent));
                    }
                }
            );
            output += failures.join('\n');
            return output;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Format a failed assertion message.
         *
         * @param assertion
         */
        reportAssertionFailure: function(assertion, indent) {
            var output = this.pad(indent) + assertion.error.name + ' at ' + this.reportAssertionLocation(assertion);
            if (assertion.error.message) {
                output += ': ' + assertion.error.message + '\n\n';
            } else {
                output += '\n\n';
            }
            output += this.reportActualVsExpected(
                assertion.error.operator,
                assertion.error.actual,
                assertion.error.expected, indent+3);
            return output;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Format an assertion location message (filename at line number).
         *
         * @param assertion
         * @param indent how many spaces to indent
         */
        reportAssertionLocation: function(assertion, indent) {
            return this.pad(indent) + assertion.file + ' line ' + format(assertion.line, 'bold')
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Format a side-by-side comparison of actual and expected values, with
         * the op in the middle.
         *
         * @param op
         * @param actual
         * @param expected
         * @param indent
         */
        reportActualVsExpected: function(op, actual, expected, indent) {
            actual = this.formatOperand(actual);
            expected = this.formatOperand(expected);
            var actBox = this.boxifyString(actual);
            var expBox = this.boxifyString(expected);
            var height = Math.max(actBox.rows, expBox.rows);

            var output = '';
            var opLine = Math.min(Math.floor(height / 2.1), 10);
            var opString = '   ' + op + '   ';
            for (var line = 0; line < height; line++) {
                output += this.pad(indent);
                output += (line < actBox.rows ? actBox.lines[line] : this.pad(actBox.cols));
                output += (line == opLine ? format(opString, 'bold') : this.pad(opString.length));
                output += (line < expBox.rows ? expBox.lines[line] : this.pad(expBox.cols));
                output += '\n';
            }
            return output;
        },

        /**
         * Figure out the row and column count for the given (generally multiline)
         * string, and return an object with "rows", "cols", and "lines" keys.
         * Rows and cols are integers, and lines is an array of the strings lines,
         * each padded out to be cols columns wide.
         *
         * @param string
         */
        boxifyString: function(string) {
            var t = this;
            var lines = (string+'').split('\n');
            var ret = {
                rows: lines.length,
                cols: 0,
                lines: []
            };
            lines.forEach(function(line) {
                ret.cols = Math.max(line.length, ret.cols);
            });
            lines.forEach(function(line) {
                ret.lines.push(line + t.pad(ret.cols-line.length));
            });
            return ret;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report an assertion count mismatch failure for the given test.
         * 
         * @param test
         * @param indent how many spaces to indent
         */
        reportAssertionCountMismatch: function(test, indent) {
            var t = this;
            var foundAssertions = test.getAssertions();
            var output = util.format('%sexpected %s assertions, found %s:\n',
                this.pad(indent),
                format(test.getExpectedAssertions(), 'bold'),
                format(foundAssertions.length, 'bold'));

            foundAssertions.forEach(
                function(assertion) {
                    output += t.reportAssertionLocation(assertion, indent+3) + '\n';
                }
            );

            return output;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Report an error trace.
         *
         * @param err
         * @param indent how many spaces to indent
         */
        reportErrorTrace: function(err, indent) {
            return this.pad(indent) + err.stack.split('\n').join('\n'+this.pad(indent));
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return a string consisting of len space characters.
         *
         * @param len
         */
        pad: function(len) {
            var ret = '';
            if (typeof len == 'number') {
                for (var i = 0; i < len; i++) {
                    ret += ' ';
                }
            }
            return ret;
        }


    }
);


exports.reporter = ConsoleReporter;
