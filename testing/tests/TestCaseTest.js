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
var TestCase = require('../../lib/TestCase').TestCase;
var AssertRecord = require('../../lib/AssertRecord').AssertRecord;
var EventEmitter = require('events').EventEmitter;
var MonkeyPatcher = require('capsela-util').MonkeyPatcher;

exports['init'] = {

    'initially untested': function(test) {
        var tc = new TestCase('test', function() {});

        test.equal(tc.getResult(), TestCase.UNTESTED);
        test.equal(tc.getGeneralError(), undefined);

        test.done();
    }
};

exports['test function control'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'called with AssertRecord, stop after test.done': function(test) {

        var calledDone = false;
        var tc = new TestCase('test', function(test) {

            test.ok(test instanceof AssertRecord);

            setTimeout(function() {
                calledDone = true;
                test.done();
            }, 3);
        });

        tc.run().then(
            function() {
                test.ok(calledDone);
                test.done();
            }
        );
    },

    'stop after returned promise resolution': function(test) {

        var resolved = false;
        var tc = new TestCase('test', function() {
            var def = Q.defer();
            setTimeout(function() {
                resolved = true;
                def.resolve();
            }, 3);

            return def.promise;
        });

        tc.run().then(
            function() {
                test.ok(resolved);
                test.done();
            }
        );
    },

    'stop and fail after returned promise rejection': function(test) {
        var rejected = false;

        var tc = new TestCase('test', function(test) {
            var def = Q.defer();
            test.ok(true);
            setTimeout(function() {
                rejected = true;
                def.reject(new Error('oh my!'));
            }, 3);

            return def.promise;
        });

        tc.run().then(
            function(summary) {
                test.ok(rejected);
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'oh my!');
                test.equal(tc.getGeneralErrorPhase(), 'test');
                test.ok(!tc.getGeneralErrorUncaught());

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 1,
                        failed: 0
                    }
                });

                test.done();
            }
        ).done();
    },

    'direct error during test fails test': function(test) {

        var testFunc = function() {
            throw new Error('oh bother');
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'oh bother');
                test.equal(tc.getGeneralErrorPhase(), 'test');
                test.ok(!tc.getGeneralErrorUncaught());

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 0,
                        failed: 0
                    }
                });

                test.done();
            }
        );
    },

    'follow-on error during test fails test': function(test) {

        /*
        ABOUT THIS TEST: The goal is to ensure that Testpilot sets up
        a handler that will convert uncaught exceptions into test failures.
        This is trickier than it would seem, since we want to run this
        test of Testpilot *in* Testpilot itself, which will try to set up its
        own handler (which happens right *after* the test function completes
        provided it hasn't already ended), causing interference. We therefore
        substitute a mock "process" object so that the inner Testpilot (code
        under test) can be made to perceive an uncaughtException without
        actually triggering a test failure from the perspective of the outer
        Testpilot.
        */

        // cache the real "process" object
        var realproc = process;

        var testFunc = function() {
            // create a mock process object and copy over the necessary functions
            var proc = new EventEmitter;
            proc.nextTick = realproc.nextTick;
            proc.stdout = realproc.stdout;
            // patch it in
            MonkeyPatcher.patch(global, 'process', proc);

            // fake an uncaught exception after the inner Testpilot
            // has set up its handler
            realproc.nextTick(function() {
                proc.emit('uncaughtException', new Error('oh bother'));
            });
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'oh bother');
                test.equal(tc.getGeneralErrorPhase(), 'test');
                test.ok(tc.getGeneralErrorUncaught());

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 0,
                        failed: 0
                    }
                });

                test.done();
            }
        );
    },

    'test times out': function(test) {

        var testFunc = function(test) {
            test.setTimeout(100);
            // don't do anything
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'timed out waiting for test');
                test.equal(tc.getGeneralErrorPhase(), 'test');
                test.ok(!tc.getGeneralErrorUncaught());

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 0,
                        failed: 0
                    }
                });

                test.done();
            }
        );
    }

};


