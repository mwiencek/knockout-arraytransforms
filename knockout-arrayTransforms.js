// knockout-arrayTransforms 0.4.0 (https://github.com/mwiencek/knockout-arrayTransforms)
// Released under the MIT (X11) License; see the LICENSE file in the official code repository.

(function (factory) {
    if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        factory(module.exports = require("knockout"));
    } else if (typeof define === "function" && define.amd) {
        define(["knockout"], factory);
    } else {
        factory(window.ko);
    }
})(function (ko) {

    var transformClasses = emptyObject(),
        arrayChangeEvent = "arrayChange";

    function applyChanges(changes) {
        var mappedItems = this.mappedItems,
            moves = emptyObject(),
            offset = 0;

        for (var i = 0, change; change = changes[i]; i++) {
            var status = change.status;

            if (status === "retained") {
                continue;
            }

            var index = change.index,
                moved = change.moved,
                value = change.value,
                item = change.mappedItem;

            if (moved !== undefined) {
                // For added statuses, index is a position in the new
                // array and moved is a position in the old array. For
                // deleted statuses, it's the opposite.
                if (status === "added") {
                    var to = index, from = moved + offset;

                } else if (status === "deleted") {
                    var to = moved, from = index + offset;
                }

                if (moves[to] === undefined) {
                    moves[to] = true;

                    if (to !== from) {
                        item = mappedItems[from];
                        mappedItems.splice(from, 1)
                        mappedItems.splice(to, 0, item);
                        this.valueMoved(value, to, from, item.mappedValue, item);
                        item.index(to);

                        if (to > from) {
                            updateIndexes(mappedItems, from, to - 1, -1);
                        } else {
                            updateIndexes(mappedItems, to + 1, from, 1);
                        }
                    }
                }
            }

            if (status === "added") {
                if (moved === undefined) {
                    item = emptyObject();
                    item.index = ko.observable(index);
                    item.value = value;
                    mapValue(this, item);
                    mappedItems.splice(index, 0, item);
                    this.valueAdded(value, index, item.mappedValue, item);
                    updateIndexes(mappedItems, index + 1, mappedItems.length - 1, 1);
                }
                offset++;

            } else if (status === "deleted") {
                if (moved === undefined) {
                    item = mappedItems.splice(index + offset, 1)[0];
                    if (item.computed) {
                        item.computed.dispose();
                    }
                    this.valueDeleted(value, index + offset, item.mappedValue, item);
                    updateIndexes(mappedItems, index + offset, mappedItems.length - 1, -1);
                }
                offset--;
            }
        }
    };

    function updateIndexes(items, start, end, offset) {
        while (start <= end) {
            var item = items[start++];
            item.index(item.index.peek() + offset);
        }
    }

    function spliceIn(state, index, value) {
        var transform = state.transform, array = state.transformedArray;
        array.splice(index, 0, value);
        transform.notifySubscribers(array);
        transform.notifySubscribers([{ status: "added", index: index, value: value }], arrayChangeEvent);
    }

    function spliceOut(state, index, value) {
        var transform = state.transform, array = state.transformedArray;
        array.splice(index, 1);
        transform.notifySubscribers(array);
        transform.notifySubscribers([{ status: "deleted", index: index, value: value }], arrayChangeEvent);
    }

    function spliceToFrom(state, to, from, addedValue) {
        var array = state.transformedArray,
            deletedValue = array[from];

        if (addedValue === deletedValue && to === from) {
            return;
        }

        var transform = state.transform;
        array.splice(from, 1);
        array.splice(to, 0, addedValue);
        transform.notifySubscribers(array);

        var deletion = { status: "deleted", index: from, value: deletedValue },
            addition = { status: "added", index: to, value: addedValue };

        if (addedValue === deletedValue) {
            deletion.moved = to;
            addition.moved = from;
        }

        transform.notifySubscribers([deletion, addition], arrayChangeEvent);
    }

    function emptyObject() {
        return Object.create ? Object.create(null) : {};
    }

    function noop() {}

    function exactlyEqual(a, b) { return a === b }

    function mapValue(state, item) {
        var callback = state.callback;

        if (callback === undefined) {
            item.mappedValue = item.value;
            return;
        }

        var owner = state, method = "callback";

        if (typeof callback !== "function") {
            owner = item.value;
            method = callback;
            callback = owner[method];

            if (typeof callback !== "function") {
                item.mappedValue = callback;
                return;

            } else if (ko.isObservable(callback)) {
                watchItem(state, item, callback);
                return;
            }
        }

        var computedValue = ko.computed(function () {
            return owner[method](item.value, item.index);
        });

        if (computedValue.isActive()) {
            computedValue.equalityComparer = exactlyEqual;
            watchItem(state, item, computedValue);
            item.computed = computedValue;
            return computedValue;
        } else {
            item.mappedValue = computedValue.peek();
        }
    }

    function watchItem(self, item, observable) {
        item.mappedValue = observable.peek();

        observable.subscribe(function (newValue) {
            self.valueMutated(item.value, newValue, item.mappedValue, item);

            // Must be updated after valueMutated because sortBy/filter/etc.
            // expect/need the old mapped value
            item.mappedValue = newValue;
        });
    }

    function makeTransform(proto) {
        function TransformState(original, callback, options) {
            this.original = original;
            this.mappedItems = [];
            this.callback = callback;

            var transform = this.transform = this.init(options);
            if (ko.isObservable(transform) && transform.cacheDiffForKnownOperation) {
                // Disallow knockout to call trackChanges() on this array
                // Writing to it normally isn't support anyway
                transform.subscribe = ko.observableArray.fn.subscribe;

                this.transformedArray = transform.peek();
            }
        }

        TransformState.prototype.applyChanges = applyChanges;
        ko.utils.extend(TransformState.prototype, proto);
        transformClasses[proto.name] = TransformState;

        ko.observableArray.fn[proto.name] = function (callback, options) {
            var state = new TransformState(this, callback, options),
                originalArray = this.peek(),
                initialChanges = [];

            this.subscribe(function (changes) { state.applyChanges(changes) }, null, arrayChangeEvent);

            for (var i = 0, len = originalArray.length; i < len; i++) {
                initialChanges.push({ status: "added", value: originalArray[i], index: i });
            }

            state.applyChanges(initialChanges);
            return state.transform;
        };
    };

    makeTransform({
        name: "sortBy",
        init: function () {
            this.keyCounts = emptyObject();
            this.sortedItems = [];
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, sortKey, item) {
            var mappedIndex = this.sortedIndexOf(sortKey, value, item),
                sortedItems = this.sortedItems,
                keyCounts = this.keyCounts;

            item.mappedIndex = mappedIndex;
            sortedItems.splice(mappedIndex, 0, item);
            keyCounts[sortKey] = (keyCounts[sortKey] || 0) + 1;

            for (var i = mappedIndex + 1, len = sortedItems.length; i < len; i++) {
                sortedItems[i].mappedIndex++;
            }

            spliceIn(this, mappedIndex, value);
        },
        valueDeleted: function (value, index, sortKey, item) {
            var mappedIndex = item.mappedIndex,
                sortedItems = this.sortedItems;

            sortedItems.splice(mappedIndex, 1);
            this.keyCounts[sortKey]--;

            for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
                sortedItems[i].mappedIndex--;
            }

            spliceOut(this, mappedIndex, value);
        },
        valueMoved: function (value, to, from, sortKey, item) {
            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(sortKey, value, item);

            if (oldIndex !== newIndex) {
                this.moveValue(value, sortKey, oldIndex, newIndex, item);
            }
        },
        valueMutated: function (value, newKey, oldKey, item) {
            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(newKey, value, item);

            if (oldIndex !== newIndex) {
                this.moveValue(value, newKey, oldIndex, newIndex, item, true);

                var keyCounts = this.keyCounts;
                keyCounts[oldKey]--;
                keyCounts[newKey] = (keyCounts[newKey] || 0) + 1;
            }
        },
        moveValue: function (value, sortKey, oldIndex, newIndex, item, isMutation) {
            var sortedItems = this.sortedItems,
                transformedArray = this.transformedArray;

            // If we're here because of a move in the original array, rather
            // than a mutated value, then the mappedItems array has already
            // been reordered, thus newIndex is correctly adjusted.
            if (isMutation && oldIndex < newIndex) {
                newIndex--;
            }

            sortedItems.splice(oldIndex, 1);
            sortedItems.splice(newIndex, 0, item);
            item.mappedIndex = newIndex;

            if (newIndex > oldIndex) {
                for (var i = oldIndex; i < newIndex; i++) {
                    sortedItems[i].mappedIndex--;
                }
            } else {
                for (var i = newIndex + 1; i <= oldIndex; i++) {
                    sortedItems[i].mappedIndex++;
                }
            }

            spliceToFrom(this, newIndex, oldIndex, value);
        },
        sortedIndexOf: function (key, value, item) {
            var sortedItems = this.sortedItems,
                length = sortedItems.length;

            if (!length) {
                return 0;
            }

            var start = 0, end = length - 1, index;

            while (start <= end) {
                index = (start + end) >> 1;

                if (sortedItems[index].mappedValue < key) {
                    start = index + 1;
                } else if ((end = index) === start) {
                    break;
                }
            }

            // Keep things stably sorted. Only incurs a cost if there are
            // multiple of this key.
            var count = this.keyCounts[key], offset = 0;

            if (count) {
                var mappedItems = this.mappedItems, mappedItem;

                for (var i = 0; i < length; i++) {
                    mappedItem = mappedItems[i];

                    if (mappedItem === item) {
                        break;
                    }
                    if (mappedItem.mappedValue === key) {
                        offset++;
                    }
                    if (offset === count) {
                        break;
                    }
                }
            }

            return start + offset;
        }
    });

    function filterIndexOf(state, items, prop, index) {
        var previousItem, mappedIndex = 0;
        if (index > 0) {
            previousItem = items[index - 1];
            mappedIndex = previousItem[prop] || 0
            if (state.getVisibility(previousItem.mappedValue)) {
                mappedIndex++;
            }
        }
        return mappedIndex;
    }

    makeTransform({
        name: "filter",
        mappedIndexProp: "mappedIndex",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, visible, item) {
            var mappedItems = this.mappedItems,
                mappedIndexProp = this.mappedIndexProp,
                mappedIndex = filterIndexOf(this, mappedItems, mappedIndexProp, index);

            item[mappedIndexProp] = mappedIndex;

            if (visible) {
                for (var i = index + 1, len = mappedItems.length; i < len; i++) {
                    mappedItems[i][mappedIndexProp]++;
                }
                spliceIn(this, mappedIndex, value);
            }
        },
        valueDeleted: function (value, index, visible, item) {
            if (visible) {
                var mappedItems = this.mappedItems,
                    mappedIndexProp = this.mappedIndexProp;

                // In normal cases, this item will already be spliced out of
                // mappedItems, because it was removed from the original array.
                // But in conjunction with groupBy, which uses filter
                // underneath, all of the groups share a single mappedItems
                // and use valueDelete here to "hide" an item from a group even
                // though it still exists in the original array. In that case,
                // increment index so that we only update the mappedItems
                // beyond the hidden one.

                if (mappedItems[index] === item) {
                    index++;
                }
                for (var i = index, len = mappedItems.length; i < len; i++) {
                    mappedItems[i][mappedIndexProp]--;
                }
                spliceOut(this, item[mappedIndexProp], value);
            }
        },
        valueMoved: function (value, to, from, visible, item) {
            var mappedItems = this.mappedItems,
                mappedIndexProp = this.mappedIndexProp,
                fromMappedIndex = item[mappedIndexProp],
                toMappedIndex = filterIndexOf(this, mappedItems, mappedIndexProp, to);

            // Compensate for the fact that indexes haven't been decremented
            // yet below, so filterIndexOf is biased.
            if (to > from) {
                toMappedIndex--;
            }
            item[mappedIndexProp] = toMappedIndex;

            if (visible) {
                if (to > from) {
                    for (var i = from; i < to; i++) {
                        mappedItems[i][mappedIndexProp]--;
                    }
                } else {
                    for (var i = to + 1; i <= from; i++) {
                        mappedItems[i][mappedIndexProp]++;
                    }
                }
                spliceToFrom(this, toMappedIndex, fromMappedIndex, value);
            }
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible, item) {
            if (shouldBeVisible && !currentlyVisible) {
                this.valueAdded(value, item.index.peek(), true, item);

            } else if (!shouldBeVisible && currentlyVisible) {
                this.valueDeleted(value, item.index.peek(), true, item);
            }
        },
        getVisibility: Boolean
    });

    function getGroupVisibility(groupKey) {
        return String(groupKey) === this.groupKey;
    }

    makeTransform({
        name: "groupBy",
        init: function () {
            this.groups = emptyObject();
            return ko.observableArray([]);
        },
        applyChanges: function (changes) {
            var groups = this.groups;

            applyChanges.call(this, changes);

            for (var key in groups) {
                if (!groups[key].transformedArray.length) {
                    this.deleteGroup(key);
                }
            }
        },
        valueAdded: function (value, index, groupKey, item) {
            groupKey = String(groupKey);

            var groups = this.groups;

            if (!groups[groupKey]) {
                var group = new transformClasses.filter(this.original);
                groups[groupKey] = group;

                group.groupKey = groupKey;
                group.mappedItems = this.mappedItems;
                group.mappedIndexProp = "mappedIndex." + groupKey;
                group.getVisibility = getGroupVisibility;

                var object = emptyObject();
                object.key = groupKey;
                object.values = group.transform;

                spliceIn(this, this.transformedArray.length, object);
            }

            for (var key in groups) {
                groups[key].valueAdded(value, index, key === groupKey, item);
            }
        },
        valueDeleted: function (value, index, groupKey, item) {
            groupKey = String(groupKey);

            var groups = this.groups;

            for (var key in groups) {
                groups[key].valueDeleted(value, index, key === groupKey, item);
            }
        },
        valueMoved: function (value, to, from, groupKey, item) {
            groupKey = String(groupKey);

            var groups = this.groups;

            for (var key in groups) {
                groups[key].valueMoved(value, to, from, key === groupKey, item);
            }
        },
        valueMutated: function (value, newGroupKey, oldGroupKey, item) {
            newGroupKey = String(newGroupKey);
            oldGroupKey = String(oldGroupKey);

            var groups = this.groups,
                index = item.index.peek(),
                group;

            for (var key in groups) {
                group = groups[key];
                group.valueDeleted(value, index, key === oldGroupKey, item);
                group.valueAdded(value, index, key === newGroupKey, item);

                if (!group.transformedArray.length) {
                    this.deleteGroup(key);
                }
            }
        },
        deleteGroup: function (groupKey) {
            var transformedArray = this.transformedArray;

            delete this.groups[groupKey];

            for (var i = 0, len = transformedArray.length; i < len; i++) {
                if (transformedArray[i].key === groupKey) {
                    return spliceOut(this, i, transformedArray[i]);
                }
            }
        }
    });

    makeTransform({
        name: "map",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, mappedValue) {
            spliceIn(this, index, mappedValue);
        },
        valueDeleted: function (value, index, mappedValue) {
            spliceOut(this, index, mappedValue);
        },
        valueMoved: function (value, to, from, mappedValue) {
            spliceToFrom(this, to, from, mappedValue);
        },
        valueMutated: function (value, newMappedValue, oldMappedValue, item) {
            var index = item.index.peek();
            spliceToFrom(this, index, index, newMappedValue);
        }
    });

    var allOrAny = {
        init: function () {
            this.truthinessCount = 0;
            return ko.observable(this.getTruthiness());
        },
        valueAdded: function (value, index, truthiness) {
            this.valueMutated(null, truthiness, false);
        },
        valueDeleted: function (value, index, truthiness) {
            this.valueMutated(null, false, truthiness);
        },
        valueMoved: noop,
        valueMutated: function (value, newTruthiness, oldTruthiness) {
            if (newTruthiness && !oldTruthiness) {
                this.truthinessCount++;
            } else if (oldTruthiness && !newTruthiness) {
                this.truthinessCount--;
            }
            this.transform(this.getTruthiness());
        }
    };

    makeTransform(ko.utils.extend({
        name: "any",
        getTruthiness: function () {
            return this.truthinessCount > 0;
        }
    }, allOrAny));

    makeTransform(ko.utils.extend({
        name: "all",
        getTruthiness: function () {
            return this.truthinessCount === this.mappedItems.length;
        }
    }, allOrAny));

    ko.observableArray.fn.some = ko.observableArray.fn.any;
    ko.observableArray.fn.every = ko.observableArray.fn.all;

    ko.arrayTransforms = {
        makeTransform: makeTransform
    };
});
