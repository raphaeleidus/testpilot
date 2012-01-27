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

var Class = require('capsela-util').Class;
var AssertRecord = require('./AssertRecord').AssertRecord;
var format = require('./Colorize').format;

var TestCase = Class.extend(
    {

        // test phases
        SETUP: 'setUp',
        TEST: 'test',
        TEARDOWN: 'tearDown',

        // test result codes
        UNTESTED: 'not yet tested',
        PASSED: 'passed',
        FAILED: 'failed',

        // failure reason codes
        GENERAL_ERROR: 'an error occurred',     // includes return promise rejection
        SETUP_TEARDOWN_ERROR: 'an error occurred during setUp/tearDown',
        ASSERTION_FAIL: 'assertion(s) failed',
        ASSERTION_COUNT: 'unexpected number of assertions'

    },
    {

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Initialize test case with name, test function, and optional setUp and
         * tearDown functions.
         *
         * @param name
         * @param func
         * @param setUp
         * @param tearDown
         */
        init: function(name, func, setUp, tearDown) {
            this.result = TestCase.UNTESTED;
            this.name = name;
            this.func = func;
            this.setUp = setUp;
            this.tearDown = tearDown;

            // by default, each phase of a test times out if not ended within ten seconds
            this.timeout = 10000;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the name of this test case.
         */
        getName: function() {
            return this.name;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the overall result code.
         */
        getResult: function() {
            return this.result;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the error object associated with a general error, if there was one. This
         * includes an immediate exception on load, an asynchronous uncaught exception during
         * the test, or the rejection of a returned promise.
         */
        getGeneralError: function() {
            return this.generalError;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return true if there was a general error and it bubbled up to the event
         * loop without being caught (such an error would cause process exit by default).
         */
        getGeneralErrorUncaught: function() {
            return this.generalError && this.generalError.uncaught;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * If there was a general error, this returns the phase at which it occurred, either
         * "setUp", "test", or "tearDown".
         */
        getGeneralErrorPhase: function() {
            return this.generalErrorPhase;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * If the case failed, return the general type of failure (one of the failure reason
         * codes defined above).
         */
        getFailure: function() {
            return this.failure;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return an array of assertions made in the last run of this case.
         */
        getAssertions: function() {
            return this.assertions || [];
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Get the number of assertions expected, or undefined if the test did not
         * express an expectation.
         */
        getExpectedAssertions: function() {
            return this.expectedAssertions;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Return the run duration of this test in milliseconds.
         */
        getDuration: function() {
            var dur = this.endTime - this.startTime;
            return isNaN(dur) ? 0 : dur;    // only return a number if both start and end occurred
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Run this case, and update the state to reflect the results. Returns
         * a completion promise that in normal circumstances should not be
         * rejected (that is, rejection indicates a fault in TestCase, not the
         * test itself or the code under test).
         */
        run: function() {
            var t = this;

            console.log('   ' + format(this.getName(), 'blue'));

            // get untainted versions of setTimeout and Date.now
            // before any test has a chance to patch them
            var origSetTimeout = setTimeout;
            var origDateNow = Date.now;

            delete this.expectedAssertions;
            
            this.endTime = NaN;
            this.startTime = NaN;

            function markStart() {
                t.startTime = origDateNow();
            }

            function markEnd() {
                t.endTime = origDateNow();
            }

            /**
             * This utility sets up the given deferred object to monitor both uncaught exceptions
             * and a timeout fuse, and rejects it if either occurs before it is otherwise
             * resolved or rejected. It has no effect if the deferred is already resolved.
             *
             * @param def
             * @param phase
             */
            function setupAsyncMonitors(def, phase) {
                // don't bother doing anything if the promise is already resolved
                if (!Q.isResolved(def.promise)) {

                    // set up an uncaught exception handler
                    function onErr(err) {
                        // mark this as an uncaught error
                        err.uncaught = true;
                        def.reject(err);
                    }
                    process.on('uncaughtException', onErr);

                    /*
                    // set up a timeout
                    // This is implemented as a series of 10ms timeouts rather than a single long span
                    // because the latter would result in premature timeouts during interactive debugging.
                    var chunk = 10;
                    var elapsed = 0;
                    var to;

                    function checkTimeout() {
                        if (elapsed >= t.timeout) {
                            to = null;
                            def.reject(new Error('timed out waiting for ' + phase));
                        } else {
                            elapsed += chunk;
                            to = origSetTimeout(checkTimeout, chunk);
                        }
                    }

                    checkTimeout();
                    */

                    // set up a timeout. this is a simpler single-span version of the above,
                    // here temporarily due to https://github.com/joyent/node/issues/2515
                    var to = origSetTimeout(function() {
                        def.reject(new Error('timed out waiting for ' + phase));
                    }, t.timeout);

                    // clean up both the timeout and the exception handler as soon
                    // as the promise settles
                    def.promise.fin(function() {
                        process.removeListener('uncaughtException', onErr);
                        clearTimeout(to);
                    });
                }
            }


            var phase = TestCase.SETUP;

            return Q.ref().then(
                function() {

                    markStart();

                    // if there is a setup function defined, run it and wait for it to be done
                    if (t.setUp) {
                        var setUpDone = Q.defer();

                        // call the actual setUp function
                        try {
                            var retval = t.setUp(setUpDone.resolve);
                            if (Q.isPromise(retval)) {
                                setUpDone.resolve(retval);
                            }
                        } catch (err) {
                            setUpDone.reject(err);
                        }

                        setupAsyncMonitors(setUpDone, TestCase.SETUP);

                        return setUpDone.promise;
                    }
                }
            ).then(
                function() {
                    // any necessary setup complete, we enter the test phase
                    phase = TestCase.TEST;

                    var testDone = Q.defer();

                    // construct an AssertRecord object to be passed in as the function's "test" parameter
                    t.assertRec = new AssertRecord();
                    t.assertRec.done = function() {
                        testDone.resolve();
                    };
                    t.assertRec.setTimeout = function(ms) {
                        t.timeout = ms;
                    };

                    // call the actual test function
                    try {
                        var retval = t.func(t.assertRec);
                        if (Q.isPromise(retval)) {
                            testDone.resolve(retval);
                        }
                    } catch (err) {
                        testDone.reject(err);
                    }

                    setupAsyncMonitors(testDone, TestCase.TEST);

                    return testDone.promise;
                }
            )
            .fail(  // test return value rejection counts as an error
                function(err) {
                    t.generalError = err;
                    t.generalErrorPhase = phase;
                    t.result = TestCase.FAILED;
                    t.failure = (phase == TestCase.TEST ? TestCase.GENERAL_ERROR : TestCase.SETUP_TEARDOWN_ERROR);
                }
            )
            .then(
                function() {

                    // we always want to run tearDown if it is defined and setUp was successful,
                    // whether or not the test was successful

                    phase = TestCase.TEARDOWN;

                    if (t.tearDown && t.failure != TestCase.SETUP_TEARDOWN_ERROR) {

                        var tearDownDone = Q.defer();

                        // call the actual tearDown function
                        try {
                            var retval = t.tearDown(tearDownDone.resolve);
                            if (Q.isPromise(retval)) {
                                tearDownDone.resolve(retval);
                            }
                        } catch (err) {
                            tearDownDone.reject(err);
                        }

                        setupAsyncMonitors(tearDownDone, TestCase.TEARDOWN);

                        return tearDownDone.promise.fail(
                            function(err) {
                                t.generalError = err;
                                t.generalErrorPhase = TestCase.TEARDOWN;
                                t.result = TestCase.FAILED;
                                t.failure = TestCase.SETUP_TEARDOWN_ERROR;
                            }
                        );
                    }

                }
            ).then(
                function() {

                    markEnd();

                    // finally, generate a result summary
                    t.result = TestCase.PASSED;

                    t.summary = {
                        passed: true,
                        errored: false,
                        aborted: false,
                        assertions: {
                            total: 0,
                            failed: 0
                        }
                    };

                    if (t.generalError) {
                        t.summary.passed = false;
                        t.summary.errored = true;
                        t.result = TestCase.FAILED;
                        if (t.failure == TestCase.SETUP_TEARDOWN_ERROR) {
                            t.summary.aborted = true;
                        }
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

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Get the summary produced by the last run.
         */
        getSummary: function() {
            return this.summary;
        },

        ///////////////////////////////////////////////////////////////////////////
        /**
         * Set the timeout in ms to be used for this test.
         */
        setTimeout: function(ms) {
            this.timeout = ms;
        }

    }
);


exports.TestCase = TestCase;