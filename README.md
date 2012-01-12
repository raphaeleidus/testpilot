A promise-savvy testing framework for Node.js.
===

### Key features:

* Backward compatible with nodeunit: runs any* nodeunit test suite without modification.
* Pass either immediate values or promises to assertions. Testpilot will resolve them for you.
* End a test/setUp/tearDown function either in the nodeunit style or by returning a promise.

\* Any nodeunit test that does not already pass promises to assertion functions, that is.

Usage
---

   npm install testpilot

   testpilot path/to/test/directory

Details coming soon.


Resources
---
  - [Q API](http://github.com/kriskowal/q)
