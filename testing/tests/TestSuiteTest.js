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

var TestSuite = require('../../lib/TestSuite').TestSuite;
var TestCase = require('../../lib/TestCase').TestCase;
var Q = require('qq');

var path = require('path');
var fixturesDir = __dirname + '/../fixtures';

var MonkeyPatcher = require('capsela-util').MonkeyPatcher;

exports['basics'] = {

    setUp: MonkeyPatcher.setUp,
    tearDown: MonkeyPatcher.tearDown,

    'test init with empty file': function(test) {

        var ts = new TestSuite(fixturesDir + '/EmptyFileTest.js');

        test.equal(ts.getName(), 'EmptyFileTest');
        test.equal(ts.getResult(), TestSuite.NO_TESTS);
        test.deepEqual(ts.getTests(), []);

        test.done();
    },

    'test init with immediate exception': function(test) {

        var ts = new TestSuite(fixturesDir + '/ThrowingFileTest.js');

        test.equal(ts.getName(), 'ThrowingFileTest');
        test.equal(ts.getResult(), TestSuite.LOAD_ERROR);
        test.equal(ts.getLoadError().message, "hmm, that's not good...");
        test.deepEqual(ts.getTests(), []);

        test.done();
    },

    'test init with nodeunit suite': function(test) {

        var ts = new TestSuite(fixturesDir + '/NodeunitFileTest.js');

        test.equal(ts.getName(), 'NodeunitFileTest');
        test.equal(ts.getResult(), TestSuite.UNTESTED);

        var tests = ts.getTests();
        test.equal(tests.length, 3);

        test.equal(tests[0].getName(), 'some group : test something');
        test.equal(tests[1].getName(), 'some group : test something else');
        test.equal(tests[2].getName(), 'standAloneTest');

        test.done();
    },

    'test loadCases with nodeunit exports': function(test) {

        var setUp = function() {};
        var tearDown = function() {};
        var test1 = function() {};
        var test2 = function() {};

        var exps = {
            setUp: setUp,
            tearDown: tearDown,
            test1: test1,
            test2: test2
        };

        var ts = new TestSuite();

        var names = [];
        var funcs = [];

        MonkeyPatcher.patch(TestCase.prototype, 'init', function(name, func, up, down) {
            names.push(name);
            funcs.push(func);
            test.equal(up, setUp);
            test.equal(down, tearDown);
        });

        ts.loadCases(exps);

        test.deepEqual(names, ['test1', 'test2' ]);
        test.deepEqual(funcs, [ test1, test2 ]);

        test.done();
    },

    'test loadCases with nodeunit group': function(test) {

        var setUp = function() {};
        var tearDown = function() {};
        var test1 = function() {};
        var test2 = function() {};

        var exps = {
            'group': {
                setUp: setUp,
                tearDown: tearDown,
                test1: test1,
                test2: test2
            }
        };

        var ts = new TestSuite();

        var names = [];
        var funcs = [];

        MonkeyPatcher.patch(TestCase.prototype, 'init', function(name, func, up, down) {
            names.push(name);
            funcs.push(func);
            test.equal(up, setUp);
            test.equal(down, tearDown);
        });

        ts.loadCases(exps);

        test.deepEqual(names, ['group : test1', 'group : test2' ]);
        test.deepEqual(funcs, [ test1, test2 ]);

        test.done();
    }

};