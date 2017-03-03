//test.js
const {BrowserWindow}  = require('electron');
const {remote}         = require('electron');
const {Menu, MenuItem} = remote;

const fs               = require('fs');
const $                = require('jquery');
const id3              = require('id3js');
const jsonfile         = require('jsonfile');


/************************************************************************
* Notes and TODO
*
*   - It only read id3v2 tags, not id3v1 tags, add id3v1 tags as backup
*   - There might be neccesary a e.preventDefault() on context menu
*   - Save to library on blur and to library on context menu
*
************************************************************************/


/**********************************************************
* Classes
**********************************************************/
function Entry(path, tags)
    {
        this.title    = tags.title    || 'No title';
        this.number   = tags.v2.track || 'No n';
        this.artist   = tags.artist   || 'No artist';
        this.album    = tags.album    || 'No album';
        this.duration = 0;
        
        this.genre    = tags.v2.genre || 'No genre';
        this.year     = tags.year     || 'No year';
        
        this.name     = path; /** Note: Path, not file name **/
        this.bitrate  = 0;
        this.size     = 0;
        this.format   = '';
        
        this.dir      = path.match(/(.+)\\/)[0];
        this.path     = path;
    }


/**********************************************************
* Constants
**********************************************************/
const HEADER_HEIGHT = '60px';

const HEADER_BUTTON_TRUE_COLOR  = '#dddddd';
const HEADER_BUTTON_FALSE_COLOR = '#ffffff';


/**********************************************************
* Global variables
**********************************************************/
var template = [];
var menu     = Menu.buildFromTemplate(template);

var library;
var entries = [];

var audio;
var track_table;

var add_button;
var replay_button;
var replay_all_button;

var entry_playing = 0;
var replay_all    = false;

var is_content_editable = false;


/**********************************************************
* Functions
**********************************************************/
function get_index(path)
    {
        for(var n = 0, len = library.length; n < len; n++)
            {
                if(path == library[n].path)
                    {
                        return n;
                    }
            }
        
        throw 'Error: entry index doesnt exist.';
    }

function set_window_title(title)
    {
        window.document.title = title;
    }

function toggle_editable()
    {
        is_content_editable = !is_content_editable;
        
        $('#track_table td').attr
            (
                'contenteditable',
                is_content_editable
            );

        if(is_content_editable == false)
            {
                //save_library();
            }
    }

function edit_tag(e)
    {
        if(e.key == 'Enter')
            {
                e.preventDefault();
                e.target.blur();
            }
    }

function edit_blur(e)
    {
        
    }

function add_file(e)
    {
        var path = add_button.files[0].path;
        
        read_tags(path);
    }

function drop_file(e)
    {
        e.preventDefault();
        
        for(var i = 0; i < e.dataTransfer.files.length; i++)
            {
                var path = e.dataTransfer.files[i].path;
                
                read_tags(path);
            }
    }
        
function read_tags(path)
    {
        id3
            (
                { file: path, type: id3.OPEN_LOCAL },
                function(err, tags) { add_entry(path, tags); }
            )
    }

function add_folder(path)
    {
        /** TODO **/
    }

function save_library()
    {
        jsonfile.writeFileSync('library.json', library);
    }

function remove_entry(entry)
    {
        /**************************************************
        * Remove entries index from library and save json
        **************************************************/
        var n = get_index(entry.path);
        
        library.splice(n, 1);
        $('#track_table tr')[n+1].remove(); // 0 index is header
        
        save_library();
    }

function show_entry_context_menu(e, entry)
    {
        var target = e.target;
        
        template =
            [
                {
                    label: 'Remove',
                    click() { remove_entry(entry); }
                },
                {
                    label: is_content_editable ? 'Edit and save' : 'Edit',
                    click() { toggle_editable(); }
                }
            ];
            
        menu = Menu.buildFromTemplate(template);
        menu.popup(remote.getCurrentWindow());
    }

function play(entry)
    {
        /********************
        * Get library index
        ********************/
        entry_playing = get_index(entry.path);
        
        
        audio.pause();
        
        set_window_title(entry.artist + ' - ' + entry.title);
        
        set_cover(entry.dir);
        
        
        /*****************************
        * Set new path and play file
        *****************************/
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
                
                play( library[entry_playing] );
            }
    }

function play_previous_entry()
    {
        if( entry_playing-1 >= 0 )
            {
                entry_playing--;
                
                play( library[entry_playing] );
            }
    }

