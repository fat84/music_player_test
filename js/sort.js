/*************************
* Sort related functions
*************************/

function Sort()
    {
        this.dir  = 1;
        this.last = 'none'        
        
        this.down      = down;
        this.up        = up;
        this.sort      = sort;
        this.slice     = slice;
        this.by_el     = by_el;
        this.by_genre  = by_genre;
        this.by_artist = by_artist;
        this.by_album  = by_album;
        this.by_title  = by_title;
        this.by_number = by_number;
        
        this.library   = library;
        
        this.filter    = filter;
    }

module.exports = new Sort();


function down(a, b, el)
    {
        a = a[el].toLowerCase();
        b = b[el].toLowerCase();
        
        return a < b ? -1 :
               a > b ?  1 :
                        0;
    }

function up(a, b, el)
    {
        a = a[el].toLowerCase();
        b = b[el].toLowerCase();
        
        return a > b ? -1 : 
               a < b ?  1 :
                        0;
    }

function sort(arr, el)
    {
        arr.sort( function(a, b)
            {
                return this.dir == -1 ? sort_down(a, b, el) :
                       this.dir ==  1 ? sort_down(a, b, el) :
                                        false;
            });
    }

function slice(arr, a, b, el, dir)
    {
        var temp;
        
        if(dir == -1)
            {
                for(var i = a; i < b; i++)
                    {
                        for(var j = i+1; j < b; j++)
                            {
                                if(
                                    /**
                                    (Number.isInteger(arr[i][el]) && Number.isInteger(arr[j][el])) ?
                                        (
                                            arr[i][el] > arr[j][el]
                                        ) :
                                    **/
                                        (
                                            arr[i][el].toString().toLowerCase().trim() >
                                            arr[j][el].toString().toLowerCase().trim()
                                        )
                                  )
                                    {
                                        temp   = arr[i];
                                        arr[i] = arr[j];
                                        arr[j] = temp;
                                    }
                            }
                    }
            }
        else if(dir == 1)
            {
                for(var i = a; i < b; i++)
                    {
                        for(var j = i+1; j < arr.length; j++)
                            {
                                if(arr[i][el].toString().toLowerCase() < arr[j][el].toString().toLowerCase())
                                    {
                                        temp   = arr[i];
                                        arr[i] = arr[j];
                                        arr[j] = temp;
                                    }
                            }
                    }
            }
    }

function by_el(lib, el_1, el_2)
    {
        var a = 0;
        var b = 0;
        var prev_el = lib[0][el_1];
        
        for(var i = 0; i < lib.length; i++)
            {
                if(lib[i][el_1] != prev_el)
                    {
                        prev_el = lib[i][el_1];
                        
                        this.slice(lib, a, b, el_2, -1);
                        
                        a = i;
                    }
                
                b++;
            }
    }

function by_genre(lib)
    {
        this.slice(lib, 0, lib.length, 'genre', this.dir);
        this.by_el(lib, 'genre',  'artist');
        this.by_el(lib, 'artist', 'album' );
        this.by_el(lib, 'album',  'number');
    }

function by_artist(lib)
    {
        this.slice(lib, 0, lib.length, 'genre', this.dir);
        this.by_el(lib, 'artist', 'album');
        this.by_el(lib, 'album', 'number');
    }

function by_album(lib)
    {
        this.slice(lib, 0, lib.length, 'album', this.dir);
        this.by_el(lib, 'album', 'number');
    }

function by_title(lib)
    {
        this.slice(lib, 0, lib.length, 'title', this.dir);
    }

function by_number(lib)
    {
        this.slice(lib, 0, lib.length, 'number', this.dir);
    }

function library(lib, el)
    {
        if(el == this.last)
            {
                this.dir = -this.dir;
            }
        else
            {
                this.dir  = -1;
                this.last = el;
            }
        
        
        /*****************************
        * n < album < artist < genre
        *****************************/
        if     (el == 'genre'  ) { this.by_genre (lib); }
        else if(el == 'artist' ) { this.by_artist(lib); }
        else if(el == 'album'  ) { this.by_album (lib); }
        else if(el == 'title'  ) { this.by_title (lib); }
        else if(el == 'number' ) { this.by_number(lib); }
        
        
        reload_library(lib, track_table);
    }

function filter(lib, text)
    {
        var lib_filter = [];
        
        var regexp = new RegExp(text, 'i');
        
        for(var i = 0; i < lib.length; i++)
            {
                if(
                    lib[i].title.match(regexp)  ||
                    lib[i].artist.match(regexp) ||
                    lib[i].album.match(regexp)  ||
                    lib[i].genre.match(regexp)
                  )
                    {
                        lib_filter.push(lib[i]);
                    }
            }
            
        clear_table(track_table);
        reload_library(lib_filter, track_table);
    }