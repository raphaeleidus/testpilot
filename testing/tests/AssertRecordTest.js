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

var Q = require('q');
var AssertRecord = require('../../lib/AssertRecord').AssertRecord;
var path = require('path');

var ar;

exports["basics"] = {

    'init': function(test) {

        var ar = new AssertRecord();

        test.equal(ar.closed, false);
        test.done();
    },

    'close': function(test) {

        var ar = new AssertRecord();

        ar.ok(true, 'should be true');

        ar.close();

        ar.ok(true, 'should be true');

        ar.getAssertions().then(
            function(assertions) {

                test.equal(assertions.length, 1);

                test.done();
            }
        );
    }
};

exports['assertions'] = {

    setUp: function(cb) {
        ar = new AssertRecord();
        cb();
    },

    'fail': function(test) {
        ar.fail(1, 2, 'your message', '!=!');
        ar.fail(1, 2, undefined, '!=!');
        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions[0].error.toString(), 'AssertionError: your message');
                test.equal(assertions[1].error.toString(), 'AssertionError: 1 !=! 2');

                test.done();
            }
        ).done();
    },

    'ok': function(test) {

        ar.ok(true, 'should be true');
        ar.ok(false, 'should also be true');
        ar.ok(Q(true), 'should eventually be true');
        ar.ok(Q(false), 'should also eventually be true');
        ar.immediateOk(Q(false), 'should immediately be true');

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 5);
                
                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error.message, 'should also be true');
                test.equals(assertions[2].error, undefined);
                test.equals(assertions[3].error.message, 'should also eventually be true');
                test.equals(assertions[4].error, undefined);

                test.done();
            }
        ).done();
    },

    'equal': function(test) {

        ar.equal(2, 2, 'should be equal');
        ar.notEqual(2, 3, 'should not be equal');

        ar.equal(2, 3, 'should also be equal');
        ar.notEqual(3, 3, 'should also not be equal');

        ar.equal(2, Q(2), 'should eventually be equal');
        ar.notEqual(2, Q(3), 'should eventually not be equal');

        ar.equal(Q(2), 3, 'should also eventually be equal');
        ar.notEqual(Q(3), 3, 'should also eventually not be equal');

        ar.immediateEqual(2, 2, 'should immediately be equal');
        ar.immediateNotEqual(2, 3, 'should immediately not be equal');

        // @TODO: figure out how this should work with respect to promises' valueOf() method
        ar.immediateEqual(Q(2), 2, 'should immediately be equal');
        ar.immediateNotEqual(Q(2), Q(2), 'should immediately not be equal');

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 12);

                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error, undefined);

                test.equals(assertions[2].error.message, 'should also be equal');
                test.equals(assertions[3].error.message, 'should also not be equal');

                test.equals(assertions[4].error, undefined);
                test.equals(assertions[5].error, undefined);

                test.equals(assertions[6].error.message, 'should also eventually be equal');
                test.equals(assertions[7].error.message, 'should also eventually not be equal');

                test.equals(assertions[8].error, undefined);
                test.equals(assertions[9].error, undefined);

                test.equals(assertions[10].error, undefined);
                test.equals(assertions[11].error, undefined);

                test.done();
            }
        ).done();
    },

    'deepEqual and notDeepEqual': function(test) {

        ar.deepEqual([ 1, 2 ], [ 1, 2 ], 'should be equal');
        ar.notDeepEqual([ 1, 2 ], [ 1, 2 ], 'should not be equal');

        ar.deepEqual([ 1, 3 ], [ 1, 2 ], 'should also be equal');
        ar.notDeepEqual([ 1, 3 ], [ 1, 2 ], 'should also not be equal');

        ar.deepEqual([ 1, 2 ], Q([ 1, 2 ]), 'should eventually be equal');
        ar.notDeepEqual([ 1, 2 ], Q([ 1, 2 ]), 'should eventually not be equal');

        ar.deepEqual(Q([ 1, 3 ]), [ 1, 2 ], 'should also eventually be equal');
        ar.notDeepEqual(Q([ 1, 3 ]), [ 1, 2 ], 'should also eventually not be equal');

        var a = [ 1, 3 ];
        var b = [ 1, 3 ];
        ar.deepEqual(a, b, 'should still be equal when compared');
        b.push(5);

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 9);

                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error.message, 'should not be equal');

                test.equals(assertions[2].error.message, 'should also be equal');
                test.equals(assertions[3].error, undefined);

                test.equals(assertions[4].error, undefined);
                test.equals(assertions[5].error.message, 'should eventually not be equal');

                test.equals(assertions[6].error.message, 'should also eventually be equal');
                test.equals(assertions[7].error, undefined);

                test.equals(assertions[8].error, undefined);

                test.done();
            }
        ).done();
    },

    'strictEqual and notStrictEqual': function(test) {

        ar.strictEqual(1, 1, 'should be equal');
        ar.notStrictEqual(1, 1, 'should not be equal');

        ar.strictEqual(false, 0, 'should also be equal');
        ar.notStrictEqual(false, 0, 'should also not be equal');

        ar.strictEqual(3, Q(3), 'should eventually be equal');
        ar.notStrictEqual(3, Q(3), 'should eventually not be equal');

        ar.strictEqual(Q('3'), 3, 'should also eventually be equal');
        ar.notStrictEqual(Q('3'), 3, 'should also eventually not be equal');

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 8);

                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error.message, 'should not be equal');

                test.equals(assertions[2].error.message, 'should also be equal');
                test.equals(assertions[3].error, undefined);

                test.equals(assertions[4].error, undefined);
                test.equals(assertions[5].error.message, 'should eventually not be equal');

                test.equals(assertions[6].error.message, 'should also eventually be equal');
                test.equals(assertions[7].error, undefined);

                test.done();
            }
        ).done();
    },

    'throws and doesNotThrow': function(test) {

        ar.throws(function() { throw new Error('hiccup'); }, 'should hiccup');
        ar.doesNotThrow(function() { throw new Error('hiccup'); }, 'should not hiccup');

        ar.throws(function() {}, 'should hiccup');
        ar.doesNotThrow(function() {}, 'should not hiccup');

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 4);

                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error.message, 'hiccup');

                test.equals(assertions[2].error.message, 'Missing expected exception. should hiccup');
                test.equals(assertions[3].error, undefined);

                test.done();
            }
        ).done();
    },

    'ifError': function(test) {

        ar.ifError(undefined);
        ar.ifError(new Error('this would be an error'));

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions.length, 2);

                test.equals(assertions[0].error, undefined);
                test.equals(assertions[1].error.message, 'this would be an error');

                test.done();
            }
        ).done();
    },

    'expect and getExpected': function(test) {
        test.equal(ar.getExpected(), undefined);
        ar.expect(5);
        test.equal(ar.getExpected(), 5);
        test.done();
    },

    rejects: function(test) {

        ar.rejects(Q(5));
        ar.rejects(Q(10), null, 'this can never be');
        ar.rejects(Q.reject(new Error('error for you!')));

        // the following tests both the error validator function and, more subtly,
        // the general ability to make assertions from within the resolution process
        // of an earlier assertion. See note in AssertRecord.getAssertions() for more.
        ar.rejects(Q.reject(new Error('another error for you!')), function(err) {
            ar.equal(err.message, 'another error for you!');
        });

        ar.getAssertions().then(
            function(assertions) {

                test.equal(assertions.length, 5);

                test.equal(assertions[0].error.message, 'promise should have been rejected, but was resolved');
                test.equal(assertions[1].error.message, 'this can never be');
                test.equal(assertions[2].error, undefined);
                test.equal(assertions[3].error, undefined);
                test.equal(assertions[4].error, undefined);

                test.done();
            }
        ).done();
    }

};


