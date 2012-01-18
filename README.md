A promise-savvy testing framework for Node.js.
=============================================

Key Features
------------

- Backward compatible with nodeunit: runs any* nodeunit test suite without modification.
- Pass either immediate values or promises to assertions. Testpilot will resolve them for you.
- End a test/setUp/tearDown function either in the nodeunit style or by returning a promise.

\* Any nodeunit test that does not already pass promises to assertion functions, that is.

Usage
-----

Install using [NPM](http://www.npmjs.org).

    npm install -g testpilot

Testpilot is best installed using NPM's
[global](http://blog.nodejs.org/2011/03/23/npm-1-0-global-vs-local-installation/) option,
which makes the `testpilot` command available everywhere.

You can then run all the tests in a single file:

    testpilot path/to/test/directory/SomethingTest.js

Or all the tests under a directory, recursively:

    testpilot path/to/test/directory

Or any combination:

    testpilot /path/to/directory /other/path/to/SomeTest.js


Writing Tests
-------------

Testpilot was created (and continues to evolve rapidly) with the goal of testing
[Capsela](https://github.com/Sitelier/capsela) and projects built upon it. Those
projects' tests used [Nodeunit](https://github.com/caolan/nodeunit) originally,
so nodeunit compatibility was required from the outset. Valid Nodeunit tests are
valid Testpilot tests as well, with only a few caveats:

- since Testpilot's assertion functions accept promises and wait for them to resolve,
any Nodeunit test that tries to compare *promises* rather than their eventual values
will need adjustment. This is unlikely to ever bother anybody.
- Testpilot doesn't need Nodeunit's `testCase` function, but then again neither does
Nodeunit.

If you are already using a Nodeunit with the default human-readable reporter, then you
probably don't need to change anything. You can scroll down to **Where Testpilot is
Different**. Otherwise, read on for a quick synopsis.

### Basic Test Structure

A test suite is any module that exports test cases. A test case is a function that receives
one argument, a test object used to make assertions and control completion of the test:

    exports.test1 = function(test) {
        test.ok(true);
        test.equal('apple', 'orange');
        test.done();
    };

Test cases may also be organized into groups, with optional setUp and tearDown functions:

    exports['a group of tests'] = {

        setUp: function(cb) {
            ...
            cb();
        },

        tearDown: function(cb) {
            ...
            cb();
        },

        'one test': function(test) ...

        'another test': function(test) ...
    }

Like Nodeunit, Testpilot supports the basic set of assertions found in Node's `assert`
module.

### Where Testpilot is Different

Testpilot tries hard to work with any existing Nodeunit test suite, but adds new options
that better fit the needs of promise-based asynchronous code (specifically that built on
the Q library). Testing promise-based code with Nodeunit frequently leads to patterns like
this:

    'test someFunc's return value': function(test) {
        // someFunc is asynchronous, returns a promise
        someFunc(5).then(
            function(retVal) {  // make sure the return value is correct
                test.equal(retVal, 12);
                test.done();
            },
            function(err) {     // rejected! fail somehow and end the test
                test.fail(err);
                test.done();
            }
        );
    }

This is complicated because the promise returned by `someFunc` must be explicitly resolved
before the equality assertion. Testpilot knows about promises, so you can do this instead:

    'test someFunc's return value': function(test) {
        test.equal(someFunc(5), 12);
        test.done();
    }

Testpilot will wait for the promise returned by `someFunc(5)` to resolve before comparing,
even though `test.done()` has already been called by the time that happens. If the promise
is rejected or takes too long to resolve, the test fails with an appropriate error.

If you don't actually care about the *value* of a promise, but only that it resolves, you
can simplify even further:

    'test someFunc succeeds': function() {
        return someFunc(5);
    }

This test uses the resolution or rejection of a promise in lieu of a call to `test.done()`.
Rejection of the returned promise, of course, results in test failure. This does not obviate
`test.done()` in every situation, but is often the most concise and natural way to end a test
built using chained promises. You can also return a promise in a setUp or tearDown method
rather than calling its callback.

However you choose to do it, it is important to tell Testpilot when a test is complete. But
what if you forget? Nodeunit either hangs forever or exits abruptly with an error message,
depending on the state of Node's event loop. This is inconvenient if you are using it as part
of an automated build; it doesn't run all the tests and it doesn't create a final report.
Testpilot instead times out and fails the offending test and moves on to the next one, always
trying to finish in finite time and deliver a usable result. By default, the timeout is five
seconds, but if you have a long-running test you can adjust it by calling `test.setTimeout()`
with the desired number of milliseconds.

### Additional Assertions

Testpilot supports all the normal Nodeunit assertions, plus one more:

    test.rejects(promise, [errorValidator], [message]);

   - *promise*: a promise that you expect to be rejected
   - *errorValidator*: (optional) function that is called with the rejection reason, and may
   make additional assertions
   - *message*: (optional) message to report if the assertion fails

### Reporters

At present, Testpilot supports two result reporters, although more will appear in the near
future:

#### Console Reporter

The Console reporter generates a human-readable summary of tests that have failed, suitable
for rapid TDD. See `testpilot --help` for options. This is the default reporter.

#### Junit Reporter

The Junit reporter writes an XML file in (approximately) Junit format, suitable for consumption
by Jenkins or other continuous integration servers.

**Note:** reporters are not mutually exclusive. If you want both a human-readable report and a
junit file, just say so. See `testpilot --help` for details.


Resources
---------
  - [Q API](http://github.com/kriskowal/q) - see the README for Kris Kowal's excellent tutorial
  - [Nodeunit](http://github.com/caolan/nodeunit)
