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

var fs = require('./FileSystem');
var Q = require('q');
var path = require('path');

var TestSet = require('./TestSet').TestSet;
var TestSuite = require('./TestSuite').TestSuite;


var TestRun = TestSet.extend({

},
{

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

        // filter function for q-fs listTree: lets through only *.js files.
        function testJsFileFilter(p, stat) {
            if (stat.isFile()) {
                if (path.basename(p).match(/.+?\.(js|coffee)$/i)) {
                    return true;
                }
            }
            return false;
        }

        return fs.listTree(p, testJsFileFilter).then(
            function(list) {
                list.forEach(function(p) {
                    // normalize the path
                    p = path.resolve(p);
                    
                    added.push(p);
                    t.addSubset(new TestSuite(p));
                });

                return added;
            }
        );
    },

    ///////////////////////////////////////////////////////////////////////////
    /**
     * Get all test suites in this run.
     */
    getSuites: function() {
        return this.getSubsets();
    },

    ///////////////////////////////////////////////////////////////////////////
    /**
     * Implement abstract method from TestSet.
     */
    getInitialSummary: function() {
        return {
            passed: true,
            aborted: false,
            suites: {
                failed: 0,
                total: 0
            },
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
        summary.suites.total++;
        if (!next.passed) {
            summary.passed = false;
            summary.suites.failed++;
        }
        summary.tests.errored += next.tests.errored;
        summary.tests.failed += next.tests.failed;
        summary.tests.total += next.tests.total;
        summary.assertions.failed += next.assertions.failed;
        summary.assertions.total += next.assertions.total;
        summary.aborted = summary.aborted || next.aborted;

        return summary;
    }


});

exports.TestRun = TestRun;