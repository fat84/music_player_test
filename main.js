// music player test

var {app, BrowserWindow} = require('electron');
var path = require('path');
var url  = require('url');

/********************************************************************************
* Declarate window handler so that it's not deletet when createWindow() returns
********************************************************************************/
var win;

function createWindow()
    {
        /****************
        * Create window
        *****************/
        win = new BrowserWindow
            ({
                width : 1000,
                height: 600
            });

        
        /******************
        * Load index.html
        ******************/
        win.loadURL( url.format
            ({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes : true
            }));
        
        
        /***********************
        * Open developer tools
        ***********************/
        //win.webContents.openDevTools();
        
        
        /********************
        * Set close handler
        ********************/
        win.on('closed', () => {win = null} );
    }

app.on
    (
        'ready',
        createWindow
    );
app.on
    (
        'activate',
        () => { if(win == null) { createWindow(); } }
    );