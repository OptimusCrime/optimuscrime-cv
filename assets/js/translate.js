/**
 * The translation module
 */

var Translate = (function () {
    
    // Stores the current language
    var lang = 'no';
    
    // Store the current state
    var running = false;

    // Holds all the translation data
    var translate_data;

    // Time it should take to translate everything (in ms)
    var translate_time = 20000;

    // Translation tick timeout
    var translate_tick_timeout = 4;
    
    // Translation interval value
    var translate_interval = null;

    // Keeps track of the current tick index
    var translate_tick_index = 0;
    
    // Keeps track of how long it takes to run a single translation
    var translation_tick_duration = 0;
    
    /**
     * Listener for click / touch event on translation link
     */
    
    var translate_listener = function(e) {
        // Handle touch/click correctly
        e.stopPropagation();
        e.preventDefault();
        
        // Make sure not to fire twice
        if (e.handled !== true) {
            // Make sure we are not running
            if (!running) {
                // Set running to true
                running = true;
                
                // Swap language
                if (lang === 'no') {
                    lang = 'en';
                }
                else {
                    lang = 'no';
                }
                
                // Call the translation
                translate(lang);
            }
            
            // Make sure not to run twice
            e.handled = true;
        }
    }
    
    /**
     * Start the translation to a language
     */

    var translate = function(lang) {
        // Set the data
        translate_set_data(lang);

        // Reset tick index
        translate_tick_index = 0;
        
        // Calibrate the speed of a single tick (estimate)
        translate_calibrate();
        
        // Start the interval
        setTimeout(translate_tick, translate_tick_timeout);
    };
    
    var translate_calibrate = function() {
        // Get the current ms
        var translate_start = new Date().getTime();
        
        // Run a single tick
        translate_tick();
        
        // Compute the duration for a single tick
        translation_tick_duration = new Date().getTime() - translate_start;
    }

    /**
     * Runs a single tick in the translation
     */

    var translate_tick = function() {
        // Get the current piece of data
        var current_data = translate_data[0];

        // Check if we need to calculate interval values
        if (translate_tick_index === 1) {
            calculate_tick_interval();
        }
        
        // Check if we should run this tick
        if (translate_tick_index === 0 || translate_interval < 1 || (translate_tick_index % translate_interval) === 0) {
            // Check if we need to handle more than one step (interval lower than 1)
            if (translate_interval !== null && translate_interval < 1) {
                // Handle multiple ticks in one call, calculate how many
                var number_of_ticks_to_batch = Math.ceil(1 / translate_interval);
                
                // Run n ticks at once
                handle_tick(current_data, number_of_ticks_to_batch);
            }
            else {
                // We just need to handle one tick
                handle_tick(current_data, 1);
            }
        }

        // Check if we are finished
        if (current_data.created && translation_finished(current_data)) {
            // This translation is finished
            translation_finish(current_data);
            
            // Remove the current data
            translate_data.splice(0, 1);
        }
        
        // Increase tick index by one
        translate_tick_index++;
        
        // Check if we should break out of the ticks
        if (translate_tick_index > 1 && translate_data.length > 0) {
            setTimeout(translate_tick, translate_tick_timeout);
        }
        
        // Check if we are all finished
        if (translate_tick_index > 1 && translate_data.length === 0) {
            running = false;
        }
    }

    /**
     * Method for calculating how often the translation for this data should be done
     */

    var calculate_tick_interval = function(data) {
        // Get the number of ticks in total
        var number_of_ticks = translate_time / translation_tick_duration;

        // Get the total maximum length of things to remove/add
        var maximum_handle_length = 0;
        for (var i = 0; i < translate_data.length; i++) {
            maximum_handle_length += Math.max(translate_data[i].original.length, $('<div>' + translate_data[i].to + '</div>').text().length);
        }

        // Calculate interval
        var interval = number_of_ticks / maximum_handle_length;
        
        // If interval is higher than 1 we can just floor the value
        if (interval > 1) {
            interval = Math.floor(interval);
        }

        // Finally set the interval
        translate_interval = interval;
    }

    /**
     * Handle a single tick for a running translation
     */

    var handle_tick = function(data, inner_ticks) {
        // Check if we should add/remove the container elements
        if (!data.created) {
            // Build the container markup
            build_container_markup(data);
        }
        
        for (var i = 0; i < inner_ticks; i++) {
            // Handle adding of content
            handle_tick_add(data);

            // Handle removing of content
            handle_tick_remove(data);
            
            if (translation_finished(data)) {
                break;
            }
        }
    }

    /**
     * Handle adding of content for a single tick
     */

    var handle_tick_add = function(data) {
        // Check if we are finished running add
        if ($(data.selector + ' span.add').html().length === data.to.length) {
            return;
        }

        // Get the add content
        var add_content = $(data.selector + ' span.add').get(0).outerHTML;
        var add_content_length = add_content.length;

        // Get the actual cursor object
        var add_cursor = current_cursor(data.cursors.add[0]);

        // Check if we need to handle children
        while (true) {
            // Check if we should look for new children
            if (add_cursor.children === null) {
                // Find all the children of the current cursor
                find_child_elements_add(data, add_cursor);
                
                // Check if we need to switch at once (nested content directly)
                var switch_add = false;

                // Loop all the known children
                for (var j = 0; j < add_cursor.children.length; j++) {
                    // If any child has a position of 0 we should switch to that one right away
                    if (add_cursor.children[j].position === 0) {
                        // Indicate a switch
                        switch_add = true;

                        // Set the current cursor to inactive and the child to active
                        add_cursor.current = false;
                        add_cursor.children[j].current = true;

                        // If not already built, add dom node for the child
                        if ($(add_cursor.children[j].selector).length === 0) {
                            // Add the entire content
                            $(add_cursor.selector).append(add_cursor.children[j].markup);

                            // Empty the content
                            $(add_cursor.children[j].selector).html('');
                        }

                        // Update reference to current add cursor
                        add_cursor = add_cursor.children[j];

                        // Break out of the inner loop
                        break;
                    }
                }

                // Support for multiple switches
                if (!switch_add) {
                    break;
                }
            }
            else {
                // Children are either already fetched, or there are no more children
                break;
            }
        }

        // Add new content from the current cursor
        $(add_cursor.selector).append(add_cursor.markup_inside.substr(add_cursor.current_position, 1));

        // Check if we are done with the current node
        if ($(add_cursor.selector).html().length === add_cursor.markup_inside.length) {
            // Make sure to keep the root element
            if (data.selector + ' span.add' === add_cursor.selector) {
                return;
            }

            // Keep track of content to remove from the parent selector
            var content_to_compensate = '';

            // Check if we should switch outwards
            current_parent = data.cursors.add[0];

            // Endless outwards
            while (true) {
                // Loop children
                var found = false;
                for (var j = 0; j < current_parent.children.length; j++) {
                    if (current_parent.children[j].selector === add_cursor.selector) {
                        content_to_compensate = current_parent.children[j].markup;
                        current_parent.children.splice(j, 1);
                        current_parent.current = true;
                        found = true;
                        break;
                    }
                }

                // If we found the parent, break out of the loop
                if (found) {
                    break;
                }
                else {
                    // No parent, look at the first child
                    current_parent = current_parent.children[0];
                }
            }

            // Increase the current position
            current_parent.current_position += content_to_compensate.length;
        }
        else {
            // Increase the cursor position
            add_cursor.current_position++;

            // Check if we should switch cursor inwards
            var switched_cursor = false;

            // Loop all the children
            for (var j = 0; j < add_cursor.children.length; j++) {
                // Check if the current child's position matches the cursor's position
                if (add_cursor.children[j].position == add_cursor.current_position) {
                    // Switch cursor, a new element was found at this location
                    switched_cursor = true;

                    // Activate child
                    add_cursor.children[j].current = true

                    // Create element for child
                    $(add_cursor.selector).append(add_cursor.children[j].markup);

                    // Empty the content
                    $(add_cursor.children[j].selector).html('');

                    // Break out of the current loop
                    break;
                }
            }

            // If we switched cursor, make sure to deactivate the current parent
            if (switched_cursor) {
                add_cursor.current = false;
            }
        }
    }

    /**
     * Handle removing of content for a single tick
     */

    var handle_tick_remove = function(data) {
        // Check if we are finished running remove
        if ($(data.selector + ' span.remove').length === 0) {
            return;
        }

        // Get the actual cursor object
        var remove_cursor = current_cursor(data.cursors.remove[0]);

        // Check if we need to handle children
        while (true) {
            // Check if we should look for new children
            if (remove_cursor.children === null) {
                // Find all the children of the current cursor
                find_child_elements_remove(remove_cursor);

                // Check if we need to switch at once (nested content directly)
                var switch_remove = false;
                for (var j = 0; j < remove_cursor.children.length; j++) {
                    if (remove_cursor.children[j].position === 0) {
                        switch_remove = true;
                        remove_cursor.current = false;
                        remove_cursor.children[j].current = true;

                        remove_cursor = remove_cursor.children[j];
                        break;
                    }
                }

                // Support for multiple switches
                if (!switch_remove) {
                    break;
                }
            }
            else {
                // Children are either already fetched, or there are no more children
                break;
            }
        }

        // Check if we are on the root element
        var current_html = $(remove_cursor.selector).html();
        
        // Not the root element, simply do remove
        $(remove_cursor.selector).html(current_html.substr(1));    
        
        // Check if we should remove the entire node
        if ($(remove_cursor.selector).html().length === 0) {
            // Empty node, remove node
            $(remove_cursor.selector).remove();

            // Check if there are any remove spans left (or we are done)
            if ($(data.selector + ' span.remove').length === 0) {
                return;
            }

            current_parent = data.cursors.remove[0];
            while (true) {
                // Loop children
                var found = false;
                for (var j = 0; j < current_parent.children.length; j++) {
                    if (current_parent.children[j].selector === remove_cursor.selector) {
                        current_parent.children.splice(j, 1);
                        current_parent.current = true;
                        found = true;
                        break;
                    }
                }

                if (found) {
                    break;
                }
                else {
                    current_parent = current_parent.children[0];
                }
            }
        }
        else {
            // Update the position
            remove_cursor.current_position++;

            // Check if we should switch cursor
            var switched_cursor = false;
            for (var j = 0; j < remove_cursor.children.length; j++) {
                if (remove_cursor.children[j].position == remove_cursor.current_position) {
                    switched_cursor = true;
                    remove_cursor.children[j].current = true
                    break;
                }
            }

            if (switched_cursor) {
                remove_cursor.current = false;
            }
        }
    }

    /**
     * Builds the container markup used to populate and remove translation in progress in
     */

    var build_container_markup = function(data) {
        // Build the markup
        var markup = '<span class="add"></span>' 
                   + '<span class="cursor">&#9608;</span>'
                   + '<span class="remove">' + $(data.selector).html() + '</span>';

        // Set the markup to the selector
        $(data.selector).html(markup);
        
        // Set created to true
        data.created = true;
    }

    /**
     * Checks if a translation is finished
     */

    var translation_finished = function(data) {
        // Validate that remove is empty and that add is the same length as to
        if ($(data.selector + ' span.remove').length === 0 && 
            $(data.cursors.add[0].selector).html().length === data.to.length) {
            // Return true to indicate that we are finished
            return true;
        }

        // We are not finished
        return false;
    }
    
    /**
     * Handles finishing a translation
     */

    var translation_finish = function(data) {
        // Update the final content
        $(data.selector).html(data.to);
    }

    /**
     * Returns the current cursor by traversing the cursors with a depth first approach
     */

    var current_cursor = function(list) {
        var current_list_object = list;
        while (true) {
            if (current_list_object.current) {
                return current_list_object;
            }
            else {
                current_list_object = current_list_object.children[0];
            }
        }
    }

    /**
     * Takes the strings to translate and creates the initial translate data, and the initial cursors
     */
    
    var translate_set_data = function(lang) {
        // Clear the translate array
        translate_data = [];
        
        // Loop all the strings
        for (var i = 0; i < strings.length; i++) {
            // Shortcut
            var current_string = strings[i];
            
            // Make sure selector is valid
            if ($(current_string.selector).length > 0) {
                // Build the current data object
                translate_data.push({
                    'cursors': {
                        'remove': [
                            {
                                'position': 0,
                                'current_position': 0,
                                'selector': current_string.selector + ' span.remove',
                                'current': true,
                                'skip': false,
                                'children': null
                            }  
                        ],
                        'add': [
                            {
                                'position': 0,
                                'current_position': 0,
                                'selector': current_string.selector + ' span.add',
                                'to_selector': 'div',
                                'current': true,
                                'skip': false,
                                'children': null,
                                'markup_inside': current_string[lang]
                            }  
                        ],
                    },
                    'selector': current_string.selector,
                    'original': $(current_string.selector).html(),
                    'to': current_string[lang],
                    'created': false
                });
            }
        }
    }

    /**
     * Takes a cursor and finds the cursors children for the add functionality
     */

    var find_child_elements_add = function(data, cursor) {
        // Get the start index
        var start_index = 0;
        var subtract = 5;

        var $to_element = $('<div><div>' + cursor.markup_inside + '</div></div>');

        // Get all direct children of the current element
        var children = $to_element.find(cursor.to_selector).children();

        // Create array for children
        cursor.children = [];

        // Loop all the direct children
        for (var i = 0; i < children.length; i++) {
            // Get the current index
            var this_index = $to_element.html().substr(start_index).indexOf(children[i].outerHTML);

            // Add to cursor
            cursor.children.push({
                'position': start_index + this_index - subtract,
                'current_position': 0,
                'selector': cursor.selector + ' > *:eq(' + i + ')',
                'to_selector': 'div',
                'markup': children[i].outerHTML,
                'markup_inside': children[i].innerHTML,
                'current': false,
                'skip': children[i].innerHTML.length === 0,
                'children': null
            });

            // Update startIndex (to avoid returning the first occurence if multiple children of same type)
            start_index = this_index;
        }
    }

    /**
     * Takes a cursor and finds the cursors children for the remove functionality
     */

    var find_child_elements_remove = function(cursor) {
        // Get the start index
        var start_index = 0;
        var subtract = 0;

        // Get all direct children of the current element
        var children = $(cursor.selector).children();

        cursor.children = [];

        // Loop all the direct children
        for (var i = 0; i < children.length; i++) {
            // Get the current index
            var this_index = $(cursor.selector).html().substr(start_index).indexOf(children[i].outerHTML);

            // Add to cursor
            cursor.children.push({
                'position': start_index + this_index - subtract,
                'current_position': 0,
                'selector': cursor.selector + ' > *:eq(0)',
                'current': false,
                'skip': children[i].innerHTML.length === 0,
                'children': null
            });

            // Add to subtract
            subtract += children[i].outerHTML.length;

            // Update startIndex (to avoid returning the first occurence if multiple children of same type)
            start_index = this_index;
        }
    }
    
    /**
     * Public methods goes here
     */
    
    return {

        /**
         * Boostraps the translation method(s)
         */

        init: function () {
            $('.translation').on('touchstart click', 'a', translate_listener);
        }
    }
})();

/**
 * On jQuery document ready, init the translation module
 */

$(Translate.init());