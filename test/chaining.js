var proxyquire = require('proxyquire');
var test = require('tape');
var ko = require('./lib/knockout');
var common = require('./common.js');

proxyquire('../', {knockout: ko});

function charCode(x) {
    return x.charCodeAt(0);
}

function evenDistanceFrom65(x) {
    return (x - 65) % 2 === 0;
}

function evenDistanceFromA(x) {
    return evenDistanceFrom65(charCode(x));
}

function greaterThan69(x) {
    return x > 69;
}

var randomLetters = ['H', 'I', 'F', 'G', 'D', 'E', 'B', 'C', 'A'];

test('filter -> filter', function (t) {
    t.plan(9);

    var a = ko.observableArray([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]);
    var b = a.filter(greaterThan69).filter(evenDistanceFrom65);

    var changes;
    b.subscribe(function (x) {changes = x}, null, 'arrayChange');

    t.deepEqual(b(), [71, 73, 75]);

    a.reverse();
    t.deepEqual(b(), [75, 73, 71]);

    // 3.4.0 produces a different diff, but applying it should produce the
    // same result, so it doesn't cause any known problems.
    if (ko.version >= '3.4.0') {
        t.deepEqual(changes, [
            {status: 'added', index: 0, moved: 2, value: 75},
            {status: 'deleted', index: 0, moved: 2, value: 71},
            {status: 'added', index: 2, moved: 0, value: 71},
            {status: 'deleted', index: 2, moved: 0, value: 75}
        ]);
    } else {
        t.deepEqual(changes, [
            {status: 'deleted', index: 0, moved: 2, value: 71},
            {status: 'added', index: 0, moved: 2, value: 75},
            {status: 'deleted', index: 2, moved: 0, value: 75},
            {status: 'added', index: 2, moved: 0, value: 71}
        ]);
    }

    a.push(73);
    t.deepEqual(b(), [75, 73, 71, 73]);
    t.deepEqual(changes, [{status: 'added', index: 3, value: 73}]);

    a.unshift(73);
    t.deepEqual(b(), [73, 75, 73, 71, 73]);
    t.deepEqual(changes, [{status: 'added', index: 0, value: 73}]);

    a.removeAll([73]);
    t.deepEqual(b(), [75, 71]);
    t.deepEqual(changes, [
        {status: 'deleted', index: 0, value: 73},
        {status: 'deleted', index: 2, value: 73},
        {status: 'deleted', index: 4, value: 73}
    ]);
});

test('filter -> filter -> filter', function (t) {
    t.plan(2);

    var numbers = [];

    for (var i = 0; i < 1000; i++) {
        numbers.push(i + 1);
    }

    var a = ko.observableArray(numbers);
    var b = a.filter(function (x) {return x % 3 === 0});
    var c = b.filter(function (x) {return x % 5 === 0});
    var d = c.filter(function (x) {return x % 7 === 0});

    t.deepEqual(d(), [105, 210, 315, 420, 525, 630, 735, 840, 945]);

    a.reverse();
    t.deepEqual(d(), [945, 840, 735, 630, 525, 420, 315, 210, 105]);
});

test('filter -> sortBy', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.filter(evenDistanceFromA).sortBy();

    t.deepEqual(b(), ['A', 'C', 'E', 'G', 'I']);

    var latestChanges;
    b.subscribe(function (changes) {latestChanges = changes}, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), ['A', 'C', 'E', 'G', 'I', 'K']);
    t.deepEqual(latestChanges, [{status: 'added', index: 5, value: 'K'}]);
});

test('filter -> groupBy', function (t) {
    t.plan(1);

    var a = ko.observableArray([66, 67, 68, 69, 70, 71, 72]);
    var b = a.filter(common.isEven).groupBy(greaterThan69);

    t.deepEqual(ko.toJS(b()), [
        {key: 'false', values: [66, 68]},
        {key: 'true', values: [70, 72]}
    ]);
});

test('sortBy -> filter', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.sortBy().filter(evenDistanceFromA);

    t.deepEqual(b(), ['A', 'C', 'E', 'G', 'I']);

    var latestChanges;
    b.subscribe(function (changes) {latestChanges = changes}, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), ['A', 'C', 'E', 'G', 'I', 'K']);
    t.deepEqual(latestChanges, [{status: 'added', index: 5, value: 'K'}]);
});

test('filter -> map', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.filter(evenDistanceFromA).map(charCode);

    t.deepEqual(b(), [73, 71, 69, 67, 65]);

    var latestChanges;
    b.subscribe(function (changes) {latestChanges = changes}, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), [75, 73, 71, 69, 67, 65]);
    t.deepEqual(latestChanges, [{status: 'added', index: 0, value: 75}]);
});

test('map -> filter', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.map(charCode).filter(evenDistanceFrom65);

    t.deepEqual(b(), [73, 71, 69, 67, 65]);

    var latestChanges;
    b.subscribe(function (changes) {latestChanges = changes}, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), [75, 73, 71, 69, 67, 65]);
    t.deepEqual(latestChanges, [{status: 'added', index: 0, value: 75}]);
});

test('map -> sortBy', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.map(charCode).sortBy();

    t.deepEqual(b(), [65, 66, 67, 68, 69, 70, 71, 72, 73]);

    var latestChanges = [];
    b.subscribe(function (changes) {
        latestChanges.push.apply(latestChanges, changes);
    }, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
    t.deepEqual(latestChanges, [
        {status: 'added', index: 9, value: 74},
        {status: 'added', index: 10, value: 75},
        {status: 'added', index: 11, value: 76}
    ]);
});