exports['setUp function control'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'setUp runs first, test waits for callback': function(test) {

        var setUpRun = false;
        var testStarted = false;
        var setUp = function(cb) {
            setUpRun = true;
            setTimeout(function() {
                test.ok(!testStarted);
                cb();
            }, 3);
        };

        var testFunc = function() {
            testStarted = true;
            test.ok(setUpRun);
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.done();
            }
        );
    },

    'setUp runs first, test waits for setUp promise resolution': function(test) {

        var setUpRun = false;
        var testStarted = false;
        var setUp = function(cb) {
            setUpRun = true;
            var done = Q.defer();
            setTimeout(function() {
                test.ok(!testStarted);
                done.resolve();
            }, 3);
            return done.promise;
        };

        var testFunc = function() {
            testStarted = true;
            test.ok(setUpRun);
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.done();
            }
        );

    },

    'direct error during setUp fails test': function(test) {

        var setUp = function(cb) {
            throw new Error('set it up yourself');
        };

        var testFunc = function() {
            test.ok(false, 'should not be here');
            return Q.resolve();
        };


        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'set it up yourself');
                test.equal(tc.getGeneralErrorPhase(), TestCase.SETUP);
                test.ok(!tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    },

    'follow-on error during setUp fails test': function(test) {

        // NOTE: See the explanation in 'follow-on error during test fails test' above.

        // cache the real "process" object
        var realproc = process;

        var setUp = function() {
            // create a mock process object and copy over the necessary functions
            var proc = new EventEmitter;
            proc.nextTick = realproc.nextTick;
            proc.stdout = realproc.stdout;
            // patch it in
            MonkeyPatcher.patch(global, 'process', proc);

            // fake an uncaught exception after the inner Testpilot
            // has set up its handler
            realproc.nextTick(function() {
                proc.emit('uncaughtException', new Error('set it up yourself'));
            });
        };

        var testFunc = function() {
            test.ok(false, 'should not be here');
            return Q.resolve();
        };


        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'set it up yourself');
                test.equal(tc.getGeneralErrorPhase(), TestCase.SETUP);
                test.ok(tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    },

    'setUp promise rejection fails test': function(test) {

        var setUp = function(cb) {
            return Q.delay(Q.reject(new Error('never did set that up for you')), 3);
        };

        var testFunc = function() {
            test.ok(false, 'should not be here');
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'never did set that up for you');
                test.equal(tc.getGeneralErrorPhase(), TestCase.SETUP);
                test.ok(!tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    }

};


exports['tearDown function control'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'tearDown runs last, completion waits for callback': function(test) {

        var runDone = false;
        var tearDownRun = false;
        var tearDown = function(cb) {
            tearDownRun = true;
            setTimeout(function() {
                test.ok(!runDone);
                cb();
            }, 3);
        };

        var testFunc = function() {
            test.ok(!tearDownRun);
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                runDone = true;
                test.ok(tearDownRun);
                test.done();
            }
        );
    },

    'tearDown runs last, completion waits for promise resolution': function(test) {

        var runDone = false;
        var tearDownRun = false;
        var tearDown = function(cb) {
            tearDownRun = true;
            var done = Q.defer();
            setTimeout(function() {
                test.ok(!runDone);
                done.resolve();
            }, 3);
            return done.promise;
        };

        var testFunc = function() {
            test.ok(!tearDownRun);
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                runDone = true;
                test.ok(tearDownRun);
                test.done();
            }
        );
    },

    'direct error during tearDown fails test': function(test) {

        var tearDown = function(cb) {
            throw new Error('hiccup');
        };

        var testFunc = function() {
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'hiccup');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.ok(!tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    },

    'follow-on error during tearDown fails test': function(test) {

        // NOTE: See the explanation in 'follow-on error during test fails test' above.

        // cache the real "process" object
        var realproc = process;

        var tearDown = function() {
            // create a mock process object and copy over the necessary functions
            var proc = new EventEmitter;
            proc.nextTick = realproc.nextTick;
            proc.stdout = realproc.stdout;
            // patch it in
            MonkeyPatcher.patch(global, 'process', proc);

            // fake an uncaught exception after the inner Testpilot
            // has set up its handler
            realproc.nextTick(function() {
                proc.emit('uncaughtException', new Error('hiccup later'));
            });
        };

        var testFunc = function() {
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'hiccup later');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.ok(tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    },

    'tearDown promise rejection fails test': function(test) {

        var tearDown = function(cb) {
            return Q.delay(Q.reject(new Error('actually, no')), 3);
        };

        var testFunc = function() {
            return Q.resolve();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'actually, no');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.ok(!tc.getGeneralErrorUncaught());
                test.done();
            }
        );
    },

    'tearDown runs even if test errors': function(test) {

        var tearDownRan = false;
        var tearDown = function() {
            tearDownRan = true;
            throw new Error('hiccup');
        };

        var testFunc = function() {
            throw new Error('kaboom');
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {

                // the teardown ran
                test.ok(tearDownRan);

                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'hiccup');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.done();
            }
        );
    },

    'tearDown runs even if test times out': function(test) {

        var tearDownRan = false;
        var tearDown = function(cb) {
            tearDownRan = true;
            cb()
        };

        var testFunc = function() {
            // do nothing, time out
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.setTimeout(50);

        tc.run().then(
            function() {

                // the teardown ran
                test.ok(tearDownRan);

                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.GENERAL_ERROR);
                test.equal(tc.getGeneralError().message, 'timed out waiting for test');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEST);
                test.done();
            }
        );
    },

    'tearDown does not run if setUp fails': function(test) {

        var setUp = function() {
            throw new Error('setup failed');
        };

        var tearDownRan = false;
        var tearDown = function(cb) {
            tearDownRan = true;
            cb()
        };

        var testFunc = function() {};

        var tc = new TestCase('test', testFunc, setUp, tearDown);

        tc.setTimeout(50);

        tc.run().then(
            function(summary) {

                // the teardown ran
                test.ok(!tearDownRan);
                test.ok(summary.aborted);
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'setup failed');
                test.equal(tc.getGeneralErrorPhase(), TestCase.SETUP);
                test.done();
            }
        );
    }

};

