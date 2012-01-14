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


var TestRun = require('../../../lib/TestRun').TestRun;
var JunitReporter = require('../../../lib/reporters/JunitReporter').reporter;

var MonkeyPatcher = require('capsela-util').MonkeyPatcher;
var fs = require('../../../lib/FileSystem');

exports['reporting'] = {

    setUp: function(cb) {
        MonkeyPatcher.setUp();

        // make sure every test takes 25 ms
        var time = 0;
        MonkeyPatcher.patch(Date, 'now', function() {
            time += 25;
            return time;
        });

        cb();
    },

    tearDown: MonkeyPatcher.tearDown,

    'report with normal run': function(test) {

        var tr = new TestRun();
        tr.addPath(__dirname + '/../../fixtures/TestsDir2').then(
            function() {
                return tr.run();
            }
        ).then(
            function() {

                var reporter = new JunitReporter({
                    'junitOutput': '/path/to/junit.xml'
                });

                fs.readFile(__dirname + '/../../fixtures/expected_junit_1.xml').then(
                    function(expected) {
                        expected = expected.toString('utf8');

                        MonkeyPatcher.patch(fs, 'writeFile', function(path, content, options) {

                            test.equal(path, '/path/to/junit.xml');
                            test.equal(content, expected);

                            test.done();
                        });

                        reporter.report(tr);

                    }
                );
            }
        );

    },

    'report with aborted run': function(test) {

        var tr = new TestRun();
        tr.addPath(__dirname + '/../../fixtures/TestsDir3').then(
            function() {
                return tr.run();
            }
        ).then(
            function() {

                var reporter = new JunitReporter({
                    'junitOutput': '/path/to/junit.xml'
                });

                fs.readFile(__dirname + '/../../fixtures/expected_junit_2.xml').then(
                    function(expected) {
                        expected = expected.toString('utf8');

                        MonkeyPatcher.patch(fs, 'writeFile', function(path, content, options) {

                            test.equal(path, '/path/to/junit.xml');
                            test.equal(content, expected);

                            test.done();
                        });

                        reporter.report(tr);

                    }
                );
            }
        );

    }

};