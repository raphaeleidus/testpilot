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
var Q = require('qq');
var format = require('./Colorize').format;

var AssertRecord = require('./AssertRecord').AssertRecord;


var TestCase = Class.extend(
    {

        // test result codes
        UNTESTED: 'not yet tested',
        PASSED: 'passed',
        FAILED: 'failed',

        // failure reason codes
        GENERAL_ERROR: 'an error occurred',     // includes return promise rejection
        ASSERTION_FAIL: 'assertion(s) failed',
        ASSERTION_COUNT: 'unexpected number of assertions'

    },
    {

        init: function(name, func, setUp, tearDown) {
            this.result = TestCase.UNTESTED;
            this.name = name;
            this.func = func;
            this.setUp = setUp;
            this.tearDown = tearDown;

            // by default, each phase of a test times out if not ended within five seconds
            this.timeout = 5000;
        },

        getName: function() {
            return this.name;
        },

        getResult: function() {
            return this.result;
        },

        /**
         * Returns the error object associated with a general error, if there was one. This
         * includes an immediate exception on load, an asynchronous uncaught exception during
         * the test, or the rejection of a returned promise.
         */
        getGeneralError: function() {
            return this.generalError;
        },

        /**
         * If there was a general error, this returns the phase at which it occurred, either
         * "setUp", "test", or "tearDown".
         */
        getGeneralErrorPhase: function() {
            return this.generalErrorPhase;
        },

        /**
         * If the case failed, return the general type of failure (one of the failure reason
         * codes defined above).
         */
        getFailure: function() {
            return this.failure;
        },

        /**
         * Return 
         */
        getAssertions: function() {
            return this.assertions || [];
        },

        getExpectedAssertions: function() {
            return this.expectedAssertions;
        },

        /**
         * Run this case, and update the state to reflect the results. Returns
         * a completion promise that in normal circumstances should not be
         * rejected (that is, rejection indicates a fault in TestCase, not the
         * test itself or the code under test).
         */
        run: function() {
            var t = this;

            /**
             * This utility function subscribes the given deferred object to any process-wide
             * uncaught exceptions. If an uncaught exception occurs before the deferred is
             * resolved, it will be treated as a rejection. This will happen once at most; as
             * soon as the deferred is resolved or rejected the handler will be removed.
             * 
             * @param def
             */
            function attachDeferredToUncaught(def) {
                process.on('uncaughtException', def.reject);
                def.promise.fin(function() {
                    process.removeListener('uncaughtException', def.reject);
                });
            }

            /**
             * This utility subscribes the given deferred object to a timeout (t.timeout ms)
             * and rejects it if the timeout elapses before it is otherwise resolved or rejected.
             * This is implemented as a series of 10ms timeouts rather than a single long span
             * because the latter would result in premature timeouts during interactive debugging.
             *
             * @param def
             * @param phase
             */
//            function attachDeferredToTimeout(def, phase) {
//                var chunk = 10;
//                var elapsed = 0;
//                var to;
//
//                function checkTimeout() {
//                    if (elapsed >= t.timeout) {
//                        to = null;
//                        def.reject(new Error('timed out waiting for ' + phase));
//                    } else {
//                        elapsed += chunk;
//                        to = setTimeout(checkTimeout, chunk);
//                    }
//                }
//
//                checkTimeout();
//
//                def.promise.fin(function() {
//                    if (to) {
//                        clearTimeout(to);
//                    }
//                });
//            }

            // this is a simpler single-span version of the above, here temporarily
            // due to https://groups.google.com/forum/#!topic/nodejs/w1wBjg61rQg
            function attachDeferredToTimeout(def, phase) {
                var to = setTimeout(function() {
                    def.reject(new Error('timed out waiting for ' + phase));
                }, t.timeout);

                def.promise.fin(function() {
                    if (to) {
                        clearTimeout(to);
                    }
                });
            }

            var phase = 'setUp';

            return Q.ref().then(
                function() {
                    // if there is a setup function defined, run it and wait for it to be done
                    if (t.setUp) {
                        var setUpDone = Q.defer();
                        attachDeferredToUncaught(setUpDone);
                        attachDeferredToTimeout(setUpDone, 'setUp');

                        // call the actual setUp function
                        try {
                            var retval = t.setUp(setUpDone.resolve);
                            if (Q.isPromise(retval)) {
                                setUpDone.resolve(retval);
                            }
                        } catch (err) {
                            setUpDone.reject(err);
                        }

                        return setUpDone.promise;
                    }
                }
            ).then(
                function() {
                    // any necessary setup complete, we enter the test phase
                    phase = 'test';

                    var testDone = Q.defer();

                    // construct an AssertRecord object to be passed in as the function's "test" parameter
                    t.assertRec = new AssertRecord();
                    t.assertRec.done = function() {
                        testDone.resolve();
                    };
                    t.assertRec.setTimeout = function(ms) {
                        t.timeout = ms;
                    };

                    attachDeferredToUncaught(testDone);
                    attachDeferredToTimeout(testDone, 'test');

                    console.log(format('   ' + t.getName(), 'blue'));

                    // call the actual test function
                    try {
                        var retval = t.func(t.assertRec);
                        if (Q.isPromise(retval)) {
                            testDone.resolve(retval);
                        }
                    } catch (err) {
                        testDone.reject(err);
                    }

                    return testDone.promise;
                }
            )
            .then(
                null,     // we don't actually care about the result promise value...
                function(err) {
                    // .. but rejection counts as an error
                    t.generalError = err;
                    t.generalErrorPhase = phase;
                    t.result = TestCase.FAILED;
                    t.failure = TestCase.GENERAL_ERROR;
                }
            )
            .then(
                function() {
                    // we always want to run tearDown if it is defined, whether or not the test was successful

                    //console.log('------ End test %s ------', t.getName());

                    if (t.tearDown) {
                        var tearDownDone = Q.defer();
                        attachDeferredToUncaught(tearDownDone);
                        attachDeferredToTimeout(tearDownDone, 'tearDown');

                        // call the actual tearDown function
                        try {
                            var retval = t.tearDown(tearDownDone.resolve);
                            if (Q.isPromise(retval)) {
                                tearDownDone.resolve(retval);
                            }
                        } catch (err) {
                            tearDownDone.reject(err);
                        }

                        if (!t.generalError) {
                            phase = 'tearDown';
                        }

                        return tearDownDone.promise.then(
                            null,
                            function(err) {
                                if (!t.generalError) {
                                    t.generalError = err;
                                    t.generalErrorPhase = phase;
                                    t.result = TestCase.FAILED;
                                    t.failure = TestCase.GENERAL_ERROR;
                                }
                            }
                        );
                    }

                }
            ).then(
                function() {

                    // finally, generate a result summary
                    t.result = TestCase.PASSED;

                    t.summary = {
                        passed: true,
                        errored: false,
                        assertions: {
                            total: 0,
                            failed: 0
                        }
                    };

                    if (t.generalError) {
                        t.summary.passed = false;
                        t.summary.errored = true;
                        t.result = TestCase.FAILED;
                    }

                    if (t.assertRec) {
                        t.expectedAssertions = t.assertRec.getExpected();

                        return t.assertRec.getAssertions().then(
                            function(assertions) {
                                t.assertions = assertions;
                                assertions.forEach(
                                    function(assert) {
                                        t.summary.assertions.total++;
                                        if (assert.error) {
                                            // if we haven't already marked failure for some other
                                            // reason, do so now (don't want to overwrite a general
                                            // error)
                                            if (t.result == TestCase.PASSED) {
                                                t.result = TestCase.FAILED;
                                                t.failure = TestCase.ASSERTION_FAIL;
                                            }
                                            t.summary.passed = false;
                                            t.summary.assertions.failed++;
                                        }
                                    }
                                );

                                // check the expected number of assertions, but only if nothing
                                // else has failed (if assertions are actually failing then an
                                // unexpected count is likely a moot point; first one must fix
                                // the assertions).

                                if ((typeof t.expectedAssertions != 'undefined') && (t.result == TestCase.PASSED)) {
                                    if (assertions.length != t.expectedAssertions) {
                                        t.result = TestCase.FAILED;
                                        t.failure = TestCase.ASSERTION_COUNT;
                                        t.summary.errored = true;
                                        t.summary.passed = false;
                                    }
                                }

                                return t.summary;

                            }
                        )
                    }
                    else {
                        return t.summary;
                    }
                }
            );

        },

        /**
         * Get the summary produced by the last run.
         */
        getSummary: function() {
            return this.summary;
        }

    }
);


exports.TestCase = TestCase;