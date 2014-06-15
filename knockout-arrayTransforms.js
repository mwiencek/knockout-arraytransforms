// knockout-arrayTransforms 0.3.0 (https://github.com/mwiencek/knockout-arrayTransforms)
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

    var transformClasses = emptyObject();

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
                    item = mappedItems[from];
                    mappedItems.splice(from, 1)
                    mappedItems.splice(to, 0, item);
                    movedIndex(mappedItems, "index", to, from);
                    this.valueMoved(value, to, from, item.mappedValue, item);
                }
            }

            if (status === "added") {
                if (moved === undefined) {
                    item = emptyObject();
                    item.index = index;
                    item.value = value;
                    mapValue(this, item);
                    mappedItems.splice(index, 0, item);
                    addedIndex(mappedItems, "index", index);
                    this.valueAdded(value, index, item.mappedValue, item);
                }
                offset++;

            } else if (status === "deleted") {
                if (moved === undefined) {
                    item = mappedItems.splice(index + offset, 1)[0];
                    if (item.computed) {
                        item.computed.dispose();
                    }
                    deletedIndex(mappedItems, "index", index + offset);
                    this.valueDeleted(value, index + offset, item.mappedValue, item);
                }
                offset--;
            }
        }
    };

    function updateIndex(items, prop, start, end, offset) {
        while (start <= end) {
            items[start++][prop] += offset;
        }
    }

    function addedIndex(array, prop, index) {
        updateIndex(array, prop, index + 1, array.length - 1, 1);
    }

    function deletedIndex(array, prop, index) {
        updateIndex(array, prop, index, array.length - 1, -1);
    }

    function movedIndex(array, prop, to, from) {
        if (to > from) {
            updateIndex(array, prop, from, to - 1, -1);
        } else {
            updateIndex(array, prop, to + 1, from, 1);
        }
    }

    function emptyObject() {
        return Object.create ? Object.create(null) : {};
    }

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
            return computedValue;
        } else {
            item.mappedValue = computedValue.peek();
        }
    }

    function watchItem(self, item, observable) {
        item.mappedValue = observable.peek();

        observable.subscribe(function (newValue) {
            var oldValue = item.mappedValue;
            item.mappedValue = newValue;
            self.valueMutated(item.value, newValue, oldValue, item);
        });
    }

    function makeTransform(proto) {
        function TransformState(original, callback, options) {
            this.original = original;
            this.mappedItems = [];
            this.callback = callback;

            var transform = this.transform = this.init(options);
            if (ko.isObservable(transform) && transform.cacheDiffForKnownOperation) {
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

            this.subscribe(function (changes) {
                state.applyChanges(changes);
            }, null, "arrayChange");

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
            addedIndex(sortedItems, "mappedIndex", mappedIndex);
            keyCounts[sortKey] = (keyCounts[sortKey] + 1) || 1;
            this.transform.splice(mappedIndex, 0, value);
        },
        valueDeleted: function (value, index, sortKey, item) {
            var mappedIndex = item.mappedIndex,
                sortedItems = this.sortedItems;

            sortedItems.splice(mappedIndex, 1);
            deletedIndex(sortedItems, "mappedIndex", mappedIndex);
            this.keyCounts[sortKey]--;
            this.transform.splice(mappedIndex, 1);
        },
        valueMoved: function (value, to, from, sortKey, item) {
            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(sortKey, value, item);

            if (oldIndex !== newIndex) {
                this.moveValue(value, sortKey, oldIndex, newIndex, item);
            }
        },
        valueMutated: function (value, newKey, oldKey, item) {
            // Revert to the old key temporarily, since it's already sorted,
            // otherwise the binary search won't work
            item.mappedValue = oldKey;

            var oldIndex = item.mappedIndex,
                newIndex = this.sortedIndexOf(newKey, value, item);

            item.mappedValue = newKey;

            if (oldIndex !== newIndex) {
                this.moveValue(value, newKey, oldIndex, newIndex, item, true);

                var keyCounts = this.keyCounts;
                keyCounts[oldKey]--;
                keyCounts[newKey] = (keyCounts[newKey] + 1) || 1;
            }
        },
        moveValue: function (value, sortKey, oldIndex, newIndex, item, isMutation) {
            var sortedItems = this.sortedItems;

            sortedItems.splice(oldIndex, 1);
            this.transform.splice(oldIndex, 1);

            // If we're here because of a move in the original array, rather
            // than a mutated value, then the mappedItems array has already
            // been reordered, thus newIndex is correctly adjusted.
            if (isMutation && oldIndex < newIndex) {
                newIndex--;
            }

            item.mappedIndex = newIndex;
            sortedItems.splice(newIndex, 0, item);

            movedIndex(sortedItems, "mappedIndex", newIndex, oldIndex);
            this.transform.splice(newIndex, 0, value);
        },
        sortedIndexOf: function (key, value, item) {
            var sortedItems = this.sortedItems,
                length = sortedItems.length;

            if (length === 0) {
                return 0;
            }

            var start = 0, end = length - 1, index;

            while (start <= end) {
                index = (start + end) >> 1;

                if (sortedItems[index].mappedValue < key) {
                    start = index + 1;
                } else {
                    end = index;
                    if (start === end) {
                        break;
                    }
                }
            }

            // Keep things stably sorted. Only incurs a cost if there are
            // multiple of this key.
            var count = this.keyCounts[key], offset = 0;

            if (count) {
                var mappedItems = this.mappedItems;

                for (var i = 0; i < length; i++) {
                    if (mappedItems[i] === item) {
                        break;
                    }
                    if (mappedItems[i].mappedValue === key) {
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

    function updateFilterMapping() {
        var mappedItems = this.mappedItems,
            mappedIndexProp = this.mappedIndexProp,
            transformedArray = this.transformedArray,
            currentItem,
            currentIndex = 0;

        for (var i = 0, len = mappedItems.length; i < len; i++) {
            currentItem = mappedItems[i];

            if (this.getVisibility(currentItem.mappedValue)) {
                currentItem[mappedIndexProp] = currentIndex;
                transformedArray[currentIndex++] = currentItem.value;
            }
        }
        transformedArray.length = currentIndex;
        this.transform.notifySubscribers(transformedArray);
    }

    makeTransform({
        name: "filter",
        mappedIndexProp: "mappedIndex",
        init: function () {
            return ko.observableArray([]);
        },
        valueAdded: function (value, index, visible) {
            if (this.getVisibility(visible)) {
                this.updateMapping();
            }
        },
        valueDeleted: function (value, index, visible, item) {
            if (this.getVisibility(visible)) {
                this.makeInvisible(value, index, item[this.mappedIndexProp]);
            }
        },
        valueMoved: function (value, to, from, visible) {
            if (this.getVisibility(visible)) {
                this.updateMapping();
            }
        },
        valueMutated: function (value, shouldBeVisible, currentlyVisible, item) {
            if (shouldBeVisible && !currentlyVisible) {
                this.updateMapping();

            } else if (!shouldBeVisible && currentlyVisible) {
                this.makeInvisible(value, item.index, item[this.mappedIndexProp]);
            }
        },
        makeInvisible: function (value, index, mappedIndex) {
            this.transform.splice(mappedIndex, 1);
            deletedIndex(this.mappedItems, this.mappedIndexProp, index);
        },
        updateMapping: updateFilterMapping,
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
                if (groups[key].transformedArray.length === 0) {
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

                this.transform.push(object);
            }

            for (var key in groups) {
                groups[key].valueAdded(value, index, groupKey, item);
            }
        },
        valueDeleted: function (value, index, groupKey, item) {
            var groups = this.groups;

            for (var key in groups) {
                groups[key].valueDeleted(value, index, groupKey, item);
            }
        },
        valueMoved: function (value, to, from, groupKey, item) {
            var groups = this.groups;

            for (var key in groups) {
                groups[key].valueMoved(value, to, from, groupKey, item);
            }
        },
        valueMutated: function (value, newGroupKey, oldGroupKey, item) {
            var groups = this.groups,
                oldGroup = groups[oldGroupKey],
                index = item.index;

            oldGroup.makeInvisible(value, index, this.mappedItems[index][oldGroup.mappedIndexProp]);
            groups[newGroupKey].updateMapping();

            if (oldGroup.transformedArray.length === 0) {
                this.deleteGroup(String(oldGroupKey));
            }
        },
        deleteGroup: function (groupKey) {
            var transformedArray = this.transformedArray;

            delete this.groups[groupKey];

            for (var i = 0, len = transformedArray.length, object; i < len; i++) {
                object = transformedArray[i];

                if (object.key === groupKey) {
                    this.transform.splice(i, 1);
                    return;
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
            this.transform.splice(index, 0, mappedValue);
        },
        valueDeleted: function (value, index) {
            this.transform.splice(index, 1);
        },
        valueMoved: function (value, to, from, mappedValue) {
            this.transform.splice(from, 1);
            this.transform.splice(to, 0, mappedValue);
        },
        valueMutated: function (value, newMappedValue, oldMappedValue, item) {
            this.transform.splice(item.index, 1);
            this.transform.splice(item.index, 0, newMappedValue);
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
        valueMoved: function noop() {},
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
