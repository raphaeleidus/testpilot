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

var MonkeyPatcher = require('capsela-util').MonkeyPatcher;

var TestRun = require('../../lib/TestRun').TestRun;
var TestSuite = require('../../lib/TestSuite').TestSuite;
var Q = require('q');

var path = require('path');
var fixturesDir = __dirname + '/../fixtures';

exports['path manipulation'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'addPath with file': function(test) {
        test.expect(1);

        var tr = new TestRun();

        tr.addPath(fixturesDir + '/FileATest.js').then(
            function(files) {
                test.deepEqual(files, [ path.resolve(fixturesDir + '/FileATest.js') ]);
                test.done();
            }
        );
    },

    'addPath with directory': function(test) {
        test.expect(2);

        var suiteFiles = [];
        MonkeyPatcher.patch(TestSuite.prototype, 'init', function(p) {
            suiteFiles.push(p);
        });

        var tr = new TestRun();
        tr.addPath(fixturesDir + '/TestsDir1').then(
            function(files) {

                var expected = [
                    path.resolve(fixturesDir + '/TestsDir1/TestBTest.js'),
                    path.resolve(fixturesDir + '/TestsDir1/TestCTest.js'),
                    path.resolve(fixturesDir + '/TestsDir1/subdir/TestATest.js')
                ];

                test.deepEqual(files, expected);
                test.deepEqual(suiteFiles, expected);
                test.done();
            }
        );
    }

};

exports['running and reporting'] = {

    'run': function(test) {

        var tr = new TestRun();
        tr.addPath(fixturesDir + '/TestsDir2').then(
            function() {
                return tr.run();
            }
        ).then(
            function(summary) {

                test.deepEqual(summary, {
                    passed: false,
                    aborted: false,
                    suites: {
                        failed: 2,
                        total: 3
                    },
                    tests: {
                        errored: 1,
                        failed: 2,
                        total: 6
                    },
                    assertions: {
                        failed: 4,
                        total: 8
                    }
                });

                test.deepEqual(tr.getSummary(), summary);

                test.done();
            }
        ).end();
    }

};