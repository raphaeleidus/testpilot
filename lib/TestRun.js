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

var Class = require('capsela-util').Class;
var Qfs = require('q-fs');
var Q = require('qq');
var path = require('path');

var TestSuite = require('./TestSuite').TestSuite;

var TestRun = Class.extend({

},
{

    init: function() {
        this.suites = [];
    },

    ///////////////////////////////////////////////////////////////////////////
    /**
     * Add a path, which can refer to either a test file or a directory. If it is
     * a directory, it will be recursively searched for test files.
     *
     * @param p
     * @return promise of array listing all test files added
     */
    addPath: function(p) {
        var t = this;
        var added = [];

        // filter function for q-fs listTree: lets through only *Test.js files.
        function testJsFileFilter(p, stat) {
            if (stat.isFile()) {
                if (path.basename(p).match(/.+?Test.js$/i)) {
                    return true;
                }
            }
            return false;
        }

        return Qfs.listTree(p, testJsFileFilter).then(
            function(list) {
                list.forEach(function(p) {
                    // normalize the path
                    p = path.resolve(p);
                    
                    added.push(p);
                    t.suites.push(new TestSuite(p));
                });

                return added;
            }
        );
    },

    /**
     * Get all test suites in this run.
     */
    getSuites: function() {
        return this.suites;
    },

    /**
     * Run all tests in all test suites, and return a promise for a results
     * report structure.
     *
     * @return promise for summary structure
     */
    run: function() {
        var t = this;

        var summary = {
            passed: true,
            suites: {
                failed: 0,
                total: 0
            },
            tests: {
                failed: 0,
                total: 0
            },
            assertions: {
                failed: 0,
                total: 0
            }
        };

        var done = Q.ref();
        t.suites.forEach(function(suite) {
            done = done.then(
                function() {
                    return suite.run().then(
                        function(suiteSummary) {
                            summary.suites.total++;
                            if (!suiteSummary.passed) {
                                summary.passed = false;
                                summary.suites.failed++;
                            }
                            summary.tests.failed += suiteSummary.tests.failed;
                            summary.tests.total += suiteSummary.tests.total;
                            summary.assertions.failed += suiteSummary.assertions.failed;
                            summary.assertions.total += suiteSummary.assertions.total;
                        }
                    );
                }
            );
        });
        
        return done.then(
            function() {
                return summary;
            }
        );

    }

});

exports.TestRun = TestRun;