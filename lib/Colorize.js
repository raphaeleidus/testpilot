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
 * Date: 1/10/12
 */

/**
 * The ANSI color assignment code below is inspired by that found in
 * the ansi-color node module (Copyright (c) 2010 James Smith <james@loopj.com>),
 * here stripped down and simplified.
 */

var STYLES = {
  "bold": 1,
  "italic": 3,
  "underline": 4,
  "blink": 5,
  "black": 30,
  "red": 31,
  "green": 32,
  "yellow": 33,
  "blue": 34,
  "magenta": 35,
  "cyan": 36
};

function wrapString(str, style) {
    if (!style) {
        return str;
    }
    style.split("+").forEach(function(style) {
        str = "\033[" + STYLES[style] + "m" + str;
    });
    str += "\033[0m";
    return str;
}

exports.wrapString = wrapString;



var options = {
    colorEnabled: true
};

exports.format = function(string, color) {
    if (options.colorEnabled) {
        return exports.wrapString(string, color);
    } else {
        return string;
    }
};

exports.useColor = function(use) {
    options.colorEnabled = use;
};