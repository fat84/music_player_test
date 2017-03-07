/****************************
* Icecast related functions
****************************/

function Icecast()
    {
        this.search = search;
    }

module.exports = new Icecast();


function _add_to_table(name, url, listeners, description, playing, m3u)
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
        
        
        /*************************
        * Add double click event
        *************************/
        var last = $('#icecast_table tr').last();        
        last.on('dblclick', function(e) { $.get(m3u, _parse_m3u); });
    }

function _parse_m3u(data)
    {
        audio.pause();
        audio.src = data;
        audio.play();
    } 
function search(word)
    {
        var url = 'http://dir.xiph.org/search?search='+word;
        
        $.get(url, _parse_xiph_dir);
    }

function _parse_xiph_dir(data)
    {
        /*******************
        * Remove new lines
        *******************/
        data = data.replace(/\n/g, '');
        
        /*******************
        * Get all elements
        *******************/
        var rows = data.match(/<tr class="row\d+?">.+?<\/tr>/g);
        
        clear_table(icecast_table);
        
        for(var i = 0; i < rows.length; i++)
            {
                var host = 'http://dir.xiph.org';
                
                var url_name = rows[i].match(/<span class="name"><a href="(.+?)" onclick=".+?">(.+?)<\/a>/);
                var url      = url_name[1];
                var name     = url_name[2];
                
                var listeners   = rows[i].match(/<span class="listeners">\[(\d+).+?<\/span>/);
                var description = rows[i].match(/<p class="stream-description">(.+?)<\/p>/);
                var playing     = rows[i].match(/<p class="stream-onair"><.+?>.+?<\/.+?>(.+?)<\/p>/);
                var m3u         = rows[i].match(/.+<a href="(.+?\.m3u)"/);
                
                
                listeners   = listeners   == null ? 'No listeners.'    : listeners[1];
                description = description == null ? 'No description.'  : description[1];
                playing     = playing     == null ? 'Playing nothing.' : playing[1];
                m3u         = m3u         == null ? 'No m3u.'          : host + m3u[1];
                
                
                _add_to_table(name, url, listeners, description, playing, m3u);
            }
    }