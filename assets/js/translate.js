var Translate = (function () {
    
    var translate_interval;
    var translate_data;
    var translate_time = 1000;
    
    var traslate = function(lang) {
        // Set the data
        translate_set_data(lang);
        
        // Start the interval
        translate_interval = setInterval(translate_tick, 5);
    };
    
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
                'pointer': 0,
                'depth': 1,
                'selector': current_string.selector,
                'original': $(current_string.selector).html(),
                'to': current_string[lang]
            })
        }
    }
    
    var translate_tick = function() {
        // Used to finish the running if no blocks are translated
        var still_running = false;
        
        // Loop all the data
        for (var i = 0; i < translate_data.length; i++) {
            // Shortcut
            var current_data = translate_data[i];
            
            // Only handle translations still running
            if (!current_data.finished) {
                // Increase the counter
                current_data.pointer++;
                
                // Keep the translated text in this variable
                var translate_string = '';
                
                // Check if this is the last time we run the algorithm
                if (current_data.pointer >= Math.max(current_data.to.length, current_data.original.length)) {
                    // Final run
                    translate_string = current_data.to;
                    
                    // Stop the current data
                    current_data.finished = true;
                }
                else {
                    // Actual replace done here
                    translate_string = current_data.to.substr(0, current_data.pointer);
                    
                    // Add block
                    translate_string += '<span class="cursor">&#9608;</span>';
                    
                    // Check if we should add the original text
                    if (current_data.pointer <= current_data.original.length) {
                        translate_string += current_data.original.substr(current_data.pointer);
                    }
                }
                
                // Set the new value
                $(current_data.selector).html(translate_string);
                
                // Be sure to update still running if we got here
                if (!still_running) {
                    still_running = true;
                }
            }
        }
        
        // Check if we should break out of the ticks
        if (!still_running) {
            clearInterval(translate_interval);
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