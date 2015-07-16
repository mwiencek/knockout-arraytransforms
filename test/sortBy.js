var test = require('tape');
var ko = require('knockout');
var common = require('./common.js');

require('../');

test('sorts an array’s initial contents', function (t) {
    t.plan(1);

    var a = ko.observableArray(common.randomInts.slice(0));
    var b = a.sortBy();

    t.deepEqual(b(), common.orderedInts);
});

test('sorts values added via push', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.sortBy();

    a.push.apply(a, common.randomInts);
    t.deepEqual(b(), common.orderedInts);
});

test('sorts values added via unshift', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.sortBy();

    a.unshift.apply(a, common.randomInts);
    t.deepEqual(b(), common.orderedInts);
});

test('sorts values spliced to the beginning', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.sortBy();

    for (var i = 0, len = common.randomInts.length; i < len; i++) {
        a.splice(0, 0, common.randomInts[i]);
    }

    t.deepEqual(b(), common.orderedInts);
});

test('sorts values spliced to the end', function (t) {
    t.plan(1);

    var a = ko.observableArray([]);
    var b = a.sortBy();

    for (var i = 0, len = common.randomInts.length; i < len; i++) {
        a.splice(i, 0, common.randomInts[i]);
    }

    t.deepEqual(b(), common.orderedInts);
});

test('removes values removed from the original array', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.randomInts.slice(0));
    var b = a.sortBy();

    a.remove(2);
    a.remove(4);
    a.remove(6);
    a.remove(8);
    t.deepEqual(b(), [1, 3, 5, 7, 9]);

    a.splice(0, 5);
    t.deepEqual(b(), []);
});

test('re-sorts values when they change', function (t) {
    t.plan(3);

    var objects = [
        {name: ko.observable('')},
        {name: ko.observable('')},
        {name: ko.observable('')},
        {name: ko.observable('')}
    ];

    var a = ko.observableArray(objects.slice(0));
    var b = a.sortBy('name');

    objects[0].name('2');
    t.deepEqual(b(), [objects[1], objects[2], objects[3], objects[0]]);

    objects[1].name('1');
    t.deepEqual(b(), [objects[2], objects[3], objects[1], objects[0]]);

    objects[0].name('0');
    t.deepEqual(b(), [objects[2], objects[3], objects[0], objects[1]]);
});

test('only runs the sort function when it changes', function (t) {
    t.plan(6);

    var objects = [
        {name: ko.observable('foo')},
        {name: ko.observable('bar')}
    ];

    var spy0 = common.spy(objects[0], 'name');
    var spy1 = common.spy(objects[1], 'name');

    var a = ko.observableArray(objects.slice(0));
    var b = a.sortBy(function (object) {return object.name()});

    t.equal(spy0.calls, 1);
    t.equal(spy1.calls, 1);

    objects[0].name('1');
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 1);

    objects[1].name('2');
    t.equal(spy0.calls, 3);
    t.equal(spy1.calls, 3);
});

test('passes the value’s index as the second argument to the callback', function (t) {
    t.plan(9);

    var a = ko.observableArray(common.randomInts.slice(0));
    var expectedIndex = 0;

    a.sortBy(function (x, i) {
        t.equal(i.peek(), expectedIndex++);
    });
});