exports['aborting test run'] = {

    'abort if errors in test and tearDown': function(test) {

        var tearDown = function(cb) {
            throw new Error('tearDown error');
        };

        var testFunc = function() {
            throw new Error('test error');
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.setTimeout(50);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'tearDown error');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.done();
            }
        );
    },

    'abort if assertion failures in test and error tearDown': function(test) {

        var tearDown = function(cb) {
            throw new Error('tearDown error');
        };

        var testFunc = function(test) {
            test.ok(false);
            test.done();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.setTimeout(50);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.SETUP_TEARDOWN_ERROR);
                test.equal(tc.getGeneralError().message, 'tearDown error');
                test.equal(tc.getGeneralErrorPhase(), TestCase.TEARDOWN);
                test.done();
            }
        );
    }

};


exports['summary and reporting'] = {

    'run returns summary with assertion counts (fail)': function(test) {

        var testFunc = function(test) {
            test.ok(true);
            test.ok(false);
            test.ok(false);
            test.ok(true);
            test.ok(true);
            test.done();
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.ASSERTION_FAIL);

                test.deepEqual(summary, {
                    passed: false,
                    errored: false,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 5,
                        failed: 2
                    }
                });

                test.done();
            }
        ).done();
    },

    'run returns summary with assertion counts (immediate error)': function(test) {

        var testFunc = function(test) {
            test.ok(true);
            test.ok(false);

            throw new Error('Aaaargghhh!');
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.GENERAL_ERROR);

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 2,
                        failed: 1
                    }
                });

                test.done();
            }
        );
    },

    'run returns summary with assertion counts (assertion count mismatch)': function(test) {

        var testFunc = function(test) {
            test.expect(3);
            test.ok(true);
            test.ok(true);
            test.done();
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getFailure(), TestCase.ASSERTION_COUNT);

                test.deepEqual(summary, {
                    passed: false,
                    errored: true,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 2,
                        failed: 0
                    }
                });

                test.deepEqual(tc.getSummary(), summary);

                test.done();
            }
        );
    },

    'run returns summary with assertion counts (pass)': function(test) {

        var testFunc = function(test) {
            test.ok(true);
            test.ok(true);
            test.done();
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.PASSED);
                test.equal(tc.getFailure(), undefined);

                test.deepEqual(summary, {
                    passed: true,
                    errored: false,
                    skipped: false,
                    aborted: false,
                    assertions: {
                        total: 2,
                        failed: 0
                    }
                });

                test.deepEqual(tc.getSummary(), summary);

                test.done();
            }
        );
    }

};

exports["skipping tests"] = {

    "test skip": function(test) {

        var testFunc = function(test) {

            test.ok(true);

            test.skip();

            test.ok(false);
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {

                test.equal(tc.getResult(), TestCase.SKIPPED);
                test.equal(tc.getFailure(), undefined);

                test.deepEqual(summary, {
                    passed: true,
                    errored: false,
                    skipped: true,
                    aborted: false,
                    assertions: {
                        total: 1,
                        failed: 0
                    }
                });

                test.done();
            }
        );
    }
};

exports['duration timing'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'record duration': function(test) {

        var testFunc = function(test) {
            test.done();
        };

        var tc = new TestCase('test', testFunc);

        // This is fragile, and may break as a side effect of Node version changes or
        // valid changes to the logic in TestCase. We want to know that TestCase calls
        // Date.now() at the beginning and end of a the test, and that he duration is
        // the span between them. The problem is that Node's setTimeout (which TestCase
        // uses) calls Date.now internally, and uses the "public" version that we're
        // monkey patching here. We therefore are not confident that the monkey patched
        // version will be called only twice, and can't seed it with precise test data
        // as a result. As of Node v0.10.18 it's called three times, and this test
        // attempts to be robust by assuming only that the code under test will call
        // it twice without anything in between.

        var time = 100;
        MonkeyPatcher.patch(Date, 'now', function() {
            time += 42;
            return time;
        });

        tc.run().then(
            function(summary) {
                test.equal(tc.getDuration(), 42);
                test.done();
            }
        );

    },

    'timing accurate even if test patches Date.now()': function(test) {

        // if TestCase isn't careful and uses Date.now() directly, this
        // test will break it

        // but see caveat in the test above this one

        var time = 100;
        MonkeyPatcher.patch(Date, 'now', function() {
            time += 42;
            return time;
        });

        var origDateNow = Date.now;
        var setUp = function(cb) {
            Date.now = function() {
                return Math.floor(Math.random() * 100000);
            };
            cb();
        };

        var testFunc = function(test) {
            test.done();
        };

        var tearDown = function(cb) {
            Date.now = origDateNow;
            cb();
        };

        var tc = new TestCase('test', testFunc, setUp, tearDown);

        tc.run().then(
            function(summary) {
                test.equal(tc.getDuration(), 42);
                test.done();
            }
        );

    }


};