function load_library()
    {
        for(var n = 0, len = library.length; n < len; n++)
            {
                add_entry_to_table(library[n]);
            }
    }

function add_entry(path, tags)
    {
        /**************************
        * Initialize entry object
        **************************/
        var entry = new Entry(path, tags);
        entries.push(entry);
        
        
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
        
        
        /*********************
        * Add entry to table
        *********************/
        add_entry_to_table(entry);
    }

function add_entry_to_table(entry)
    {
        /******************
        * Add table entry
        ******************/
        var table_entry =
            '<tr class="table_entry">'
          +     '<td class="track_table_n_col">'      + entry.number + '</td>'
          +     '<td class="track_table_title_col">'  + entry.title  + '</td>'
          +     '<td class="track_table_artist_col">' + entry.artist + '</td>'
          +     '<td class="track_table_album_col">'  + entry.album  + '</td>'
          +     '<td class="track_table_genre_col">'  + entry.genre  + '</td>'
          + '</tr>';
          
        
        track_table.append(table_entry);
        
        
        /***********************************************
        * Add double click event and right click event
        ***********************************************/
        var last_tr = $('#track_table tr').last();
        
        last_tr[0].ondblclick    = function(e) { play(entry) };
        last_tr[0].oncontextmenu = function(e) { show_entry_context_menu(e, entry); };
        
        last_tr.children().on('keydown', edit_tag);
        last_tr.children().on('blur', edit_blur);
    }

function set_cover(dir)
    {
        var cover = $('#cover')[0];        
        var files = fs.readdirSync(dir);
        
        if( files.includes('cover.jpg') || files.includes('cover.png') )
            {
                cover.src = dir + 'cover.jpg';
            }
        else
            {
                for(var i = 0; i < files.length; i++)
                    {
                        if( files[i].match( /jpg|gif|png$/ ) )
                            {
                                cover.src = dir + files[i];
                                
                                return;
                            }
                    }
                
                cover.src = '';
            }
    }


/**********************************************************
* Execution
**********************************************************/
window.onload = function()
    {
        audio             = $('audio')[0];
        track_table       = $('#track_table');
        
        add_button        = $('#add_button')[0];
        back_button       = $('#back_button');
        play_button       = $('#play_button');
        next_button       = $('#next_button');
        replay_button     = $('#replay_button');
        replay_all_button = $('#replay_all_button');
        
        library = jsonfile.readFileSync('library.json');
        
        
        var track_table_td = $('#track_table_td')[0];
        
        
        /***************************************************
        * And entry to playlist and play when adding files
        ***************************************************/
        //add_button.onchange = add_file;
        
        
        /****************************
        * Previous and next buttons
        ****************************/
        back_button.on('click', function(e)
            {
                play_previous_entry();
            });
        next_button.on('click', function(e)
            {
                play_next_entry();
            });

        
        /****************************
        * Replay button click event
        ****************************/
        replay_button.on('click', function(e)
            {
                audio.loop = !audio.loop;
                
                replay_button[0].style.background =
                    audio.loop == true ? HEADER_BUTTON_TRUE_COLOR : HEADER_BUTTON_FALSE_COLOR;
            });
        replay_all_button.on('click', function(e)
            {
                replay_all = !replay_all;
                
                replay_all_button[0].style.background =
                    replay_all == true ? HEADER_BUTTON_TRUE_COLOR : HEADER_BUTTON_FALSE_COLOR;
            });

        
        /*******************
        * Play/stop button
        *******************/
        play_button.on('click', function(e)
            {
                audio.paused ? audio.play() : audio.pause();
            });

        
        /************
        * File drop
        ************/
        track_table_td.ondragover = function(e){ e.preventDefault(); }
        track_table_td.ondrop     = drop_file;
        
        
        /*********************************
        * Play next entry in the library
        *********************************/
        audio.controls = false;
        
        audio.onended = play_next_entry;
        
        audio.onplay  = function(e)
            {
                play_button.children()[0].src =
                    'file:///C:/users/alvaro/documents/javascript/music_player/icons/media-pause-3x.png';
            }
        audio.onpause = function(e)
            {
                play_button.children()[0].src =
                    'file:///C:/users/alvaro/documents/javascript/music_player/icons/media-play-3x.png';
            }

        
        /**************
        * Add library
        **************/
        load_library();
    }