var ko = require('knockout');

module.exports = {
    mappedIndexProp: 'mappedIndex',
    getInitialState: function () {
        return ko.observableArray([]);
    },
    filteredIndexOf: function (items, prop, index) {
        var previousItem;
        var mappedIndex = 0;

        if (index > 0) {
            previousItem = items[index - 1];
            mappedIndex = previousItem[prop] || 0;

            if (this.getVisibility(previousItem.mappedValue)) {
                mappedIndex++;
            }
        }

        return mappedIndex;
    },
    valueAdded: function (value, index, visible, item) {
        visible = this.getVisibility(visible);

        var mappedItems = this.mappedItems;
        var mappedIndexProp = this.mappedIndexProp;

        if (visible) {
            for (var i = index + 1, len = mappedItems.length, tmp; i < len; i++) {
                tmp = mappedItems[i];
                if (tmp) {
                    tmp[mappedIndexProp]++;
                }
            }
        }

        var mappedIndex = this.filteredIndexOf(mappedItems, mappedIndexProp, index);
        if (visible) {
            this.state.peek().splice(mappedIndex, 0, value);
        }
        item[mappedIndexProp] = mappedIndex;
    },
    valueDeleted: function (value, index, visible, item) {
        if (this.getVisibility(visible)) {
            var mappedItems = this.mappedItems;
            var mappedIndexProp = this.mappedIndexProp;
            var mappedIndex = this.filteredIndexOf(mappedItems, mappedIndexProp, index);

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

            for (var i = index, len = mappedItems.length, tmp; i < len; i++) {
                tmp = mappedItems[i];
                if (tmp) {
                    tmp[mappedIndexProp]--;
                }
            }

            this.state.peek().splice(mappedIndex, 1);
        }
    },
    valueMutated: function (value, shouldBeVisible, currentlyVisible, item) {
        var index = this.mappedItems.indexOf(item);
        this.valueAdded(value, index, shouldBeVisible, item);
        this.valueDeleted(value, index, currentlyVisible, item);
    }
};
