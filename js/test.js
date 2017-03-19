//test.js

const {app} = require('electron').remote;
const {BrowserWindow} = require('electron').remote;

const {remote} = require('electron');
const {Menu}   = remote;

const fs       = require('fs');
const $        = require('jquery');
const id3      = require('id3js');
const jsonfile = require('jsonfile');

const request  = require('request');

const sort     = require('./js/sort.js');
const move     = require('./js/move.js');
const icecast  = require('./js/icecast.js');

const child_process = require('child_process');


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
const HEADER_BUTTON_NORMAL_COLOR = 'grey';

const TABLE_TR_COLOR_ODD   = 'white';
const TABLE_TR_COLOR_EVEN  = '#eeeeee';
const TABLE_TR_HOVER_COLOR = 'grey';


/**********************************************************
* Global element handlers
**********************************************************/
var title_bar;
var title_text;

var exit_icon;
var max_icon;
var min_icon;

var audio;
var progress_slider;
var progress_label;

var add_button;
var back_button;
var play_button;
var next_button;
var replay_button;
var replay_all_button;
var shuffle_button;

var local_button;
var wiki_button;
var icecast_button;

var search_input;

var right_el;
var right_td;

var track_table;
var wiki_iframe;
var icecast_table;


/**********************************************************
* Global variables
**********************************************************/
var template = [];
var menu     = Menu.buildFromTemplate(template);

var library;
var playlist;
var entries = [];

var entry_playing = 0;
var current_tab   = 'local';


/*****************
* Global flags
*****************/
var SEARCH_COVER        = false; ////true;
var REPLAY_ALL          = false;
var SHUFFLE             = false;
var IS_CONTENT_EDITABLE = false;

var CURRENT_ENTRY_INITIAL_COLOR = 'white';


/**********************************************************
* Functions
**********************************************************/

/**************************************************************
* Name        : get_index
* Description : Get library index from path
*
* Takes       : lib  (hash)   - Library to search into
*               path (string) - Path to get the index from
*
* Returns     : Nothing
* Notes       : Raises an error if it doesn't find the index
* TODO        : Nothing
**************************************************************/
function get_index(lib, path)
    {
        for(var n = 0, len = lib.length; n < len; n++)
            {
                if(path == lib[n].path)
                    {
                        return n;
                    }
            }
        
        throw 'Error: entry index doesnt exist.';
    }

/***************************************************
* Name        : format_time
* Description : Convert seconds to an mm/ss format
* Takes       : time (float/int) - Time in seconds
* Returns     : (string) - Time in mm/ss format
* Notes       : Nothing
* TODO        : Nothing
***************************************************/
function format_time(time)
    {
        var time_str = '';
        
        var m = parseInt( time / 60   ).toString();
        var s = parseInt( time-(60*m) ).toString();
        
        m = '00'.substr(m.length) + m;
        s = '00'.substr(s.length) + s;
        
        return m + ':' + s;
    }

/*****************************************************
* Name        : set_window_title
* Description : Shorthand for setting window's title
* Takes       : title (string) - Title to be set
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
*****************************************************/
function set_window_title(entry)
    {
        title_text.text( entry.artist + ' / ' + entry.album + ' - ' + entry.title );
    }


function set_tr_previous_color()
    {
        $(track_table.children()[0].children[entry_playing+1])
            .css('background-color', CURRENT_ENTRY_INITIAL_COLOR);
    }

/*********************************************************************
* Name        : toggle_editable
* Description : Toggles the contenteditable attribute of track_table
* Takes       : Nothing
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
*********************************************************************/
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


/********************************************
* Name        : edit_tag
* Description : Handler on tag editting end
* Takes       : e (obj) - Event
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
********************************************/
function edit_tag(e)
    {
        if(e.key == 'Enter')
            {
                e.preventDefault();
                e.target.blur();
            }
    }


/*********************************************
* Name        : edit_blur
* Description : Handler on tag edditing blur
* Takes       : e (obj) - Event
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Everything
*********************************************/
function edit_blur(e)
    {
        
    }


/***************************************************************************
* Name        : add_file
*
* Description : Read files from add_button, read the id3 tags and add them
*               to the table and library
*
* Takes       : e (obj) - Event
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
***************************************************************************/
function add_file(e)
    {
        var path = add_button.files[0].path;
        
        read_tags(path);
    }


