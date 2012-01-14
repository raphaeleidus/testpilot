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
 * Date: 1/13/12
 */

var fs = require('../../lib/FileSystem');
var Q = require('q');
var path = require('path');

exports['basics'] = {

    stat: function(test) {

        test.expect(2);

        fs.stat(__dirname + '/../fixtures/TestsDir1').then(
            function(stat) {
                test.ok(stat.isDirectory());
                return fs.stat(__dirname + '/../fixtures/FileATest.js');
            }
        ).then(
            function(stat) {
                test.ok(stat.isFile());
                return fs.stat(__dirname + '/../fixtures/FileZTest.js');
            }
        ).then(
            null,
            function(err) {
                test.done();
            }
        );

    },

    readdir: function(test) {

        test.expect(1);

        fs.list(__dirname + '/../fixtures/TestsDir1').then(
            function(list) {
                test.deepEqual(list, [ 'subdir', 'TestBTest.js', 'TestCTest.js' ]);
                return fs.list(__dirname + '/../fixtures/FileATest.js');
            }
        ).then(
            function() {
                test.ok(false, 'should not be here');
            },
            function(err) {
                return fs.list(__dirname + '/../fixtures/TestsDirZ');
            }
        ).then(
            function() {
                test.ok(false, 'should not be here');
            },
            function(err) {
                test.done();
            }
        );

    },

    'listTree basic': function(test) {

        var base = path.resolve(__dirname + '/../fixtures/TestsDir4');
        fs.listTree(base).then(
            function(list) {
                test.deepEqual(list, [
                    base,
                    base + '/A',
                    base + '/A/d.txt',
                    base + '/A/E',
                    base + '/A/E/f.txt',
                    base + '/B',
                    base + '/B/G',
                    base + '/B/h.txt',
                    base + '/c.txt'
                ]);

                test.done();
            }
        ).end();

    },

    'listTree with file-only guard': function(test) {

        var base = path.resolve(__dirname + '/../fixtures/TestsDir4');
        fs.listTree(base, function(p, stat) {
            return stat.isFile()
        }).then(
            function(list) {
                test.deepEqual(list, [
                    base + '/A/d.txt',
                    base + '/A/E/f.txt',
                    base + '/B/h.txt',
                    base + '/c.txt'
                ]);

                test.done();
            }
        ).end();

    },

    'listTree with directory-only guard': function(test) {

        var base = path.resolve(__dirname + '/../fixtures/TestsDir4');
        fs.listTree(base, function(p, stat) {
            return stat.isDirectory()
        }).then(
            function(list) {
                test.deepEqual(list, [
                    base,
                    base + '/A',
                    base + '/A/E',
                    base + '/B',
                    base + '/B/G'
                ]);

                test.done();
            }
        ).end();

    }

};