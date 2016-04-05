/**
 * The translation module
 */

var Translate = (function () {
    
    // Hold the interval for the translation
    var translate_interval;

    // Holds all the translation data
    var translate_data;

    // Time it should take to translate everything (in ms)
    var translate_time = 1000;
    
    /**
     * Start the translation to a language
     */

    var translate = function(lang) {
        // Set the data
        translate_set_data(lang);
        
        // Start the interval
        translate_tick();
        translate_interval = setInterval(translate_tick, 400);
    };

    /**
     * Runs a single tick in the translation
     */

    var translate_tick = function() {
        // Used to finish the running if no blocks are translated
        var still_running = false;
        
        // Loop all the data
        for (var i = 0; i < translate_data.length; i++) {
            // Shortcut
            var current_data = translate_data[i];
            
            // Only handle translations still running
            if (!current_data.finished) {
                // Handle tick
                handle_tick(current_data);
                
                // Check if we are finished
                if (!translation_finished(current_data)) {
                    // Set still running to true to run a new tick
                    still_running = true;
                }
            }
        }
        
        // Check if we should break out of the ticks
        if (!still_running) {
            clearInterval(translate_interval);
        }
    }

    /**
     * Handle a single tick for a running translation
     */

    var handle_tick = function(current_data) {
        // Check if we should add/remove the container elements
        if (current_data.cursors.add[0].current_position === 0) {
            // Build the container markup
            build_container_markup(current_data);
        }
        
        // Get the add content
        var add_content = $(current_data.selector + ' span.add').get(0).outerHTML;
        var add_content_length = add_content.length;
        
        // Add the new letter
        var new_content_letter = current_data.to.substr(current_data.cursors.add[0].current_position, 1);
        var add_content_new = add_content.substr(0, add_content_length - 7) + new_content_letter + '</span>';

        var cursor_content = $(current_data.selector + ' span.cursor').get(0).outerHTML;

        // Get the remove content
        var remove_content = $(current_data.selector + ' span.remove').get(0).outerHTML;

        // Add content
        $(current_data.selector).html(add_content_new + cursor_content + remove_content);

        // Update the content
        current_data.cursors.add[0].current_position++;

        //
        // ====================================================================
        //

        // Get the actual cursor object
        var remove_cursor = current_cursor(current_data.cursors.remove[0]);

        // Check if we need to handle children
        while (true) {
            if (remove_cursor.children === null) {
                console.log('Now');
                // Find all the children of the current cursor
                find_children_elements(remove_cursor);

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

                if (!switch_remove) {
                    break;
                }
            }
            else {
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

            current_parent = current_data.cursors.remove[0];
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
    }

    /**
     * Checks if a translation is finished
     */

    var translation_finished = function(data) {
        // Validate that remove is empty and that add is the same length as to
        if ($(data.cursors.remove[0].selector).html().length === 0 && 
            $(data.cursors.add[0].selector).html().length === data.to.length) {
            // We are finished!
            data.finished = true;

            // Parse the content one last time
            $(data.selector).html(data.to);

            // Return true to indicate that we are finished
            return true;
        }

        // We are not finished
        return false;
    }

    /**
     * Returns the current cursor by traversing the cursors with a depth first approach
     */

    var current_cursor = function (list) {
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
            
            // Build the current data object
            translate_data.push({
                'finished': false,
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
                            'current': true,
                            'skip': false,
                            'children': null
                        }  
                    ],
                },
                'selector': current_string.selector,
                'original': $(current_string.selector).html(),
                'to': current_string[lang]
            })
        }
    }

    /**
     * Takes a cursor and finds the cursors children
     */

    var find_children_elements = function(current_cursor) {
        // Get the start index
        var start_index = 0;
        var subtract = 0;

        // Get all direct children of the current element
        var children = $(current_cursor.selector).children();

        current_cursor.children = [];

        // Loop all the direct children
        for (var i = 0; i < children.length; i++) {
            // Get the current index
            var this_index = $(current_cursor.selector).html().substr(start_index).indexOf(children[i].outerHTML);

            // Add to cursor
            current_cursor.children.push({
                'position': start_index + this_index - subtract,
                'current_position': 0,
                'selector': current_cursor.selector + ' > *:eq(0)',
                'current': false,
                'skip': children[i].innerHTML.length === 0,
                'children': null,
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
            // WIP
            translate('en');
        }
    }
})();

/**
 * On jQuery document ready, init the translation module
 */

$(Translate.init());