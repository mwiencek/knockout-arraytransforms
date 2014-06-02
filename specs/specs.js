describe("sortBy", function () {
    var identity = function (x) { return x },
        randomInts = [1, 9, 2, 8, 3, 7, 4, 6, 5],
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    it("sorts an array’s initial contents", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy(identity);

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via push", function () {
        var a = ko.observableArray([]),
            b = a.sortBy(identity);

        a.push.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.sortBy(identity);

        a.unshift.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.sortBy(identity);

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(0, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.sortBy(identity);

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(i, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy(identity);

        a.remove(2);
        a.remove(4);
        a.remove(6);
        a.remove(8);
        expect(b()).toEqual([1, 3, 5, 7, 9]);

        a.splice(0, 5);
        expect(b()).toEqual([]);
    });

    it("re-sorts values when they change", function () {
        var objects = [
            { name: ko.observable("foo") },
            { name: ko.observable("baz") },
            { name: ko.observable("bar") }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.sortBy(function (object) { return object.name() });

        expect(b()).toEqual([objects[2], objects[1], objects[0]]);

        objects[0].name("1");
        expect(b()).toEqual([objects[0], objects[2], objects[1]]);

        objects[1].name("2");
        expect(b()).toEqual([objects[0], objects[1], objects[2]]);

        objects[2].name("0");
        expect(b()).toEqual([objects[2], objects[0], objects[1]]);
    });

    it("only runs the sort function when it changes", function () {
        var objects = [
            { name: ko.observable("foo") },
            { name: ko.observable("bar") }
        ];

        var spy0 = spyOn(objects[0], "name"),
            spy1 = spyOn(objects[1], "name"),
            a = ko.observableArray(objects.slice(0)),
            b = a.sortBy(function (object) { return object.name() });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].name("1");
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].name("2");
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });
});


describe("filter", function () {
    var isEven = function (x) { return x % 2 === 0 },
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    it("filters an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.filter(isEven);

        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values added via push", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        a.push.apply(a, orderedInts);
        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        a.unshift.apply(a, orderedInts);
        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("filters values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()).toEqual([8, 6, 4, 2]);
    });

    it("filters values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.filter(isEven);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()).toEqual([2, 4, 6, 8]);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.filter(isEven);

        a.splice(0, 5);
        expect(b()).toEqual([6, 8]);

        a.splice(0, 4);
        expect(b()).toEqual([]);
    });

    it("re-filters values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(3) },
            { num: ko.observable(5) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.filter(function (object) { return object.num() % 2 === 0 });

        expect(b()).toEqual([]);

        objects[0].num(2);
        expect(b()).toEqual([objects[0]]);

        objects[1].num(4);
        expect(b()).toEqual([objects[0], objects[1]]);

        objects[2].num(6);
        expect(b()).toEqual([objects[0], objects[1], objects[2]]);
    });

    it("only runs the filter function when it changes", function () {
        var objects = [
            { num: ko.observable(0) },
            { num: ko.observable(1) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.filter(function (object) { return object.num() % 2 === 0 });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(2);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });
});


describe("map", function () {
    var square = function (x) { return x * x },
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9],
        squaredInts = [1, 4, 9, 16, 25, 36, 49, 64, 81];

    it("maps an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.map(square);

        expect(b()).toEqual(squaredInts);
    });

    it("maps values added via push", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        a.push.apply(a, orderedInts);
        expect(b()).toEqual(squaredInts);
    });

    it("maps values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        a.unshift.apply(a, orderedInts);
        expect(b()).toEqual(squaredInts);
    });

    it("maps values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(0, 0, orderedInts[i]);
        }

        expect(b()).toEqual(squaredInts.slice(0).reverse());
    });

    it("maps values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.map(square);

        for (var i = 0, len = orderedInts.length; i < len; i++) {
            a.splice(i, 0, orderedInts[i]);
        }

        expect(b()).toEqual(squaredInts);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.map(square);

        a.splice(0, 5);
        expect(b()).toEqual([36, 49, 64, 81]);

        a.splice(0, 4);
        expect(b()).toEqual([]);
    });

    it("re-maps values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) {
                    var n = object.num();
                    return n * n;
                });

        expect(b()).toEqual([1, 4, 9]);

        objects[0].num(4);
        expect(b()).toEqual([16, 4, 9]);

        objects[1].num(5);
        expect(b()).toEqual([16, 25, 9]);

        objects[2].num(6);
        expect(b()).toEqual([16, 25, 36]);
    });

    it("only runs the map function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) {
                    var n = object.num();
                    return n * n;
                });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });

    it("will move existing mapped values when the original values move", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var NumberHolder = function (num) {
            this.num = num;
        };

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.map(function (object) { return new NumberHolder(object.num()) }),
            underlyingb = b.peek(),
            nh0 = underlyingb[0],
            nh1 = underlyingb[1];

        a.reverse();
        expect(underlyingb[0]).toBe(nh1);
        expect(underlyingb[1]).toBe(nh0);
    });
});


