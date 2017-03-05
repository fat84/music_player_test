//test.js
const {remote}         = require('electron');
const {Menu, MenuItem} = remote;

const fs               = require('fs');
const $                = require('jquery');
const id3              = require('id3js');
const jsonfile         = require('jsonfile');

const request          = require('request');

/************************************************************************
* Notes and TODO
*
*   - It only read id3v2 tags, not id3v1 tags, add id3v1 tags as backup
*   - It might be neccesary a e.preventDefault() on context menu
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
const HEADER_BUTTON_PUSHED_COLOR = '#dddddd';
const HEADER_BUTTON_NORMAL_COLOR = '#ffffff';


/**********************************************************
* Global element handlers
**********************************************************/
var audio;
var progress_slider;
var progress_label;

var add_button;
var replay_button;
var replay_all_button;
var shuffle_button;

var local_button;
var wiki_button;

var track_table;
var wiki_iframe;


/**********************************************************
* Global variables
**********************************************************/
var template = [];
var menu     = Menu.buildFromTemplate(template);

var library;
var entries = [];

var entry_playing = 0;


/*****************
* Global flags
*****************/
var SEARCH_COVER        = true;
var REPLAY_ALL          = false;
var SHUFFLE             = false;
var IS_CONTENT_EDITABLE = false;

var SHUFFLE_DIR         = 1;
var LAST_SHUFFLE        = 'none';


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

function format_time(time)
    {
        var time_str = '';
        
        var m = parseInt( time / 60   ).toString();
        var s = parseInt( time-(60*m) ).toString();
        
        m = '00'.substr(m.length) + m;
        s = '00'.substr(s.length) + s;
        
        return m + ':' + s;
    }

function parse_data(data, callback)
    {
        //var parser = new DOMParser();
        //var el     = parser.parseFromString(data, 'text/html');
        
        //console.log( $('<html>').html(data).contents());
    }

function set_window_title(title)
    {
        window.document.title = title;
    }

