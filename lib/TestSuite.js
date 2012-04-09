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

var Q = require('q');
var path = require('path');
var format = require('./Colorize').format;

var TestSet = require('./TestSet').TestSet;
var TestCase = require('./TestCase').TestCase;

// support coffeescript tests
try {
    require('coffee-script');
} catch (e) {
}

var TestSuite = TestSet.extend(
    {

    },
    {

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Initialize this suite with the path to a test file.
         *
         * @param testfile optional path to test file
         */
        init: function(testfile) {
            this._super();
            
            if (typeof testfile == 'string') {
                this.loadFile(testfile);
            }
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Load a test file, given its path.
         *
         * @param testfile path to file
         */
        loadFile: function(testfile) {
            this.path = testfile;
            this.ext = path.extname(testfile);
            this.name = path.basename(testfile, this.ext);

            try {
                var exps = require(testfile);
            } catch (e) {
                this.loadError = e;
                this.result = TestSuite.LOAD_ERROR;
                return;
            }

            this.loadCases(exps);

            if (!this.getSubsets().length) {
                this.result = TestSuite.NO_TESTS;
            }
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Load test cases into the suite, given the exports object produced by
         * require()'ing a test module.
         *
         * @param testExports
         */
        loadCases: function(testExports) {
            for (var name in testExports) {
                if (testExports.hasOwnProperty(name)) {
                    var item = testExports[name];

                    if (name != 'setUp' && name != 'tearDown') {
                        if (typeof item == 'function') {
                            this.addSubset(new TestCase(name, item, testExports.setUp, testExports.tearDown));
                        }
                        else if (typeof item == 'object') {

                            for (var subname in item) {
                                var subitem = item[subname];
                                if (typeof subitem == 'function') {
                                    if (subname != 'setUp' && subname != 'tearDown') {
                                        this.addSubset(new TestCase(name + ' : ' + subname, subitem, item.setUp, item.tearDown));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the name of this test suite.
         */
        getName: function() {
            return this.name;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return a list of the tests in this suite.
         */
        getTests: function() {
            return this.getSubsets();
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * If there was an error during the require() of this suite's test
         * file, return it.
         */
        getLoadError: function() {
            return this.loadError;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Implement abstract method from TestSet.
         */
        getInitialSummary: function() {
            return {
                passed: this.getLoadError() ? false : true,
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
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Implement abstract method from TestSet.
         */
        reduceSummary: function(summary, next) {
            summary.tests.total++;
            summary.assertions.failed += next.assertions.failed;
            summary.assertions.total += next.assertions.total;
            summary.aborted = summary.aborted || next.aborted;
            if (!next.passed) {
                this.result = TestSuite.FAILED;
                summary.passed = false;
                if (next.errored) {
                    summary.tests.errored++;
                } else {
                    summary.tests.failed++;
                }
            }

            return summary;
        },

        /**
         * Override TestSet's run, but only to print a status message, then
         * delegate to TestSet.
         *
         * @param options
         */
        run: function(options) {
            console.log(format(this.getName(), 'bold+blue'));
            return this._super(options);
        }

    }
);


exports.TestSuite = TestSuite;