/*************************************
* Name        : drop_file
* Description : Handler on file drop
* Takes       : e (obj) - Event
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
*************************************/
function drop_file(e)
    {
        e.preventDefault();
        
        for(var i = 0; i < e.dataTransfer.files.length; i++)
            {
                var path = e.dataTransfer.files[i].path;
                
                read_tags(path);
            }
    }
        

/************************************************************
* Name        : read_tags
* Description : Read id3 tags from path and add it to table
* Takes       : path (str) - Path to the file
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
************************************************************/
function read_tags(path)
    {
        id3
            (
                { file: path, type: id3.OPEN_LOCAL },
                function(err, tags) { add_entry(path, tags); }
            )
    }

/************************************************
* Name        : add_folder
* Description : TODO
* Takes       : path (str) - Path to the folder
* Returns     : TODO
* Notes       : TODO
* TODO        : Everything
************************************************/
function add_folder(path)
    {
        /** TODO **/
    }


/*************************************************
* Name        : save_library
* Description : Shorthand for saving the library
* Takes       : Nothing
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
*************************************************/
function save_library()
    {
        jsonfile.writeFileSync('library.json', library);
    }


/**************************************************************
* Name        : remove_entry
* Description : Remove entry from track_table and the library
* Takes       : entry (hash) - Entry to be removed
* Returns     : Nothing
* Notes       : Nothing
* TODO        : Nothing
**************************************************************/
function remove_entry(entry)
    {
        /**************************************************
        * Remove entries index from library and save json
        **************************************************/
        var n = get_index(library, entry.path);
        
        library.splice(n, 1);
        $('#track_table tr')[n+1].remove(); // 0 index is header
        
        save_library();
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function show_entry_context_menu(e, entry)
    {
        var target = e.target;
        
        template =
            [
                {
                    label: 'Add folder',
                    click() { alert('Not implemented yet.'); }
                },
                {
                    label: 'Open file location',
                    click() { child_process.exec( 'explorer "' + entry.dir + '"' ); }
                },
                {
                    label: 'Reload library',
                    click() { alert('Not implemented yet.') }
                },
                {
                    label: 'Open wikipedia page',
                    click() { get_wiki_page(entry.artist) }
                },
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


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function play(entry)
    {
        /********************
        * Get library index
        ********************/
        entry_playing = get_index(playlist, entry.path);
        
        
        /*****************************
        * Set new path and play file
        *****************************/
        audio.pause();
        audio.src = entry.path;
        
        
        /****************************
        * Set color on entry change
        ****************************/
        CURRENT_ENTRY_INITIAL_COLOR = entry_playing % 2 == 0
            ? TABLE_TR_COLOR_EVEN
            : TABLE_TR_COLOR_ODD;

        $(track_table.children()[0].children[entry_playing+1])
            .css('background-color', TABLE_TR_HOVER_COLOR);
        
        
        set_window_title(entry);
        
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


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function play_next_entry()
    {
        set_tr_previous_color();
        
        var index;
        
        /**********************************************************************************
        * If it's the last track check for REPLAY_ALL and go to the first one, else go on
        **********************************************************************************/
        index = SHUFFLE    ? parseInt( Math.random()*playlist.length ) :
                REPLAY_ALL ? (entry_playing + 1) % playlist.length     :
                             (entry_playing + 1);
        
        if(index >= 0 && index < playlist.length)
            {
                play( playlist[index] );
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function play_previous_entry()
    {
        set_tr_previous_color();
        
        if( entry_playing-1 >= 0 )
            {
                play( playlist[entry_playing - 1] );
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function update_progress(e)
    {
        var time     = audio.currentTime;
        var duration = audio.duration;
        
        progress_slider.value = (time*100)/duration;
        progress_label.text( format_time(time) + ' / ' + format_time(duration) );
        //setTimeout( update_progress, 100 );
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function load_library(lib)
    {
        for(var i = 0, len = lib.length; i < len; i++)
            {
                add_entry_to_table(lib[i]);
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function clear_table(table)
    {
        /********************
        * Children of tbody
        ********************/
        var entries = $( table.children()[0] ).children();
        
        
        /****************
        * Leave headers
        ****************/
        for(var i = 1; i < entries.length; i++)
            {
                entries[i].remove();
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function reload_library(lib, table)
    {
        /*********************
        * Remove all entries
        *********************/
        clear_table(table);
        
        
        /************************
        * Add all entries again
        ************************/
        load_library(lib);

        
        /******************************
        * So that the next entry is 0
        ******************************/
        entry_playing = -1;
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
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


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
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
        
        last_tr.on('dblclick',    function(e) { set_tr_previous_color(); play(entry); } );
        last_tr.on('contextmenu', function(e) { show_entry_context_menu(e, entry); } );
        
        last_tr.children().on('keydown', edit_tag);
        last_tr.children().on('blur', edit_blur);
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function set_cover(dir)
    {
        var cover = $('#cover')[0];        
        var files = fs.readdirSync(dir);
        
        /**************************************************
        * If there is a file including 'cover', choose it
        **************************************************/
        if(
               files.includes('cover.jpg')  || files.includes('Cover.jpg')
            || files.includes('cover.jpeg') || files.includes('Cover.jpeg')
            || files.includes('cover.gif')  || files.includes('Cover.gif')
            || files.includes('cover.png')  || files.includes('Cover.png')
          )
            {
                var name = '';
                
                for(var i = 0; i < files.length; i++)
                    {
                        if( files[i].match(/cover/i) ) { name = files[i]; }
                    }
                
                cover.src = dir + name;
            }
        else
            {
                /*********************************************
                * Else search for any image in the directory
                *********************************************/
                for(var i = 0; i < files.length; i++)
                    {
                        if( files[i].match( /jpg|jpeg|gif|png$/ ) )
                            {
                                cover.src = dir + files[i];
                                
                                return;
                            }
                    }
                
                
                /**************************************************************
                * If no image is found, set it to null or search it in google
                **************************************************************/
                if(SEARCH_COVER)
                    {
                        cover.src = '';
                        
                        var entry  = playlist[entry_playing];
                        
                        var search =
                            ( !entry.album || entry.album == 'No album' )
                                ? ''
                                : entry.album
                            +
                            ( !entry.album || entry.artist == 'No artist' )
                                ? ''
                                : entry.artist;

                        
                        if(!search) { return; }
                        
                        search = (search+' cover').split(' ').join('+');
                        
                        var url = 'https://www.google.com/search?q='+search+'&tbm=isch';
                        $.get(url, search_cover);
                    }
                else
                    {
                        cover.src = '';
                    }
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function search_cover(data)
    {
        var match = data.match(/{"id".+?}/g);
        
        if(!match)
            {
                console.log('Cant find regex inside search.');
                return;
            }
        
        for(var i = 0; i < match.length; i++)
            {
                /************************
                * Parse image data hash
                ************************/
                var json = JSON.parse(match[i]);
                
                var height = json.oh;
                var width  = json.ow;
                var source = json.ou;
                
                
                /**********************************
                * If it has a ratio of around 1:1
                **********************************/
                if( Math.abs( 1 - height / width ) < 0.2 )
                    {
                        request.head(source, function(err, res, body)
                            {
                                var type   = res.headers['content-type'];
                                var length = res.headers['content-length'];
                                
                                /******************************************
                                * If it's correct and has a size of <10mb
                                ******************************************/
                                if(res.statusCode == 200 && length < 10*1024*1024)
                                    {
                                        var name = 'cover.' + type.match(/.+\/(.+)/)[1];
                                        var dir  = playlist[entry_playing].dir;
                                        
                                        /*********************************************************
                                        * Download to root directory then move it to the entry's
                                        *********************************************************/
                                        request(source).pipe( fs.createWriteStream(name) );
                                        
                                        move
                                            (
                                                './' + name,
                                                dir + '\\' + name,
                                                function(err) { console.log(err); }
                                            );
                                        
                                        
                                        cover.src = dir+'\\'+name;
                                    }
                            });
                        
                        
                        return true;
                    }
            }

        
        return false;
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
function process_search(e)
    {
        var text = search_input.val();
        
        if(current_tab == 'local')
            {
                playlist = sort.filter(library, text);
            }
        else if(current_tab == 'icecast' && e.key == 'Enter')
            {
                icecast.search(text);
            }
    }


/***********************************
* Name        :
* Description :
* Takes       :
* Returns     :
* Notes       :
* TODO        :
***********************************/
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
                        
                        var win = new BrowserWindow
                            ({
                                width: 1000,
                                height: 600,
                                autoHideMenuBar: true
                            }).loadURL(url);
                        /*
                        wiki_iframe[0].src = url;
                        
                        right_el.hide();
                        
                        ***************************
                        * Hide right_td scroll bar
                        ***************************
                        right_td.css('overflow', 'hidden');
                        wiki_iframe.show();
                        */
                    }
            });
    }


/**********************************************************
* Execution
**********************************************************/
window.onload = function()
    {
        title_bar         = $('#title_bar');
        title_text        = $('#title_text');
        
        exit_icon        = $('#title_exit_icon');
        max_icon         = $('#title_max_icon');
        min_icon         = $('#title_min_icon');
        
        audio             = $('audio')[0];
        progress_slider   = $('#progress_slider')[0];
        progress_label    = $('#progress_label');
        
        track_table       = $('#track_table');
        wiki_iframe       = $('#wiki_iframe');
        icecast_table     = $('#icecast_table');
        
        add_button        = $('#add_button')[0];
        back_button       = $('#back_button');
        play_button       = $('#play_button');
        next_button       = $('#next_button');
        replay_button     = $('#replay_button');
        replay_all_button = $('#replay_all_button');
        shuffle_button    = $('#shuffle_button');
        config_button     = $('#config_button');
        
        local_button      = $('#local_button');
        wiki_button       = $('#wiki_button');
        icecast_button    = $('#icecast_button');
        
        search_input      = $('#search_input');
        
        right_td          = $('#right_td');
        right_el          = $('.right_el');
        
        
        var n_header      = $('#n_header');
        var title_header  = $('#title_header');
        var artist_header = $('#artist_header');
        var album_header  = $('#album_header');
        var genre_header  = $('#genre_header');
        
        
        library  = jsonfile.readFileSync('library.json');
        playlist = library;
        
        
        /***************************************************
        * And entry to playlist and play when adding files
        ***************************************************/
        //add_button.onchange = add_file;
        
        
        /******************
        * Exit icon event
        ******************/
        exit_icon.on
            (
                'click',
                function() { app.quit() }
            );
        
        
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
                
                replay_button.css
                    (
                        'background-color',
                        audio.loop == true ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR
                    );
            });
        replay_all_button.on('click', function(e)
            {
                REPLAY_ALL = !REPLAY_ALL;
                
                replay_all_button.css
                    (
                        'background-color',
                        REPLAY_ALL ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR
                    );
            });


        /*****************
        * Shuffle button
        *****************/
        shuffle_button.on('click', function(e)
            {
                SHUFFLE = !SHUFFLE;
                
                shuffle_button.css
                    (
                        'background-color',
                        SHUFFLE ? HEADER_BUTTON_PUSHED_COLOR : HEADER_BUTTON_NORMAL_COLOR
                    );
            });

        
        /*******************
        * Play/stop button
        *******************/
        play_button.on('click', function(e)
            {
                audio.paused ? audio.play() : audio.pause();
            });

        /****************
        * Config button
        ****************/
        config_button.on('click', function(e)
            {
                alert('Not yet implemented.');
            });

        
        /*****************************
        * Sort table on header click
        *****************************/
        n_header.on      ( 'click', function(){ sort.library(playlist, 'number'); } );
        title_header.on  ( 'click', function(){ sort.library(playlist, 'title');  } );
        artist_header.on ( 'click', function(){ sort.library(playlist, 'artist'); } );
        album_header.on  ( 'click', function(){ sort.library(playlist, 'album');  } );
        genre_header.on  ( 'click', function(){ sort.library(playlist, 'genre');  } );
        
        
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
                play_button[0].src = 'icons/media-pause-3x.png';
            };
        audio.onpause = function(e)
            {
                play_button[0].src = 'icons/media-play-3x.png';
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
        local_button.on('click', function()
            {
                current_tab = 'local';
                
                right_el.hide();
                
                right_td.css('overflow', 'scroll');
                track_table.show();
            });
        wiki_button.on('click', function()
            {
                current_tab = 'wikipedia';
                
                get_wiki_page( playlist[entry_playing].artist );
            });
        icecast_button.on('click', function()
            {
                current_tab = 'icecast';
                
                right_el.hide();
                icecast_table.show();
            });

        search_input.on('keyup', process_search);

        
        /**************
        * Add library
        **************/
        load_library(library);
    }