describe("any", function () {
    var isEven = function (x) { return x % 2 === 0 },
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    it("tests an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.any(isEven);

        expect(b()).toBe(true);
    });

    it("is false when empty", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        expect(b()).toBe(false);
    });

    it("tests values added via push", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.push(1)
        expect(b()).toEqual(false);
        a.push(2);
        expect(b()).toEqual(true);
    });

    it("tests values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.unshift(1)
        expect(b()).toEqual(false);
        a.unshift(2);
        expect(b()).toEqual(true);
    });

    it("tests values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
    });

    it("tests values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.any(isEven);

        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
        a.splice(1, 0, 2);
        expect(b()).toEqual(true);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.any(isEven);

        expect(b()).toBe(true);

        a.splice(1, 1); // -> [1, 3, 4, 5, 6, 7, 8, 9]
        a.splice(2, 1); // -> [1, 3, 5, 6, 7, 8, 9]
        a.splice(3, 1); // -> [1, 3, 5, 7, 8, 9]
        a.splice(4, 1); // -> [1, 3, 5, 7, 9]

        expect(b()).toBe(false);
    });

    it("re-tests values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.any(function (object) { return isEven(object.num()) });

        expect(b()).toBe(true);

        objects[1].num(5);
        expect(b()).toBe(false);
    });

    it("only runs the test function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.any(function (object) { return isEven(object.num()) });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });
});


describe("all", function () {
    var isEven = function (x) { return x % 2 === 0 },
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    it("tests an array’s initial contents", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.all(isEven);

        expect(b()).toBe(false);
    });

    it("is true when empty", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        expect(b()).toBe(true);
    });

    it("tests values added via push", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.push(2);
        expect(b()).toEqual(true);
        a.push(1)
        expect(b()).toEqual(false);
    });

    it("tests values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.unshift(2);
        expect(b()).toEqual(true);
        a.unshift(1)
        expect(b()).toEqual(false);
    });

    it("tests values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
        a.splice(0, 0, 1)
        expect(b()).toEqual(false);
    });

    it("tests values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.all(isEven);

        a.splice(0, 0, 2);
        expect(b()).toEqual(true);
        a.splice(1, 0, 1)
        expect(b()).toEqual(false);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            b = a.all(isEven);

        expect(b()).toBe(false);

        a.splice(0, 1); // -> [2, 3, 4, 5, 6, 7, 8, 9]
        a.splice(1, 1); // -> [2, 4, 5, 6, 7, 8, 9]
        a.splice(2, 1); // -> [2, 4, 6, 7, 8, 9]
        a.splice(3, 1); // -> [2, 4, 6, 8, 9]
        a.splice(4, 1); // -> [2, 4, 6, 8]

        expect(b()).toBe(true);
    });

    it("re-tests values when they change", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) },
            { num: ko.observable(3) }
        ];

        var a = ko.observableArray(objects.slice(0)),
            b = a.all(function (object) { return isEven(object.num()) });

        expect(b()).toBe(false);

        objects[0].num(4);
        objects[2].num(6);
        expect(b()).toBe(true);
    });

    it("only runs the test function when it changes", function () {
        var objects = [
            { num: ko.observable(1) },
            { num: ko.observable(2) }
        ];

        var spy0 = spyOn(objects[0], "num"),
            spy1 = spyOn(objects[1], "num"),
            a = ko.observableArray(objects.slice(0)),
            b = a.all(function (object) { return isEven(object.num()) });

        expect(spy0.calls.count()).toBe(1);
        expect(spy1.calls.count()).toBe(1);

        objects[0].num(3);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(1);

        objects[1].num(4);
        expect(spy0.calls.count()).toBe(2);
        expect(spy1.calls.count()).toBe(2);
    });
});
