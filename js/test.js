//test.js
var fs       = require('fs');
var $        = require('jquery');
var id3      = require('id3js');
var jsonfile = require('jsonfile');

/************************************************************************
* Notes and TODO
*
*   - It only read id3v2 tags, not id3v1 tags, add id3v1 tags as backup
*
************************************************************************/


/**********************************************************
* Classes
**********************************************************/
function Entry(path, tags)
    {
        this.title    = tags.title    || 'No title';
        this.number   = tags.track    || 'No n';
        this.artist   = tags.artist   || 'No artist';
        this.album    = tags.album    || 'No album';
        this.duration = 0;
        
        this.genre    = tags.v2.genre || 'No genre';
        this.year     = tags.year     || 'No year';
        
        this.name     = path; /** Note: Path, not file name **/
        this.bitrate  = 0;
        this.size     = 0;
        this.format   = '';
        
        this.path     = path;
        this.index    = library.length;
        
        console.log(this.index);
    }


/**********************************************************
* Global variables
**********************************************************/
var library       = '';

var audio         = '';
var track_table   = '';
var entries       = [];

var add_button        = '';
var replay_button     = '';
var replay_all_button = '';

var entry_playing = 0;
var replay_all    = false;


/**********************************************************
* Functions
**********************************************************/
function add_file(e)
    {
        var path  = add_button.files[0].path;
        
        id3
            (
                { file: path, type: id3.OPEN_LOCAL },
                function(err, tags) { add_entry(path, tags); }
            )
    };

function add_folder(path)
    {
        /** TODO **/
    }

function play(entry)
    {
        entry_playing = entry.index;
        
        audio.pause();
        audio.src = entry.path;
        audio.play();
    }

function play_next_entry()
    {
        /**********************************************************************************
        * If it's the last track check for replay_all and go to the first one, else go on
        **********************************************************************************/
        if( (entry_playing+1 < library.length) || (replay_all == true) )
            {
                entry_playing =
                    (entry_playing+1 == library.length && replay_all == true) ? 0 : entry_playing+1;
                
                play(library[entry_playing]);
            }
    }

function add_entry_to_library(entry)
    {
        /***********************
        * Check for repetition
        ***********************/
        for(var n = 0, len = library.length; n < len; n++)
            {
                if( JSON.stringify(entry) == JSON.stringify(library[n]) )
                    {
                        return;
                    }
            }
        
        
        /*************************************
        * Add entry to library and save json
        *************************************/
        library.push(entry);        
        jsonfile.writeFileSync('library.json', library);
    }

function add_entry(path, tags)
    {
        /**************************
        * Initialize entry object
        **************************/
        var entry = new Entry(path, tags);
        entries.push(entry);
        
        add_entry_to_library(entry);
        add_entry_to_table(entry);
    }

function add_entry_to_table(entry)
    {
        /******************
        * Add table entry
        ******************/
        var table_entry =
            '<tr class="table_entry">'
          +     '<td>' + entry.title  + '</td>'
          +     '<td>' + entry.number + '</td>'
          +     '<td>' + entry.album  + '</td>'
          +     '<td>' + entry.genre  + '</td>'
          + '</tr>';
          
        
        track_table.append(table_entry);
        
        
        /*************************
        * Add double click event
        *************************/
        var last_tr        = $('#track_table tr').last()[0];
        last_tr.ondblclick = function(){ play(entry) };
        
        
        /***************
        * Reload audio
        ***************/
        //play(entry);
    }


/**********************************************************
* Execution
**********************************************************/
window.onload = function()
    {
        audio       = $('audio')[0];
        track_table = $('#track_table');
        
        add_button        = $('#add_button')[0];
        replay_button     = $('#replay_button')[0];
        replay_all_button = $('#replay_all_button')[0];
        
        library = jsonfile.readFileSync('library.json');
        
        
        /***************************************************
        * And entry to playlist and play when adding files
        ***************************************************/
        add_button.onchange = add_file;

        
        /****************************
        * Replay button click event
        ****************************/
        replay_button.onclick     = function(e) { audio.loop = !audio.loop; };
        replay_all_button.onclick = function(e) { replay_all = !replay_all; };

        
        /*********************************
        * Play next entry in the library
        *********************************/
        audio.onended = play_next_entry;

        
        /**************
        * Add library
        **************/
        for(var n = 0, len = library.length; n < len; n++)
            {
                add_entry_to_table(library[n]);
            }
    }