exports['deferred arguments'] = {

    'argument promises given limited time to resolve': function(test) {
        ar = new AssertRecord();

        var slowArg = Q.defer();
        ar.ok(slowArg.promise);

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions[0].error.message, 'timed out waiting for assertion arguments to resolve');
                test.done();
            }
        ).done();
    },

    'argument promise rejection results in assertion failure': function(test) {
        ar = new AssertRecord();

        ar.ok(Q.reject(new Error('not okay at all')));

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions[0].error.message, 'not okay at all');
                test.done();
            }
        ).done();
    }

};


exports['assert location tracking'] = {

    setUp: function(cb) {
        ar = new AssertRecord();
        cb();
    },

    'test file and line number': function(test) {

        var file = path.basename(__filename);

        // keep these two asserts separated by one line (although we don't
        // know what absolute line numbers they are on, at least we can test
        // that the calculated numbers are accurate relative to each other)
        ar.ok(true);
        //----------
        ar.equal(1, 2);

        ar.getAssertions().then(
            function(assertions) {
                test.equal(assertions[0].file, file, assertions[0].assertLine);
                test.equal(assertions[1].file, file, assertions[0].assertLine);
                test.equal(parseInt(assertions[0].line) + 2, assertions[1].line);

                test.done();
            }
        ).done();

    }

};
