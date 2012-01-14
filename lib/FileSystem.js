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

var Q = require('q');
var fs = require('fs');
var path = require('path');

/**
 * Promise wrapper for fs.stat
 * @param p
 */
function stat(p) {
    var def = Q.defer();
    fs.stat(p, def.node());
    return def.promise;
}

exports.stat = stat;


/**
 * Promise wrapper for fs.list
 * @param p
 */
function list(p) {
    var def = Q.defer();
    fs.readdir(p, def.node());
    return def.promise;
}

exports.list = list;


/**
 * Promise wrapper for fs.writeFile
 * @param p
 */
function writeFile(p, data, encoding) {
    var def = Q.defer();
    fs.writeFile(p, data, encoding, def.node());
    return def.promise
}

exports.writeFile = writeFile;


/**
 * Promise wrapper for fs.readFile
 * @param p
 */
function readFile(p, encoding) {
    var def = Q.defer();
    fs.readFile(p, encoding, def.node());
    return def.promise
}

exports.readFile = readFile;


/**
 * Independent implementation of Kris Kowal's Q-fs listTree method. Here
 * to avoid depending on the whole of Q-fs for one little function.
 *
 * @param basePath
 * @param guard
 */
function listTree(basePath, guard) {
    basePath = path.resolve(basePath);

    return stat(basePath).then(
        function(topStat) {
            var results = [];
            if (!guard || guard(basePath, topStat)) {
                results.push(basePath);
            }

            if (topStat.isDirectory()) {

                return list(basePath).then(
                    function(items) {
                        return Q.all(items.map(
                            function(item) {
                                var fullPath = path.join(basePath, item);
                                return listTree(fullPath, guard);
                            }
                        ));
                    }
                ).then(
                    function(sets) {
                        return Array.prototype.concat.apply(results, sets).sort(
                            function(a, b) {
                                return a.toLowerCase().localeCompare(b.toLowerCase());
                            }
                        );
                    }
                );
            }
            
            return results;
        }
    );

}

exports.listTree = listTree;