test('sortBy -> map', function (t) {
    t.plan(3);

    var a = ko.observableArray(randomLetters.slice(0));
    var b = a.map(charCode).sortBy();

    t.deepEqual(b(), [65, 66, 67, 68, 69, 70, 71, 72, 73]);

    var latestChanges = [];
    b.subscribe(function (changes) {
        latestChanges.push.apply(latestChanges, changes);
    }, null, 'arrayChange');

    a.splice(0, 0, 'J', 'K', 'L');
    t.deepEqual(b(), [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
    t.deepEqual(latestChanges, [
        {status: 'added', index: 9, value: 74},
        {status: 'added', index: 10, value: 75},
        {status: 'added', index: 11, value: 76}
    ]);
});

test('filter -> all', function (t) {
    t.plan(2);

    var a = ko.observableArray([68, 69, 70]);
    var b = a.filter(greaterThan69).all(common.isEven);

    t.equal(b(), true);

    a.push(71);
    t.equal(b(), false);
});

test('filter -> any', function (t) {
    t.plan(2);

    var a = ko.observableArray([68, 69, 70]);
    var b = a.filter(greaterThan69).any(common.isEven);

    t.equal(b(), true);

    a.remove(70);
    t.equal(b(), false);
});

test('map -> all', function (t) {
    t.plan(2);

    var a = ko.observableArray([68, 69, 70]);
    var b = a.map(function (x) {return x + 1}).all(greaterThan69);

    t.equal(b(), false);

    a.remove(68);
    t.equal(b(), true);
});

test('map -> any', function (t) {
    t.plan(2);

    var a = ko.observableArray([68, 69, 70]);
    var b = a.map(function (x) {return x - 1}).any(greaterThan69);

    t.equal(b(), false);

    a.push(71);
    t.equal(b(), true);
});

test('map -> map', function (t) {
    t.plan(5);

    var a = ko.observableArray([1, 2, 3, 4, 5]);
    var b = a.map(function (x) {return x + 1}).map(function (x) {return x * 2});

    t.deepEqual(b(), [4, 6, 8, 10, 12]);

    a.unshift(0);
    t.deepEqual(b(), [2, 4, 6, 8, 10, 12]);

    a.push(6);
    t.deepEqual(b(), [2, 4, 6, 8, 10, 12, 14]);

    a.removeAll([1, 2, 3, 4, 5]);
    t.deepEqual(b(), [2, 14]);

    a.splice(1, 1, 1, 2);
    t.deepEqual(b(), [2, 4, 6]);
});

test('map -> groupBy', function (t) {
    t.plan(1);

    var a = ko.observableArray([1, 2, 3, 4, 5]);
    var b = a.map(function (x) {return x + 1}).groupBy(common.isEven);

    t.deepEqual(ko.toJS(b()), [
        {key: 'true', values: [2, 4, 6]},
        {key: 'false', values: [3, 5]}
    ]);
});

test('sortBy -> all', function (t) {
    t.plan(2);

    var a = ko.observableArray([70, 69, 68]);
    var b = a.sortBy();

    var c = b.all(function (x, i) {
        var prev = b()[i() - 1];
        return prev === undefined || (x - prev) === 1;
    });

    t.equal(c(), true);

    a.remove(69);
    t.equal(c(), false);
});

test('sortBy -> any', function (t) {
    t.plan(2);

    var a = ko.observableArray([70, 69, 68]);
    var b = a.sortBy();

    var c = b.any(function (x, i) {
        var prev = b()[i() - 1];
        return prev !== undefined && (x - prev) === 1;
    });

    t.equal(c(), true);

    a([70, 68, 66]);
    t.equal(c(), false);
});

test('sortBy -> sortBy', function (t) {
    t.plan(8);

    var original = [
        {a: ko.observable(1), b: ko.observable(4)},
        {a: ko.observable(1), b: ko.observable(3)},
        {a: ko.observable(2), b: ko.observable(2)},
        {a: ko.observable(2), b: ko.observable(1)}
    ];

    var a = ko.observableArray(original);
    var b = a.sortBy('b').sortBy('a');

    var sorted = b();
    t.equal(sorted[0], original[1]);
    t.equal(sorted[1], original[0]);
    t.equal(sorted[2], original[3]);
    t.equal(sorted[3], original[2]);

    original[3].b(3);
    t.equal(sorted[0], original[1]);
    t.equal(sorted[1], original[0]);
    t.equal(sorted[2], original[2]);
    t.equal(sorted[3], original[3]);
});

test('sortBy -> groupBy', function (t) {
    t.plan(1);

    var original = [
        {a: ko.observable(1), b: ko.observable(4)},
        {a: ko.observable(1), b: ko.observable(3)},
        {a: ko.observable(2), b: ko.observable(2)},
        {a: ko.observable(2), b: ko.observable(1)}
    ];

    var a = ko.observableArray(original);
    var b = a.sortBy('b').groupBy('a');

    t.deepEqual(ko.toJS(b()), [
        {key: '2', values: [{a: 2, b: 1}, {a: 2, b: 2}]},
        {key: '1', values: [{a: 1, b: 3}, {a: 1, b: 4}]}
    ]);
});
