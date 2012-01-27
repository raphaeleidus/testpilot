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


var TestCase = require('../../../lib/TestCase').TestCase;
var AssertRecord = require('../../../lib/AssertRecord').AssertRecord;
var ConsoleReporter = require('../../../lib/reporters/ConsoleReporter').reporter;

var MonkeyPatcher = require('capsela-util').MonkeyPatcher;
var fs = require('../../../lib/FileSystem');
var Colorize = require('../../../lib/Colorize');

var content;
var reporter;

exports['reporting'] = {

    setUp: function(cb) {
        MonkeyPatcher.setUp();

        // make sure every test takes 25 ms
        var time = 0;
        MonkeyPatcher.patch(Date, 'now', function() {
            time += 25;
            return time;
        });

        content = '';
        reporter = new ConsoleReporter({});

        MonkeyPatcher.patch(process.stdout, 'write', function(clw) {
            content += clw;
        });

        // patch the colorizer module to return HTML-esque tags rather than ANSI
        // color codes, for easier test output comparison
        MonkeyPatcher.patch(Colorize, 'wrapString', function(str, color) {
            return '<'+color+'>'+str+'</'+color+'>';
        });

        cb();
    },

    tearDown: MonkeyPatcher.tearDown,

    'report passed test': function(test) {

        var tc = new TestCase('Test A', function(test) {
            test.done();
        });

        test.equal(reporter.reportPassedTest(tc, 3), '   <green>Pass</green> : Test A');

        test.done();
    },

    'report failed test (general)': function(test) {

        var tc = new TestCase('Test A', function(test) {
            throw new Error('blah');
        });

        return tc.run().then(
            function() {

                reporter.reportGeneralError = function(testcase, indent) {
                    test.equal(indent, 5);
                    return '(general error info)';
                };

                test.equal(reporter.reportFailedTest(tc, 2),
                    '  <bold+red>FAIL</bold+red> : Test A\n(general error info)'
                );
            }
        );
    },

    'report failed test (assertion failures)': function(test) {

        var tc = new TestCase('Test A', function(test) {
            test.equal(1, 2);
            test.done();
        });

        return tc.run().then(
            function() {

                reporter.reportAssertionFailures = function(testcase, indent) {
                    test.equal(indent, 5);
                    return '(assertion failure info)';
                };

                test.equal(reporter.reportFailedTest(tc, 2),
                    '  <bold+red>FAIL</bold+red> : Test A\n(assertion failure info)'
                );
            }
        );
    },

    'report failed test (assertion count mismatch)': function(test) {

        var tc = new TestCase('Test A', function(test) {
            test.expect(2);
            test.equal(1, 1);
            test.done();
        });

        return tc.run().then(
            function() {

                reporter.reportAssertionCountMismatch = function(testcase, indent) {
                    test.equal(indent, 5);
                    return '(assertion count info)';
                };

                test.equal(reporter.reportFailedTest(tc, 2),
                    '  <bold+red>FAIL</bold+red> : Test A\n(assertion count info)'
                );
            }
        );
    },

    'report general error': function(test) {

        var tc = new TestCase('Test A', function(test) {
            throw new Error('blah');
        });

        return tc.run().then(
            function() {

                reporter.reportErrorTrace = function(err, indent) {
                    test.equal(indent, 5);
                    test.equal(err.message, 'blah');
                    return '(error trace)\n';
                };

                test.equal(reporter.reportGeneralError(tc, 2),
                    '  an error occurred during test:\n(error trace)\n'
                );
            }
        );

    },

    'report uncaught general error': function(test) {

        var tc = new TestCase('Test A', function(test) {
            process.nextTick(function() {
                throw new Error('blah');
            });
            process.nextTick(function() {
                test.done();
            });
        });

        return tc.run().then(
            function() {

                reporter.reportErrorTrace = function(err) {
                    test.equal(err.message, 'blah');
                    return '(error trace)\n';
                };

                test.equal(reporter.reportGeneralError(tc),
                    'an <bold+red>uncaught error</bold+red> occurred during test:\n(error trace)\n'
                );
            }
        );

    },

    'report assertion failures': function(test) {

        var tc = new TestCase('Test A', function(test) {
            test.equal(1, 2);
            test.ok(true);
            test.ok(false);
            test.done();
        });

        return tc.run().then(
            function() {

                reporter.reportAssertionFailure = function(assertion, indent) {
                    test.equal(indent, 2);
                    return '(assertion failure info)';
                };

                test.equal(reporter.reportAssertionFailures(tc, 2),
                    '(assertion failure info)\n(assertion failure info)'
                );
            
            }
        );
    },

    'report assertion failure info': function(test) {

        var ar = new AssertRecord();

        ar.ok(false);
        ar.ok(false, 'should be ok');
        ar.equal(1, 2);

        return ar.getAssertions().spread(
            function(ok1, ok2, equal1) {

                reporter.reportAssertionLocation = function(assert, indent) {
                    test.equal(indent, undefined);
                    return ('(location)');
                };

                reporter.reportActualVsExpected = function(op, actual, expected) {
                    return actual + ' ' + op + ' ' + expected;
                };

                test.equal(reporter.reportAssertionFailure(ok1, 2),
                    '  AssertionError at (location)\n\nfalse == true');
                test.equal(reporter.reportAssertionFailure(ok2, 2),
                    '  AssertionError at (location): should be ok\n\nfalse == true');
                test.equal(reporter.reportAssertionFailure(equal1, 2),
                    '  AssertionError at (location)\n\n1 == 2');

            }
        );
    },

    'format operand': function(test) {
        test.equal(reporter.formatOperand(5), '<blue>5</blue>');
        test.equal(reporter.formatOperand('giraffe'), 'giraffe');
        test.equal(reporter.formatOperand(''), '<magenta>(empty string)</magenta>');
        test.equal(reporter.formatOperand(true), 'true');
        test.equal(reporter.formatOperand(false), 'false');
        test.equal(reporter.formatOperand(undefined), 'undefined');
        test.equal(
            reporter.formatOperand(function(x) { return x + 1; }),
            'function (x) { return x + 1; }'
        );
        test.equal(
            reporter.formatOperand([ 1, 2, "3" ]),
            '[\n   1,\n   2,\n   "3"\n]'
        );
        test.equal(
            reporter.formatOperand({ 1: 'monkey', 2: 'giraffes', "3": 'quolls' }),
            '{\n   "1": "monkey",\n   "2": "giraffes",\n   "3": "quolls"\n}'
        );
        test.equal(
            reporter.formatOperand({ 1: 'monkey', 2: undefined }),
            '{\n   "1": "monkey",\n   "2": undefined\n}'
        );
        test.done();
    },

    'boxify string': function(test) {
        test.deepEqual(
            reporter.boxifyString('hello'),
            { rows: 1, cols: 5, lines: ['hello'] }
        );
        test.deepEqual(
            reporter.boxifyString('hello,\nmy name is 12\nhow are you?'),
            {
                rows: 3,
                cols: 13,
                lines: [ 'hello,       ', 'my name is 12', 'how are you? ' ]
            }
        );
        test.done();
    },

    'report actual vs expected': function(test) {

        test.equal(
            reporter.reportActualVsExpected('==', 1, 2, 2),
            '  <blue>1</blue><bold>   ==   </bold><blue>2</blue>\n'
        );

        test.equal(
            reporter.reportActualVsExpected(
                '==',
                'Hi.',
                '########################\n## Hello, in a frame! ##\n########################',
                3
            ),
            '   Hi.        ########################\n' +
            '      <bold>   ==   </bold>## Hello, in a frame! ##\n' +
            '              ########################\n'
        );

        test.equal(
            reporter.reportActualVsExpected(
                'deepEqual',
                { 1: 'monkey', 2: 'giraffes', "3": 'quolls' },
                { 1: 'monkey', 2: 'giraffes', "3": 'quollae' },
                3
            ),
            '   {                                 {                  \n' +
            '      "1": "monkey",                    "1": "monkey",  \n' +
            '      "2": "giraffes",<bold>   deepEqual   </bold>   "2": "giraffes",\n' +
            '      "3": "quolls"                     "3": "quollae"  \n' +
            '   }                                 }                  \n'
        );


        test.done();
    },

    'report assertion location': function(test) {

        var ar = new AssertRecord();
        ar.ok(true);
        ar.ok(false);

        return ar.getAssertions().spread(
            function(ok1, ok2) {

                var regex = /(\s+)([^\s]+) line <bold>(\d+)<\/bold>/;
                var ok1match = reporter.reportAssertionLocation(ok1, 5).match(regex);
                test.ok(ok1match);
                var ok2match = reporter.reportAssertionLocation(ok2, 4).match(regex);
                test.ok(ok2match);

                test.equal(ok1match[1], '     ');
                test.equal(ok2match[1], '    ');
                test.equal(ok1match[2], ok2match[2]);
                test.equal(parseInt(ok1match[3]) + 1, parseInt(ok2match[3]));
            }
        );
    },

    'report assertion count mismatch': function(test) {

        var tc = new TestCase('Test A', function(test) {
            test.expect(1);
            test.equal(1, 1);
            test.equal(2, 2);
            test.done();
        });

        return tc.run().then(
            function() {

                reporter.reportAssertionLocation = function(assertion, indent) {
                    test.equal(indent, 5);
                    return '(assertion location)';
                };

                test.equal(
                    reporter.reportAssertionCountMismatch(tc, 2),
                    '  expected <bold>1</bold> assertions, found <bold>2</bold>:\n' +
                    '(assertion location)\n' +
                    '(assertion location)\n'
                );

            }
        );
    }


};