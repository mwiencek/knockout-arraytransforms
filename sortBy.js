var ko = require('knockout');

var uniqueID = 1;

module.exports = require('./createTransform')('sortBy', {
    getInitialState: function () {
        this.keyCounts = Object.create(null);
        this.sortedItems = [];
        return ko.observableArray([]);
    },
    valueAdded: function (value, index, sortKey, item, isMove) {
        var mappedIndex = this.sortedIndexOf(sortKey, value, item);
        var sortedItems = this.sortedItems;

        if (isMove) {
            // The item will exist twice in sortedItems, so we won't be
            // able to use indexOf later.
            var currentMappedIndex = sortedItems.indexOf(item);

            if (currentMappedIndex >= 0) {
                item.previousMappedIndex = currentMappedIndex;
            }
        }

        var keyCounts = this.keyCounts;
        sortedItems.splice(mappedIndex, 0, item);
        keyCounts[sortKey] = (keyCounts[sortKey] || 0) + 1;
        this.state.peek().splice(mappedIndex, 0, value);

        var seen = uniqueID++;
        for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
            item = sortedItems[i];

            if (item.seen !== seen && item.previousMappedIndex !== undefined && item.previousMappedIndex >= mappedIndex) {
                ++item.previousMappedIndex;
            }
            item.seen = seen;
        }
    },
    valueDeleted: function (value, index, sortKey, item, isMove) {
        var sortedItems = this.sortedItems, mappedIndex;

        if (isMove && item.previousMappedIndex !== undefined) {
            mappedIndex = item.previousMappedIndex;
            delete item.previousMappedIndex;
        } else {
            mappedIndex = sortedItems.indexOf(item);
        }

        sortedItems.splice(mappedIndex, 1);
        this.keyCounts[sortKey]--;
        this.state.peek().splice(mappedIndex, 1);

        var seen = uniqueID++;
        for (var i = mappedIndex, len = sortedItems.length; i < len; i++) {
            item = sortedItems[i];

            if (item.seen !== seen && item.previousMappedIndex !== undefined && item.previousMappedIndex > mappedIndex) {
                --item.previousMappedIndex;
            }
            item.seen = seen;
        }
    },
    valueMutated: function (value, newKey, oldKey, item) {
        var keyCounts = this.keyCounts;
        var oldIndex = this.sortedItems.indexOf(item);
        var newIndex = this.sortedIndexOf(newKey, value, item);

        keyCounts[oldKey]--;
        keyCounts[newKey] = (keyCounts[newKey] || 0) + 1;

        // The mappedItems array hasn't been touched yet, so adjust for that
        if (oldIndex < newIndex) {
            newIndex--;
        }

        if (oldIndex !== newIndex) {
            var state = this.state.peek();
            var sortedItems = this.sortedItems;

            sortedItems.splice(oldIndex, 1);
            sortedItems.splice(newIndex, 0, item);

            state.splice(oldIndex, 1);
            state.splice(newIndex, 0, value);
        }
    },
    sortedIndexOf: function (key, value, item) {
        var sortedItems = this.sortedItems;
        var length = sortedItems.length;

        if (!length) {
            return 0;
        }

        var start = 0;
        var end = length - 1;
        var index;

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
                if (!(mappedItem = mappedItems[i])) {
                    continue;
                }
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
