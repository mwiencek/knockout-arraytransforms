# knockout-arrayTransforms

Allows for creating efficient transformations of observable arrays.

```JavaScript
var integers = ko.observableArray([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

var evenIntegersOver5 =
    integers.sortBy(function (n) {
        return n;
    }).filter(function (n) {
        return n > 5 && n % 2 === 0;
    });

// evenIntegersOver5() -> [6, 8, 10];

// The sortBy and filter callbacks are only called for 12 and 11, not for every item in the arrays.
integers.splice(0, 0, 12, 11);

// evenIntegersOver5() -> [6, 8, 10, 12];
```

## Transformations

all, any, filter, map, sortBy.

## Create your own

For examples, see ```arrayTransforms.makeTransform``` in the source code.

Note: While I don’t plan on making tons of breaking changes to ```makeTransform```, the API is still in early stages and may be tweaked in later versions (as of 0.1.0).

## license

MIT (X11). See LICENSE.
