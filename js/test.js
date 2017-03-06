//test.js
const {remote}         = require('electron');
const {Menu, MenuItem} = remote;

const fs               = require('fs');
const $                = require('jquery');
const id3              = require('id3js');
const jsonfile         = require('jsonfile');

const request          = require('request');

const sort             = require('./js/sort.js');
const move             = require('./js/move.js');

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
var icecast_button;

var track_table;
var wiki_iframe;
var icecast_table;


/**********************************************************
* Global variables
**********************************************************/
var template = [];
var menu     = Menu.buildFromTemplate(template);

var library;
var entries = [];

var entry_playing = 0;
var current_tab   = 'local';


/*****************
* Global flags
*****************/
var SEARCH_COVER        = true;
var REPLAY_ALL          = false;
var SHUFFLE             = false;
var IS_CONTENT_EDITABLE = false;
var SEARCH_COVER        = true;


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

function load_library(lib)
    {
        for(var i = 0, len = lib.length; i < len; i++)
            {
                add_entry_to_table(lib[i]);
            }
    }

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

function set_cover(dir)
    {
        var cover = $('#cover')[0];        
        var files = fs.readdirSync(dir);
        
        /**************************************************
        * If there is a file including 'cover', choose it
        **************************************************/
        if(
            files.includes('cover.jpg')  ||
            files.includes('cover.jpeg') ||
            files.includes('cover.gif')  ||
            files.includes('cover.png')
          )
            {
                cover.src = dir + 'cover.jpg';
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
                        
                        var entry  = library[entry_playing];
                        
                        var search = entry.album  != 'No album'  ? entry.album  :
                                     entry.artist != 'No artist' ? entry.artist :
                                                                   false;
                        
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

function search_cover(data)
    {
        var match = data.match(/{"id".+?}/g);
        
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
                                        var dir  = library[entry_playing].dir;
                                        
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

function process_search(e)
    {
        if(e.key == 'Enter')
            {
                var text = search_input.val();
                search_input.val('');
        
                if(current_tab == 'local')
                    {
                        sort.filter(library, text);
                    }
                else if(current_tab == 'icecast')
                    {
                        get_xiph_dir(text);
                    }
            }
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
                        
                        wiki_iframe[0].src = url;
                        
                        track_table.hide();
                        icecast_table.hide();
                        
                        /***************************
                        * Hide right_td scroll bar
                        ***************************/
                        right_td.css('overflow', 'hidden');
                        wiki_iframe.show();
                    }
            });
    }


function parse_m3u(data)
    {
        console.log(data);
        
        audio.pause();
        audio.src = data;
        audio.play();
    }

function add_icecast_table(name, url, listeners, description, playing, m3u)
    {
        var tr =
            '<tr>'
            + '<td id="icecast_name">'        + name        + '</td>'
            + '<td id="icecast_description">' + description + '</td>'
            + '<td id="icecast_listeners">'   + listeners   + '</td>'
            + '<td id="icecast_playing">'     + playing     + '</td>'
            + '<td id="icecast_url">'         + url         + '</td>'
            + '<\tr>';

        icecast_table.append(tr);
        
        var last = $('#icecast_table tr').last();
        
        last[0].ondblclick = function(e) { $.get(m3u, parse_m3u); };
    }
    
function get_xiph_dir(search)
    {
        var url = 'http://dir.xiph.org/search?search='+search;
        
        $.get(url, parse_xiph_dir);
    }

function parse_xiph_dir(data)
    {
        data = data.replace(/\n/g, '');
        
        var rows = data.match(/<tr class="row\d+?">.+?<\/tr>/g);
        
        clear_table(icecast_table);
        
        for(var i = 0; i < rows.length; i++)
            {
                var xiph = 'http://dir.xiph.org';
                
                var url_name = rows[i].match(/<span class="name"><a href="(.+?)" onclick=".+?">(.+?)<\/a>/);
                var url  = url_name[1];
                var name = url_name[2];
                
                var listeners   = rows[i].match(/<span class="listeners">\[(\d+).+?<\/span>/);
                var description = rows[i].match(/<p class="stream-description">(.+?)<\/p>/);
                var playing     = rows[i].match(/<p class="stream-onair"><.+?>.+?<\/.+?>(.+?)<\/p>/);
                var m3u         = rows[i].match(/.+<a href="(.+?\.m3u)"/);
                
                listeners   = listeners   == null ? 'No listeners.'    : listeners[1];
                description = description == null ? 'No description.'  : description[1];
                playing     = playing     == null ? 'Playing nothing.' : playing[1];
                m3u         = m3u         == null ? 'No m3u.'          : xiph + m3u[1];
                
                
                add_icecast_table(name, url, listeners, description, playing, m3u);
            }
        
        //console.log(rows);
        
        //console.log(data);
        //fs.writeFileSync('page.txt', data);
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
        icecast_table     = $('#icecast_table');
        
        add_button        = $('#add_button')[0];
        back_button       = $('#back_button');
        play_button       = $('#play_button');
        next_button       = $('#next_button');
        replay_button     = $('#replay_button');
        replay_all_button = $('#replay_all_button');
        shuffle_button    = $('#shuffle_button');
        
        local_button      = $('#local_button');
        wiki_button       = $('#wiki_button');
        icecast_button    = $('#icecast_button');
        
        search_input      = $('#search_input');
        
        right_td          = $('#right_td');
        
        
        var n_header      = $('#n_header')[0];
        var title_header  = $('#title_header')[0];
        var artist_header = $('#artist_header')[0];
        var album_header  = $('#album_header')[0];
        var genre_header  = $('#genre_header')[0];
        
        
        library = jsonfile.readFileSync('library.json');
        
        
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
        n_header.onclick      = function(){ sort.library(library, 'number'); };
        title_header.onclick  = function(){ sort.library(library, 'title');  };
        artist_header.onclick = function(){ sort.library(library, 'artist'); };
        album_header.onclick  = function(){ sort.library(library, 'album');  };
        genre_header.onclick  = function(){ sort.library(library, 'genre');  };
        
        
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
                current_tab = 'local';
                
                wiki_iframe.hide();
                icecast_table.hide();
                
                right_td.css('overflow', 'scroll');
                track_table.show();
            };
        wiki_button[0].onclick = function()
            {
                current_tab = 'wikipedia';
                
                get_wiki_page( library[entry_playing].artist );
            };
        icecast_button[0].onclick = function()
            {
                current_tab = 'icecast';
                track_table.hide();
                wiki_iframe.hide();
                
                icecast_table.show();
            };

        search_input[0].onkeydown = process_search;

        
        /**************
        * Add library
        **************/
        load_library(library);
    }