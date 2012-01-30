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
 * Date: 1/19/12
 */

var Q = require('q');
var Class = require('capsela-util').Class;


/////////////////////////////////////////////////////////////////////
/**
 * TestSet is an abstract base class for things that act like groups
 * of tests. Presently that includes TestRuns and TestSuites, but not
 * TestCases. It exists to handle the common set-level status tracking,
 * adding subsets (TestCases and subsidiary TestSets), and running.
 */

var TestSet = Class.extend(
    {
        
        // Set-level result codes

        UNTESTED: 'not yet tested',

        NO_TESTS: 'no tests found',

        LOAD_ERROR: 'an error occurred during load',
        FAILED: 'one or more tests failed',

        PASSED: 'all tests passed'

    },
    {

        init: function() {
            this.subsets = [];
            this.result = TestSet.UNTESTED;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the overall suite-level result code.
         */
        getResult: function() {
            return this.result;
        },

        /////////////////////////////////////////////////////////////////////
        /**
         * Return all subsets in an array.
         */
        getSubsets: function() {
            return this.subsets || [];
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Add a new subset.
         * @param subset
         */
        addSubset: function(subset) {
            this.subsets.push(subset);
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Run this test set, and return a promise for a result summary.
         *
         * @param options
         */
        run: function(options) {
            var t = this;
            options = options || {};
            var done = Q.ref();

            var summary = t.getInitialSummary();

            if (t.getResult() == TestSet.UNTESTED) {

                // innocent until proven guilty
                t.result = TestSet.PASSED;

                t.getSubsets().forEach(function(subset) {
                    done = done.then(
                        function() {
                            if (!summary ||
                                !(summary.aborted || (options.stopOnFailure && !summary.passed))) {
                                return subset.run(options).then(
                                    function(subSummary) {
                                        summary = t.reduceSummary(summary, subSummary);
                                    }
                                );
                            }
                        }
                    );
                });
            }
            
            return done.then(
                function() {
                    t.summary = summary;
                    return summary;
                }
            );
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Perform a map-reduce style "reduce" operation to produce a more complete
         * run summary.
         *
         * All concrete subclasses must implement this method.
         *
         * @param summary the accumulated summary object so far, or the value returned
         * by getInitialSummary if this is the first iteration
         * @param next a sub-summary to be merged in
         * 
         * @return summary should return the combined summary object (note that it is
         * okay to modify the "summary" arg directly, just don't forget to return it as
         * well)
         */
        reduceSummary: Class.ABSTRACT_METHOD,

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return a suitable initial state for the reduction operation defined by
         * the reduceSummary method.
         *
         * All concrete subclasses must implement this method.
         */
        getInitialSummary: Class.ABSTRACT_METHOD,

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Get the summary produced by the last run.
         */
        getSummary: function() {
            return this.summary;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Get the duration in milliseconds for the last run. In the abstract
         * case, this is the sum of the durations of the subsets.
         */
        getDuration: function() {
            var total = 0;
            this.getSubsets().forEach(function(subset) {
                total += subset.getDuration();
            });
            return total;
        }

    }
);


exports.TestSet = TestSet;