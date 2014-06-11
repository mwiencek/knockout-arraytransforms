describe("sortBy", function () {
    var randomInts = [1, 9, 2, 8, 3, 7, 4, 6, 5],
        orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    it("sorts an array’s initial contents", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy();

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via push", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        a.push.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values added via unshift", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        a.unshift.apply(a, randomInts);
        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the beginning", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(0, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("sorts values spliced to the end", function () {
        var a = ko.observableArray([]),
            b = a.sortBy();

        for (var i = 0, len = randomInts.length; i < len; i++) {
            a.splice(i, 0, randomInts[i]);
        }

        expect(b()).toEqual(orderedInts);
    });

    it("removes values removed from the original array", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            b = a.sortBy();

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
            b = a.sortBy("name");

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

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(randomInts.slice(0)),
            expectedIndex = 0;

        a.sortBy(function (x, i) {
            expect(i).toBe(expectedIndex++);
        });
    });

    it("is stable", function () {
        var original = [
            { a: 3 },
            { a: 3 },
            { a: 3 },
            { a: 2 },
            { a: 2 },
            { a: 2 },
            { a: 1 },
            { a: 1 },
            { a: 1 }
        ];

        var a = ko.observableArray(original.slice(0)),
            b = a.sortBy("a"),
            sorted = b(),
            order = [6, 7, 8, 3, 4, 5, 0, 1, 2];

        for (var i = 0; i < 9; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }

        // Remove middle dupes
        a.splice(1, 1);
        a.splice(3, 1);
        a.splice(5, 1);
        order = [6, 8, 3, 5, 0, 2];

        for (var i = 0; i < 6; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }

        // Reverse leftover dupes
        a.splice(0, 2, original[2], original[0]);
        a.splice(2, 2, original[5], original[3]);
        a.splice(4, 2, original[8], original[6]);
        order = [8, 6, 5, 3, 2, 0];

        for (var i = 0; i < 6; i++) {
            expect(sorted[i]).toBe(original[order[i]]);
        }
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

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.filter(function (x, i) {
            expect(i).toBe(expectedIndex++);
        });
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

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.map(function (x, i) {
            expect(i).toBe(expectedIndex++);
        });
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

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.any(function (x, i) {
            expect(i).toBe(expectedIndex++);
        });
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

    it("passes the value’s index as the second argument to the callback", function () {
        var a = ko.observableArray(orderedInts.slice(0)),
            expectedIndex = 0;

        a.all(function (x, i) {
            expect(i).toBe(expectedIndex++);
        });
    });
});


describe("chaining", function () {
    var charCode = function (x) { return x.charCodeAt(0) },
        evenDistanceFrom65 = function (x) { return (x - 65) % 2 === 0 },
        evenDistanceFromA = function (x) { return evenDistanceFrom65(charCode(x)) },
        greaterThan69 = function (x) { return x > 69 },
        randomLetters = ["H", "I", "F", "G", "D", "E", "B", "C", "A"];

    it("works between filter -> sortBy", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.filter(evenDistanceFromA).sortBy();

        expect(b()).toEqual(["A", "C", "E", "G", "I"]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual(["A", "C", "E", "G", "I", "K"]);
        expect(latestChanges).toEqual([{ status: "added", index: 5, value: "K" }]);
    });

    it("works between sortBy -> filter", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.sortBy().filter(evenDistanceFromA);

        expect(b()).toEqual(["A", "C", "E", "G", "I"]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual(["A", "C", "E", "G", "I", "K"]);
        expect(latestChanges).toEqual([{ status: "added", index: 5, value: "K" }]);
    });

    it("works between filter -> map", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.filter(evenDistanceFromA).map(charCode);

        expect(b()).toEqual([73, 71, 69, 67, 65]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([75, 73, 71, 69, 67, 65]);
        expect(latestChanges).toEqual([{ status: "added", index: 0, value: 75 }]);
    });

    it("works between map -> filter", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).filter(evenDistanceFrom65);

        expect(b()).toEqual([73, 71, 69, 67, 65]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([75, 73, 71, 69, 67, 65]);
        expect(latestChanges).toEqual([{ status: "added", index: 0, value: 75 }]);
    });

    it("works between map -> sortBy", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).sortBy();

        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
        expect(latestChanges).toEqual([
            { status: "added", index: 9, value: 74 },
            { status: "added", index: 10, value: 75 },
            { status: "added", index: 11, value: 76 }
        ]);
    });

    it("works between sortBy -> map", function () {
        var a = ko.observableArray(randomLetters.slice(0)),
            b = a.map(charCode).sortBy();

        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73]);

        var latestChanges;
        b.subscribe(function (changes) { latestChanges = changes }, null, "arrayChange");

        a.splice(0, 0, "J", "K", "L");
        expect(b()).toEqual([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]);
        expect(latestChanges).toEqual([
            { status: "added", index: 9, value: 74 },
            { status: "added", index: 10, value: 75 },
            { status: "added", index: 11, value: 76 }
        ]);
    });

    it("works between filter -> all", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.filter(greaterThan69).all(function (x) { return x % 2 === 0 });

        expect(b()).toBe(true);

        a.push(71);
        expect(b()).toBe(false);
    });

    it("works between filter -> any", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.filter(greaterThan69).any(function (x) { return x % 2 === 0 });

        expect(b()).toBe(true);

        a.remove(70);
        expect(b()).toBe(false);
    });

    it("works between map -> all", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.map(function (x) { return x + 1 }).all(greaterThan69);

        expect(b()).toBe(false);

        a.remove(68);
        expect(b()).toBe(true);
    });

    it("works between map -> any", function () {
        var a = ko.observableArray([68, 69, 70]),
            b = a.map(function (x) { return x - 1 }).any(greaterThan69);

        expect(b()).toBe(false);

        a.push(71);
        expect(b()).toBe(true);
    });

    it("works between sortBy -> all", function () {
        var a = ko.observableArray([70, 69, 68]),
            b = a.sortBy(),
            c = b.all(function (x, i) {
                var prev = b()[i - 1];
                return prev === undefined || (x - prev) === 1;
            });

        expect(c()).toBe(true);

        a.remove(69);
        expect(c()).toBe(false);
    });

    it("works between sortBy -> any", function () {
        var a = ko.observableArray([70, 69, 68]),
            b = a.sortBy(),
            c = b.any(function (x, i) {
                var prev = b()[i - 1];
                return prev !== undefined && (x - prev) === 1;
            });

        expect(c()).toBe(true);

        a(70, 68, 66);
        expect(c()).toBe(false);
    });

    it("works between sortBy -> sortBy", function () {
        var original = [
                { a: 1, b: 4 },
                { a: 1, b: 3 },
                { a: 2, b: 2 },
                { a: 2, b: 1 }
            ],
            a = ko.observableArray(original),
            b = a.sortBy("b").sortBy("a");

        var sorted = b();
        expect(sorted[0]).toBe(original[1]);
        expect(sorted[1]).toBe(original[0]);
        expect(sorted[2]).toBe(original[3]);
        expect(sorted[3]).toBe(original[2]);
    });
});
