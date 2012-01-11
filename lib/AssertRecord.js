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
 * Date: 1/6/12
 */

var Class = require('capsela-util').Class;
var Q = require('qq');
var assert = require('assert');


var AssertRecord = Class.extend(
    {

    },
    {

        init: function() {
            this.asserts = [];
        },

        /**
         * Return a promise for an array of all assertions made.
         */
        getAssertions: function() {
            return Q.all(this.asserts);
        },

        /**
         * Return the expected number of assertions, or undefined if no expectation
         * was provided.
         */
        getExpected: function() {
            return this.expected;
        },

        /**
         * Run the named assertion method from the node assert module.
         *
         * @param method the method to run (eg "ok", "equal")
         * @param args the arguments to the node assert method
         * @param immediate if true, no attempt will be made to resolve
         * argument promises before evaluating the assertion
         */
        runAssert: function(method, args, immediate) {

            // Start by building a basic assertion record, using the
            // probeError to determine the relevant stack, file name,
            // and line number

            var assertRec = {
                method: method
            };

            // trim junk from the stack and find the file and line number
            var stack = (new Error()).stack.split('\n');
            stack.shift();  // drop the initial line, which is just the error name
            // shift off the stack until this file disappears and we're looking at
            // assertion point itself
            while (stack.length && stack[0].indexOf(__filename) >= 0) {
                stack.shift();
            }
            assertRec.stack = stack;
            var match = stack[0].match(/[\\\/]([^/^\\]+?):(\d+):\d+\)?$/);

            if (match) {
                assertRec.file = match[1];
                assertRec.line = match[2];
            } else {
                assertRec.assertLine = stack[0];
            }

            // convert the args to a real array
            args = Array.prototype.slice.call(args);

            function runWithResolvedArgs(args) {
                try {
                    assert[method].apply(assert, args);
                } catch (e) {
                    assertRec.error = e;
                }
                return assertRec;
            }

            // see if the args array includes any promises
            var promises = false;
            args.forEach(function(arg) {
                if (Q.isPromise(arg)) {
                    promises = true;
                }
            });

            if (immediate || !promises) {
                this.asserts.push(runWithResolvedArgs(args));
            }
            else {
                var assertDef = Q.defer();
                this.asserts.push(assertDef.promise);

                var argResTimeout = setTimeout(
                    function() {
                        assertRec.error = new Error('timed out waiting for assertion arguments to resolve');
                        assertDef.resolve(assertRec);
                    },
                    2000
                );

                Q.all(args).then(
                    function(args) {
                        clearTimeout(argResTimeout);
                        assertDef.resolve(runWithResolvedArgs(args));
                    },
                    function(err) {
                        clearTimeout(argResTimeout);
                        assertRec.error = err;
                        assertDef.resolve(assertRec);
                    }
                );

            }
        },

        /////////////////////////////////////////////////////////////////////////////////
        // Assertion methods for use in tests.
        /////////////////////////////////////////////////////////////////////////////////

        // TODO: move this off the assertion record and make it a method installed by TestCase,
        // like done(). It shouldn't really be an assertion anyway.
        fail: function(actual, expected, message, operator) {
            this.runAssert('fail', arguments);
        },

        ok: function(value, message) {
            this.runAssert('ok', arguments);
        },

        immediateOk: function(actual, expected, message) {
            this.runAssert('ok', arguments, true);
        },

        equal: function(actual, expected, message) {
            this.runAssert('equal', arguments);
        },

        // synonym for equal
        equals: function(actual, expected, message) {
            this.runAssert('equal', arguments);
        },

        immediateEqual: function(actual, expected, message) {
            this.runAssert('equal', arguments, true);
        },

        notEqual: function(actual, expected, message) {
            this.runAssert('notEqual', arguments);
        },

        immediateNotEqual: function(actual, expected, message) {
            this.runAssert('notEqual', arguments, true);
        },

        deepEqual: function(actual, expected, message) {
            this.runAssert('deepEqual', arguments);
        },

        immediateDeepEqual: function(actual, expected, message) {
            this.runAssert('deepEqual', arguments, true);
        },

        notDeepEqual: function(actual, expected, message) {
            this.runAssert('notDeepEqual', arguments);
        },

        immediateNotDeepEqual: function(actual, expected, message) {
            this.runAssert('notDeepEqual', arguments, true);
        },

        strictEqual: function(actual, expected, message) {
            this.runAssert('strictEqual', arguments);
        },

        immediateStrictEqual: function(actual, expected, message) {
            this.runAssert('strictEqual', arguments, true);
        },

        notStrictEqual: function(actual, expected, message) {
            this.runAssert('notStrictEqual', arguments);
        },

        immediateNotStrictEqual: function(actual, expected, message) {
            this.runAssert('notStrictEqual', arguments, true);
        },

        'throws': function(block, error, message) {
            this.runAssert('throws', arguments);
        },

        doesNotThrow: function(block, error, message) {
            this.runAssert('doesNotThrow', arguments);
        },

        ifError: function(value) {
            this.runAssert('ifError', arguments);
        },

        expect: function(count) {
            this.expected = count;
        }

    }

);

exports.AssertRecord = AssertRecord;