test('re-sorts values that depend on the index observable', function (t) {
    t.plan(2);

    var a = ko.observableArray(common.orderedInts.slice(0));

    var b = a.sortBy(function (n, index) {
        return a().length - index();
    });

    t.deepEqual(b(), [9, 8, 7, 6, 5, 4, 3, 2, 1]);

    a.reverse();
    t.deepEqual(b(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('is stable', function (t) {
    t.plan(21);

    var original = [
        {a: 3},
        {a: 3},
        {a: 3},
        {a: 2},
        {a: 2},
        {a: 2},
        {a: 1},
        {a: 1},
        {a: 1}
    ];

    var a = ko.observableArray(original.slice(0));
    var b = a.sortBy('a');

    var sorted = b();
    var order = [6, 7, 8, 3, 4, 5, 0, 1, 2];

    for (var i = 0; i < 9; i++) {
        t.equal(sorted[i], original[order[i]]);
    }

    // Remove middle dupes
    a.splice(1, 1);
    a.splice(3, 1);
    a.splice(5, 1);

    order = [6, 8, 3, 5, 0, 2];

    for (var i = 0; i < 6; i++) {
        t.equal(sorted[i], original[order[i]]);
    }

    // Reverse leftover dupes
    a.splice(0, 2, original[2], original[0]);
    a.splice(2, 2, original[5], original[3]);
    a.splice(4, 2, original[8], original[6]);
    order = [8, 6, 5, 3, 2, 0];

    for (var i = 0; i < 6; i++) {
        t.equal(sorted[i], original[order[i]]);
    }
});

test('remains stably sorted after value mutations', function (t) {
    t.plan(1);

    var sortByFoo = ko.observable(true);

    var original = [
        {name: 'A', foo: 4, bar: 3},
        {name: 'B', foo: 3, bar: 5},
        {name: 'C', foo: 5, bar: 4},
        {name: 'D', foo: 2, bar: 2}
    ];

    var sorted = ko.observableArray(original.slice(0))
        .sortBy('name')
        .sortBy('bar')
        .sortBy(function (h) {
            if (sortByFoo()) {
                return h.foo;
            }
            return 0;
        });

    // DBAC -> DACB
    sortByFoo(false);

    t.deepEqual(sorted(), [
        original[3],
        original[0],
        original[2],
        original[1]
    ]);
});

test('can chain array moves', function (t) {
    t.plan(1);

    var original = [
        {order: ko.observable(1)},
        {order: ko.observable(2)},
        {order: ko.observable(3)}
    ];

    var sorted = ko.observableArray(original.slice(0))
        .sortBy('order')
        .sortBy(function () {return 0});

    original[2].order(0);
    t.deepEqual(sorted(), [original[2], original[0], original[1]]);
});

test('handles moves with duplicate keys properly', function (t) {
    t.plan(1);

    var original = [
        {id: 0, name: 'Nick D’Virgilio', linkPhrase: 'drums'},
        {id: 1, name: 'Dave Gregory', linkPhrase: 'electric guitar and marimba'},
        {id: 2, name: 'Rachel Hall', linkPhrase: 'electric violin and violin'},
        {id: 3, name: 'David Longdon', linkPhrase: 'other percussion [glassware]'},
        {id: 4, name: 'David Longdon', linkPhrase: 'flute, other percussion [cutlery] and percussion'},
        {id: 5, name: 'Danny Manners', linkPhrase: 'organ, piano and synthesizer'},
        {id: 6, name: 'Andy Poole', linkPhrase: 'acoustic guitar'},
        {id: 7, name: 'Greg Spawton', linkPhrase: '12 string guitar, acoustic guitar, electric bass guitar and electric guitar'},
        {id: 8, name: 'Worked Out', linkPhrase: 'recording of'},
        {id: 9, name: 'Simon Godfrey', linkPhrase: 'background vocals'},
        {id: 10, name: 'David Longdon', linkPhrase: 'background vocals and lead vocals'},
        {id: 11, name: 'Andy Poole', linkPhrase: 'background vocals'},
        {id: 12, name: 'Greg Spawton', linkPhrase: 'background vocals'}
    ];
    var a = ko.observableArray(original.slice(0));
    var b = a.sortBy('name');

    // Sorted by linkPhrase
    a([
        original[7],
        original[6],
        original[9],
        original[11],
        original[12],
        original[10],
        original[0],
        original[1],
        original[2],
        original[4],
        original[5],
        original[3],
        original[8]
    ]);

    t.deepEqual(b(), [
        {id: 6, name: 'Andy Poole', linkPhrase: 'acoustic guitar'},
        {id: 11, name: 'Andy Poole', linkPhrase: 'background vocals'},
        {id: 5, name: 'Danny Manners', linkPhrase: 'organ, piano and synthesizer'},
        {id: 1, name: 'Dave Gregory', linkPhrase: 'electric guitar and marimba'},
        {id: 10, name: 'David Longdon', linkPhrase: 'background vocals and lead vocals'},
        {id: 4, name: 'David Longdon', linkPhrase: 'flute, other percussion [cutlery] and percussion'},
        {id: 3, name: 'David Longdon', linkPhrase: 'other percussion [glassware]'},
        {id: 7, name: 'Greg Spawton', linkPhrase: '12 string guitar, acoustic guitar, electric bass guitar and electric guitar'},
        {id: 12, name: 'Greg Spawton', linkPhrase: 'background vocals'},
        {id: 0, name: 'Nick D’Virgilio', linkPhrase: 'drums'},
        {id: 2, name: 'Rachel Hall', linkPhrase: 'electric violin and violin'},
        {id: 9, name: 'Simon Godfrey', linkPhrase: 'background vocals'},
        {id: 8, name: 'Worked Out', linkPhrase: 'recording of'}
    ]);
});
