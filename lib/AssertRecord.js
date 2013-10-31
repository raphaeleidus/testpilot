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
var Q = require('q');
var assert = require('assert');

var AssertRecord = Class.extend(
    {

    },
    {

        ///////////////////////////////////////////////////////////////////////////
        init: function() {
            this.asserts = [];
            this.closed = false;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Closes the report to new assertions.
         */
        close: function() {
            this.closed = true;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return a promise for an array of all assertions made.
         */
        getAssertions: function() {
            var t = this;

            if (t.asserts.length == 0) {
                return Q([]);
            }

            // The following behaves like Q.all(t.asserts) with one important
            // difference: if while waiting for the resolution of one array
            // element additional promises are pushed onto the end of the array,
            // then their resolutions will be included in the final output as
            // well. Why is this important? Because assertions like "rejects()"
            // may involve a validation callback that is exposed to the Testpilot
            // user, and may reasonably be used to make additional assertions.
            // Q.all is based on a for loop and would miss these latecomers.

            var resolved = [];
            var i = 0;

            function reduce(resolvedAssert) {
                resolved.push(resolvedAssert);
                i++;
                if (i == t.asserts.length) {
                    return resolved;
                } else {
                    return Q(t.asserts[i]).then(reduce);
                }
            }

            return Q(t.asserts[i]).then(reduce);
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the expected number of assertions, or undefined if no expectation
         * was provided.
         */
        getExpected: function() {
            return this.expected;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Add the result (a promise to be either resolved or rejected) to the
         * assertion record.
         *
         * @param result promise
         */
        logAssertResult: function(result) {

            // Start by building a basic assertion record, using the
            // probeError to determine the relevant stack, file name,
            // and line number

            var assertRec = {};

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


            this.asserts.push(Q(result).then(
                function() {
                    return assertRec;
                },
                function(err) {
                    assertRec.error = err;
                    return assertRec;
                }
            ));

        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Run the named assertion method from the node assert module.
         *
         * @param method assertion function to run
         * @param args the arguments to the node assert method
         * @param immediate if true, no attempt will be made to resolve
         * argument promises before evaluating the assertion
         */
        runAssert: function(method, args, immediate) {

            if (this.closed) {
                return;
            }

            // convert the args to a real array
            args = Array.prototype.slice.call(args);

            // see if the args array includes any promises
            var promises = false;
            args.forEach(function(arg) {
                if (Q.isPromise(arg)) {
                    promises = true;
                }
            });

            if (immediate || !promises) {
                try {
                    method.apply(undefined, args);
                    this.logAssertResult();
                } catch (err) {
                    this.logAssertResult(Q.reject(err));
                }
            }
            else {
                var assertDef = Q.defer();
                this.logAssertResult(assertDef.promise);

                var argResTimeout = setTimeout(
                    function() {
                        assertDef.reject(new Error('timed out waiting for assertion arguments to resolve'));
                    },
                    3000
                );

                Q.all(args).then(
                    function(args) {
                        clearTimeout(argResTimeout);
                        var assertApplication = Q().then(
                            function() {
                                return method.apply(undefined, args);
                            }
                        );
                        assertDef.resolve(assertApplication);
                    },
                    function(err) {
                        clearTimeout(argResTimeout);
                        assertDef.reject(err);
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
            this.runAssert(assert.fail, arguments);
        },

        ok: function(value, message) {
            this.runAssert(assert.ok, arguments);
        },

        immediateOk: function(actual, expected, message) {
            this.runAssert(assert.ok, arguments, true);
        },

        equal: function(actual, expected, message) {
            this.runAssert(assert.equal, arguments);
        },

        // synonym for equal
        equals: function(actual, expected, message) {
            this.runAssert(assert.equal, arguments);
        },

        immediateEqual: function(actual, expected, message) {
            this.runAssert(assert.equal, arguments, true);
        },

        notEqual: function(actual, expected, message) {
            this.runAssert(assert.notEqual, arguments);
        },

        immediateNotEqual: function(actual, expected, message) {
            this.runAssert(assert.notEqual, arguments, true);
        },

        deepEqual: function(actual, expected, message) {
            this.runAssert(assert.deepEqual, arguments);
        },

        immediateDeepEqual: function(actual, expected, message) {
            this.runAssert(assert.deepEqual, arguments, true);
        },

        notDeepEqual: function(actual, expected, message) {
            this.runAssert(assert.notDeepEqual, arguments);
        },

        immediateNotDeepEqual: function(actual, expected, message) {
            this.runAssert(assert.notDeepEqual, arguments, true);
        },

        strictEqual: function(actual, expected, message) {
            this.runAssert(assert.strictEqual, arguments);
        },

        immediateStrictEqual: function(actual, expected, message) {
            this.runAssert(assert.strictEqual, arguments, true);
        },

        notStrictEqual: function(actual, expected, message) {
            this.runAssert(assert.notStrictEqual, arguments);
        },

        immediateNotStrictEqual: function(actual, expected, message) {
            this.runAssert(assert.notStrictEqual, arguments, true);
        },

        'throws': function(block, error, message) {
            this.runAssert(assert['throws'], arguments);
        },

        doesNotThrow: function(block, error, message) {
            this.runAssert(assert.doesNotThrow, arguments);
        },

        ifError: function(value) {
            this.runAssert(assert.ifError, arguments);
        },

        expect: function(count) {
            this.expected = count;
        },

        /**
         * This assertion is satisfied if its argument is eventually rejected.
         *
         * @param promise
         * @param errorValidator
         * @param message
         */
        rejects: function(promise, errorValidator, message) {
            this.logAssertResult(Q(promise).then(
                function() {
                    var err = new Error(message || 'promise should have been rejected, but was resolved');
                    return Q.reject(err);
                },
                function(err) {
                    if (typeof errorValidator == 'function') {
                        errorValidator(err);
                    }
                }
            ));
        }

    }

);

exports.AssertRecord = AssertRecord;
