# knockout-arrayTransforms

Allows for creating efficient transformations of observable arrays.

```JavaScript
var integers = ko.observableArray([
    ko.observable(10), ko.observable(9),
    ko.observable(8),  ko.observable(7),
    ko.observable(6),  ko.observable(5),
    ko.observable(4),  ko.observable(3),
    ko.observable(2),  ko.observable(1)
]);

var evenIntegersOver5 =
    integers.sortBy(function (n) {
        return n();
    }).filter(function (n) {
        n = n();
        return n > 5 && n % 2 === 0;
    });

// ko.toJS(evenIntegersOver5) -> [6, 8, 10];

// The sortBy and filter callbacks are only called for these new items, not
// every item in the array.
integers.splice(0, 0, ko.observable(12), ko.observable(11));

// ko.toJS(evenIntegersOver5) -> [6, 8, 10, 12];

// Set the observable containing 1 in the original array to 14. Again, the
// sortBy and filter callbacks are only called once on index 11. sortBy has
// all of the previous sort keys cached and performs a fast binary sort.
integers()[11](14);

// ko.toJS(evenIntegersOver5) -> [6, 8, 10, 12, 14];
```

## Transformations

all, any, filter, map, sortBy.

## Create your own

For examples, see ```ko.arrayTransforms.makeTransform``` in the source code.

Note: While I don’t plan on making tons of breaking changes to ```makeTransform```, the API is still in early stages and may be tweaked in later versions (as of 0.1.0).

## License

MIT (X11). See LICENSE.
