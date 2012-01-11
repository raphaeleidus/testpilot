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

var Q = require('qq');
var TestCase = require('../../lib/TestCase').TestCase;
var AssertRecord = require('../../lib/AssertRecord').AssertRecord;

exports['init'] = {

    'initially untested': function(test) {
        var tc = new TestCase('test', function() {});

        test.equal(tc.getResult(), TestCase.UNTESTED);
        test.equal(tc.getGeneralError(), undefined);

        test.done();
    }

};

exports['test function control'] = {

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

                test.deepEqual(summary, {
                    passed: false,
                    assertions: {
                        total: 1,
                        failed: 0
                    }
                });

                test.done();
            }
        ).end();
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

                test.deepEqual(summary, {
                    passed: false,
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

        var testFunc = function() {
            process.nextTick(function() {
                throw new Error('oh bother');
            });
        };

        var tc = new TestCase('test', testFunc);

        tc.run().then(
            function(summary) {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'oh bother');
                test.equal(tc.getGeneralErrorPhase(), 'test');

                test.deepEqual(summary, {
                    passed: false,
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

                test.deepEqual(summary, {
                    passed: false,
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
            return Q.ref();
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
            return Q.ref();
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
            return Q.ref();
        };


        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'set it up yourself');
                test.equal(tc.getGeneralErrorPhase(), 'setUp');
                test.done();
            }
        );
    },

    'follow-on error during setUp fails test': function(test) {

        var setUp = function(cb) {
            process.nextTick(function() {
                throw new Error('set it up yourself');
            });
        };

        var testFunc = function() {
            test.ok(false, 'should not be here');
            return Q.ref();
        };


        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'set it up yourself');
                test.equal(tc.getGeneralErrorPhase(), 'setUp');
                test.done();
            }
        );
    },

    'setUp promise rejection fails test': function(test) {

        var setUp = function(cb) {
            var done = Q.defer();
            setTimeout(function() {
                done.reject(new Error('never did set that up for you'));
            }, 3);
            return done.promise;
        };

        var testFunc = function() {
            test.ok(false, 'should not be here');
            return Q.ref();
        };

        var tc = new TestCase('test', testFunc, setUp);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'never did set that up for you');
                test.equal(tc.getGeneralErrorPhase(), 'setUp');
                test.done();
            }
        );
    }

};


exports['tearDown function control'] = {

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
            return Q.ref();
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
            return Q.ref();
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
            return Q.ref();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'hiccup');
                test.equal(tc.getGeneralErrorPhase(), 'tearDown');
                test.done();
            }
        );
    },

    'follow-on error during tearDown fails test': function(test) {

        var tearDown = function(cb) {
            process.nextTick(function() {
                throw new Error('hiccup later');
            });
        };

        var testFunc = function() {
            return Q.ref();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'hiccup later');
                test.equal(tc.getGeneralErrorPhase(), 'tearDown');
                test.done();
            }
        );
    },

    'tearDown promise rejection fails test': function(test) {

        var tearDown = function(cb) {
            var done = Q.defer();
            setTimeout(function() {
                done.reject(new Error('actually, no'));
            }, 3);
            return done.promise;
        };

        var testFunc = function() {
            return Q.ref();
        };

        var tc = new TestCase('test', testFunc, null, tearDown);

        tc.run().then(
            function() {
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'actually, no');
                test.equal(tc.getGeneralErrorPhase(), 'tearDown');
                test.done();
            }
        );
    },

    'tearDown runs even if test errors, does not obscure error': function(test) {

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

                // ... but since there was already a general error from the test itself,
                // don't worry about the teardown error
                test.equal(tc.getResult(), TestCase.FAILED);
                test.equal(tc.getGeneralError().message, 'kaboom');
                test.equal(tc.getGeneralErrorPhase(), 'test');
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
                    assertions: {
                        total: 5,
                        failed: 2
                    }
                });

                test.done();
            }
        );
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
