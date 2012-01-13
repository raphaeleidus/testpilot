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
 * Date: 1/5/12
 */

var Class = require('capsela-util').Class;
var Q = require('q');
var path = require('path');
var format = require('./Colorize').format;

var TestCase = require('./TestCase').TestCase;

var TestSuite = Class.extend(
    {

        // Suite-level result codes

        UNTESTED: 'not yet tested',

        NO_TESTS: 'no tests found',

        LOAD_ERROR: 'an error occurred during load',
        FAILED: 'one or more tests failed',

        PASSED: 'all tests passed'

    },
    {

        /**
         * Initialize this suite with the path to a test file.
         *
         * @param testfile
         */
        init: function(testfile) {
            this.result = TestSuite.UNTESTED;

            this.tests = [];

            if (typeof testfile == 'string') {
                this.loadFile(testfile);
            }

        },

        loadFile: function(testfile) {
            this.path = testfile;
            this.name = path.basename(testfile, '.js');

            try {
                var exps = require(testfile);
            } catch (e) {
                this.loadError = e;
                this.result = TestSuite.LOAD_ERROR;
                return;
            }

            this.loadCases(exps);

            if (!this.tests.length) {
                this.result = TestSuite.NO_TESTS;
            }
            
        },

        loadCases: function(testExports) {
            this.tests = [];
            for (var name in testExports) {
                if (testExports.hasOwnProperty(name)) {
                    var item = testExports[name];

                    if (name != 'setUp' && name != 'tearDown') {
                        if (typeof item == 'function') {
                            this.tests.push(new TestCase(name, item, testExports.setUp, testExports.tearDown));
                        }
                        else if (typeof item == 'object') {

                            for (var subname in item) {
                                var subitem = item[subname];
                                if (typeof subitem == 'function') {
                                    if (subname != 'setUp' && subname != 'tearDown') {
                                        this.tests.push(new TestCase(name + ' : ' + subname, subitem, item.setUp, item.tearDown));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        /**
         * Return the name of this test suite.
         */
        getName: function() {
            return this.name;
        },

        /**
         * Return a list of the tests in this suite.
         */
        getTests: function() {
            return this.tests || [];
        },

        /**
         * Return the overall suite-level result code.
         */
        getResult: function() {
            return this.result;
        },

        /**
         * If there was an error during the require() of this suite's test
         * file, return it.
         */
        getLoadError: function() {
            return this.loadError;
        },

        getDuration: function() {
            var total = 0;
            this.getTests().forEach(function(test) {
                total += test.getDuration();
            });
            return total;
        },

        /**
         * Run all test cases in this suite and return a promise for a result summary.
         *
         * @return promise of result summary structure
         */
        run: function() {
            var t = this;

            t.summary = {
                passed: true,
                aborted: false,
                tests: {
                    errored: 0,
                    failed: 0,
                    total: 0
                },
                assertions: {
                    failed: 0,
                    total: 0
                }
            };

            var done = Q.ref();

            if (t.getLoadError()) {
                t.summary.passed = false;
            }
            else {

                console.log(format(t.getName(), 'bold+blue'));

                // innocent until proven guilty
                t.result = TestSuite.PASSED;

                t.tests.forEach(function(test) {
                    done = done.then(
                        function() {
                            if (!t.summary.aborted) {
                                return test.run().then(
                                    function(testSummary) {
                                        t.summary.tests.total++;
                                        t.summary.assertions.failed += testSummary.assertions.failed;
                                        t.summary.assertions.total += testSummary.assertions.total;
                                        t.summary.aborted = t.summary.aborted || testSummary.aborted;
                                        if (!testSummary.passed) {
                                            t.result = TestSuite.FAILED;
                                            t.summary.passed = false;
                                            if (testSummary.errored) {
                                                t.summary.tests.errored++;
                                            } else {
                                                t.summary.tests.failed++;
                                            }
                                        }
                                    }
                                );
                            }
                        }
                    );
                });

            }
            
            return done.then(
                function() {
                    return t.summary;
                }
            )
        },

        /**
         * Get the summary produced by the last run.
         */
        getSummary: function() {
            return this.summary;
        }

    }
);


exports.TestSuite = TestSuite;