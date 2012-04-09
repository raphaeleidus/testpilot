###
 Author: Seth Purcell
 Date: 1/5/12
###

# this looks like a nodeunit test suite

exports['some group'] =

    'test something': (test) ->
        test.ok('yup');
        test.done();

    'test something else': (test) ->
        test.ok(false);
        test.done();

exports.standAloneTest = (test) ->
    test.ok('I am a banana!');
    test.done();