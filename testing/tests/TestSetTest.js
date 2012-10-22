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
 * Date: 1/30/12
 */


var MonkeyPatcher = require('capsela-util').MonkeyPatcher;

var TestSet = require('../../lib/TestSet').TestSet;

var Q = require('q');

var path = require('path');

exports['run control'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'set starts with initial summary': function(test) {

        var Set = TestSet.extend({},
        {
            getInitialSummary: function() {
                return {
                    status: 'monkeys'
                };
            },
            reduceSummary: function() {
                // no reduction expected, since there aren't any subsets
                test.ok(false, 'should not be here');
            }
        });

        var set = new Set();

        return set.run().then(
            function(summary) {
                test.deepEqual(summary, { status: 'monkeys' });
            }
        );

    },

    'set runs subsets, then reduces': function(test) {

        var Set = TestSet.extend({},
        {
            getInitialSummary: function() {
                return {
                    subruns: []
                };
            },
            reduceSummary: function(prev, next) {
                prev.subruns.push(next.sn);
                return prev;
            }
        });

        function SubSet(sn) {
            this.sn = sn;
        }
        SubSet.prototype.run = function(options) {
            // make sure the options are passed down
            test.deepEqual(options, { monkeys: 'affirmative' });
            return Q.resolve({ sn: this.sn });
        };


        var set = new Set();

        set.addSubset(new SubSet(45));
        set.addSubset(new SubSet(93));
        set.addSubset(new SubSet(109));

        return set.run({ monkeys: 'affirmative' }).then(
            function(summary) {
                test.deepEqual(summary, { subruns: [ 45, 93, 109 ] });
            }
        );

    },

    'stopOnFailure option': function(test) {

        var Set = TestSet.extend({},
        {
            getInitialSummary: function() {
                return {
                    passed: true,
                    subruns: []
                };
            },
            reduceSummary: function(prev, next) {
                prev.passed = prev.passed && next.passed;
                prev.subruns.push(next.sn);
                return prev;
            }
        });

        function SubSet(sn) {
            this.sn = sn;
        }
        SubSet.prototype.run = function(options) {
            // make sure the options are passed down
            return Q.resolve({ sn: this.sn, passed: this.sn != 93 });
        };


        var set = new Set();

        set.addSubset(new SubSet(45));
        set.addSubset(new SubSet(93));
        set.addSubset(new SubSet(109));

        return set.run({ stopOnFailure: true }).then(
            function(summary) {
                test.deepEqual(summary, {
                    passed: false,
                    subruns: [ 45, 93 ]
                });
            }
        );

    }

};