function toggle_editable()
    {
        IS_CONTENT_EDITABLE = !IS_CONTENT_EDITABLE;
        
        $('#track_table td').attr
            (
                'contenteditable',
                IS_CONTENT_EDITABLE
            );

        if(IS_CONTENT_EDITABLE == false)
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

function add_headers()
    {
        track_table[0].innerHTML =
            '<table id="track_table" cellspacing="0">'
            '    <tr>'
            '        <th class="track_table_n_col">n</th>'
            '        <th class="track_table_title_col">Title</th>'
            '        <th class="track_table_artist_col>Artist</th>'
            '        <th class="track_table_album_col">Album</th>'
            '        <th class="track_table_genre_col">Genre</th>'
            '    </tr>';
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
                    label: IS_CONTENT_EDITABLE ? 'Edit and save' : 'Edit',
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
        
        
        /*****************************
        * Set new path and play file
        *****************************/
        audio.src = entry.path;
        
        set_window_title(entry.artist + ' - ' + entry.title);
        
        set_cover(entry.dir);
        
        
        /**********************
        * Set progress slider
        **********************/
        progress_slider.min   = 0;
        progress_slider.max   = audio.duration;
        progress_slider.value = 0;
        
        
        /*************
        * Play track
        *************/
        audio.play();
    }

function play_next_entry()
    {
        /**********************************************************************************
        * If it's the last track check for REPLAY_ALL and go to the first one, else go on
        **********************************************************************************/
        if( (entry_playing+1 < library.length) || (REPLAY_ALL == true) )
            {
                entry_playing = SHUFFLE ? parseInt(Math.random()*library.length) : entry_playing+1;
                if(REPLAY_ALL) { entry_playing %= library.length; }
                
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

function update_progress(e)
    {
        var time     = audio.currentTime;
        var duration = audio.duration;
        
        progress_slider.value = (time*100)/duration;
        progress_label.text( format_time(time) + ' / ' + format_time(duration) );
        //setTimeout( update_progress, 100 );
    }

function load_library()
    {
        for(var i = 0, len = library.length; i < len; i++)
            {
                add_entry_to_table(library[i]);
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
        jsonfile.writeFileSync('./library.json', library);
        
        
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

function sort_down(a, b, el)
    {
        a = a[el].toLowerCase();
        b = b[el].toLowerCase();
        
        return a < b ? -1 :
               a > b ?  1 :
                        0;
    }

function sort_up(a, b, el)
    {
        a = a[el].toLowerCase();
        b = b[el].toLowerCase();
        
        return a > b ? -1 : 
               a < b ?  1 :
                        0;
    }

function sort_library(el)
    {
        if(el == LAST_SHUFFLE)
            {
                SHUFFLE_DIR = -SHUFFLE_DIR;
            }
        else
            {
                SHUFFLE_DIR  = -1;
                LAST_SHUFFLE = el;
            }
        
        library.sort( function(a, b)
            {
                return SHUFFLE_DIR == -1 ? sort_down(a, b, el) :
                       SHUFFLE_DIR ==  1 ? sort_up(a, b, el)   :
                                   false;
            });
        
        
        /********************
        * Children of tbody
        ********************/
        var entries = $( track_table.children()[0] ).children();
        
        
        /****************
        * Leave headers
        ****************/
        for(var i = 1; i < entries.length; i++)
            {
                entries[i].remove();
            }
        
        
        /************************
        * Add all entries again
        ************************/
        for(var i = 0, len = library.length; i < len; i++)
            {
                add_entry_to_table(library[i]);
            }

        
        /******************************
        * So that the next entry is 0
        ******************************/
        entry_playing = -1;
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
                
                if(SEARCH_COVER)
                    {
                        var url = 'https://www.google.com/search?q=flcl+ost+cover&tbm=isch';
                        request(url, search_cover);
                    }
                
                cover.src = '';
            }
    }

function search_cover(err, res, body)
    {
        //var album = library[entry_playing].album;
        //if(album == 'No Album') { return; }
        
        var match = body.match(/<img.+?>/g)
                    .map( function(img) { return img.match(/height="(.+?)" src="(.+?)" width="(.+?)"/) } );
        
        var match2 = body.match(/<img.+?>/g);
        
        //console.log(match);
        //console.log(match2);
    }

function get_wiki_page(artist)
    {
        var action    = 'opensearch';
        var search    = artist;
        var limit     = '1';
        var namespace = '0';
        var format    = 'json';

        var url = 'https://en.wikipedia.org/w/api.php?'
                + 'action='     + action
                + '&search='    + search
                + '&limit='     + limit
                + '&namespace=' + namespace
                + '&format='    + format;

        url = encodeURI(url);

        
        request(url, function(err, res, body)
            {
                body = JSON.parse(body);
                
                if(body[1][0] == '')
                    {
                        alert('Artist not found.');
                    }
                else
                    {
                        var url = body[3][0];
                        //console.log(url);
                        
                        wiki_iframe[0].src = url;
                        
                        track_table.hide();
                        
                        /***************************
                        * Hide right_td scroll bar
                        ***************************/
                        right_td.css('overflow', 'hidden');
                        wiki_iframe.show();
                    }
            });
    }


/**********************************************************
* Execution
**********************************************************/
window.onload = function()
    {
        audio             = $('audio')[0];
        progress_slider   = $('#progress_slider')[0];
        progress_label    = $('#progress_label');
        
        track_table       = $('#track_table');
        wiki_iframe       = $('#wiki_iframe');
        
        add_button        = $('#add_button')[0];
        back_button       = $('#back_button');
        play_button       = $('#play_button');
        next_button       = $('#next_button');
        replay_button     = $('#replay_button');
        replay_all_button = $('#replay_all_button');
        shuffle_button    = $('#shuffle_button');
        
        local_button      = $('#local_button');
        wiki_button       = $('#wiki_button');
        
        right_td = $('#right_td');
        
        
        var n_header      = $('#n_header')[0];
        var title_header  = $('#title_header')[0];
        var artist_header = $('#artist_header')[0];
        var album_header  = $('#album_header')[0];
        var genre_header  = $('#genre_header')[0];
        
        
        library = jsonfile.readFileSync('library.json');
        
        
        //request('https://www.google.com/search?q=flcl+ost+cover&tbm=isch', search_cover);
        
        
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
                    audio.loop == true ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR;
            });
        replay_all_button.on('click', function(e)
            {
                REPLAY_ALL = !REPLAY_ALL;
                
                replay_all_button[0].style.background =
                    REPLAY_ALL ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR;
            });


        /*****************
        * Shuffle button
        *****************/
        shuffle_button.on('click', function(e)
            {
                SHUFFLE = !SHUFFLE;
                
                shuffle_button[0].style.background =
                    SHUFFLE ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR;
            });

        
        /*******************
        * Play/stop button
        *******************/
        play_button.on('click', function(e)
            {
                audio.paused ? audio.play() : audio.pause();
            });

        
        /*****************************
        * Sort table on header click
        *****************************/
        n_header.onclick      = function(){ sort_library('number'); };
        title_header.onclick  = function(){ sort_library('title');  };
        artist_header.onclick = function(){ sort_library('artist'); };
        album_header.onclick  = function(){ sort_library('album');  };
        genre_header.onclick  = function(){ sort_library('genre');  };
        
        
        /************
        * File drop
        ************/
        right_td[0].ondragover = function(e){ e.preventDefault(); }
        right_td[0].ondrop     = drop_file;
        
        
        /*********************************
        * Play next entry in the library
        *********************************/
        audio.controls = false;        
        audio.onended  = play_next_entry;
        
        audio.onplay  = function(e)
            {
                play_button.children()[0].src =
                    'file:///C:/users/alvaro/documents/javascript/music_player/icons/media-pause-3x.png';
            };
        audio.onpause = function(e)
            {
                play_button.children()[0].src =
                    'file:///C:/users/alvaro/documents/javascript/music_player/icons/media-play-3x.png';
            };
        
        audio.ontimeupdate = update_progress;
        
        audio.onerror = function(e)
            {
                var code = e.target.error.code;
                
                console.log('Error: ', e.target.error);
                
                /******************************
                * Error 4: File doesn't exist
                ******************************/
                if(code == 4)
                    {
                        alert('Error loading file.');
                    }
            };
        
        
        /******************
        * Progress slider
        ******************/
        progress_slider.step = 0.01;
        
        progress_slider.onchange = function(e)
            {
                audio.currentTime = audio.duration/100 * e.target.value;
            };
        
        progress_label.text('00:00 / 00:00');
        
        
        /********************
        * Left menu buttons
        ********************/
        local_button[0].onclick = function()
            {
                wiki_iframe.hide();
                
                right_td.css('overflow', 'scroll');
                track_table.show();
            };
        
        wiki_button[0].onclick = function()
            {
                get_wiki_page( library[entry_playing].artist );
            }

        
        /**************
        * Add library
        **************/
        load_library();
    }