var Translate = (function () {
    
    var translate_interval;
    var translate_data;
    var translate_time = 1000;
    
    var traslate = function(lang) {
        // Set the data
        translate_set_data(lang);
        
        // Start the interval
        translate_tick();
        translate_interval = setInterval(translate_tick, 500);
    };

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
                            'object': $(current_string.selector + ' span.remove'),
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
                            'object': $(current_string.selector + ' span.add'),
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

    var find_children_elements = function(current_cursor) {
        console.log('called');
        // Get the start index
        var start_index = 0;
        var subtract = 0;

        // Get all direct children of the current element
        var children = $(current_cursor.selector).children();
        console.log(children);

        current_cursor.children = [];

        // Loop all the direct children
        for (var i = 0; i < children.length; i++) {
            // Get the current index
            var this_index = $(current_cursor.selector).html().substr(start_index).indexOf(children[i].outerHTML);

            // Add to cursor
            current_cursor.children.push({
                'position': start_index + this_index - subtract,
                'current_position': 0,
                'object': $(current_cursor.selector).find(children[i]),
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
    
    var translate_tick = function() {
        // Used to finish the running if no blocks are translated
        var still_running = true;
        
        // Loop all the data
        for (var i = 0; i < translate_data.length; i++) {
            // Shortcut
            var current_data = translate_data[i];

            console.log(current_data.cursors.remove[0]);
            
            // Only handle translations still running
            if (!current_data.finished) {
                // Check if we should add/remove the container elements
                if (current_data.cursors.add[0].current_position === 0) {
                    // Add the elements
                    $(current_data.selector).html('<span class="add"></span><span class="remove">' + $(current_data.selector).html() + '</span>');
                }
                
                // Get the add content
                var add_content = $(current_data.selector + ' span.add').get(0).outerHTML;
                var add_content_length = add_content.length;
                
                // Add the new letter
                var new_content_letter = current_data.to.substr(current_data.cursors.add[0].current_position, 1);
                var add_content_new = add_content.substr(0, add_content_length - 7) + new_content_letter + '</span>';

                // Get the remove content
                var remove_content = $(current_data.selector + ' span.remove').get(0).outerHTML;

                // Add content
                $(current_data.selector).html(add_content_new + remove_content);

                console.log('Add = ');
                console.log($(current_data.selector).html());

                // Update the content
                current_data.cursors.add[0].current_position++;

                // Get the actual cursor object
                var remove_cursor = current_cursor(current_data.cursors.remove[0]);

                // Check if we need to handle children
                if (remove_cursor.children === null) {
                    find_children_elements(remove_cursor);
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
                    console.log('Switch');
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

                console.log('Remove = ');
                console.log($(current_data.selector).html());
                console.log('-------')
            }
        }
        
        // Check if we should break out of the ticks
        if (still_running) {
            //clearInterval(translate_interval);
        }
    }
    
    return {
        init: function () {
            // WIP
            traslate('en');
        }
    }
})();

$(Translate.init());