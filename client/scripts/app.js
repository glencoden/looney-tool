// marmorkuchen.net

(function (window, document, undefined) {

    var LARGEST_INTEGER = 9007199254740992 - 1;
    var SYLLABLE_CHAR = '-';

    var _options = {
        screens: ['screen-settings', 'screen-editor', 'screen-show'],
        storage: {
            namespace: 'looneytoolz',
            songsNamespace: 'song',
            setlistNamespace: 'setlist'
        }
    };

    // private

    var _looneyTool = null;

    // var baseUrl = 'http://localhost:5555';
    // var baseUrl = 'http://looneyapi.lan';
    var baseUrl = 'https://staging.api.looneytunez.de';
    // var baseUrl = 'https://api.looneytunez.de';

    var oAuth2_access_token = '';
    var tokenExpiryDate = null;

    var _requests = {

        get: function (url) {
            const headers = {'Content-Type': 'application/json; charset=utf-8'};
            if (oAuth2_access_token) {
                headers.Authorization = `Bearer ${oAuth2_access_token}`;
            }
            return Promise.resolve()
                .then(() => fetch(`${baseUrl}/${url}`, { method: 'GET', headers }))
                .then(resp => resp.json())
                .catch(err => console.error('Request Service: ', err));
        },

        post: function (url, data) {
            const headers = {'Content-Type': 'application/json; charset=utf-8'};
            if (oAuth2_access_token) {
                headers.Authorization = `Bearer ${oAuth2_access_token}`;
            }
            return Promise.resolve()
                .then(() => JSON.stringify(data))
                .then(body => fetch(`${baseUrl}/${url}`, {
                    method: 'POST',
                    headers,
                    body
                }))
                .then(resp => resp.json())
                .catch(err => console.error('Request Service: ', err));
        },

        // put: function (url, data) {
        //     const headers = {'Content-Type': 'application/json; charset=utf-8'};
        //     if (oAuth2_access_token) {
        //         headers.Authorization = `Bearer ${oAuth2_access_token}`;
        //     }
        //     return Promise.resolve()
        //         .then(() => JSON.stringify(data))
        //         .then(body => fetch(`${baseUrl}/${url}`, {
        //             method: 'PUT',
        //             headers,
        //             body
        //         }))
        //         .then(resp => resp.json())
        //         .catch(err => console.error('Request Service: ', err));
        // },

        // delete: function (url) {
        //     const headers = {'Content-Type': 'application/json; charset=utf-8'};
        //     if (oAuth2_access_token) {
        //         headers.Authorization = `Bearer ${oAuth2_access_token}`;
        //     }
        //     return Promise.resolve()
        //         .then(() => fetch(`${baseUrl}/${url}`, { method: 'DELETE', headers }))
        //         .then(resp => resp.json())
        //         .catch(err => console.error('Request Service: ', err));
        // },

        _encodeURI: function (data) {
            const formBody = [];
            for (const key in data) {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(data[key]);
                formBody.push(`${encodedKey}=${encodedValue}`);
            }
            return formBody.join('&');
        },

        _postEncodeURI: function (url, data) {
            return Promise.resolve()
                .then(() => this._encodeURI(data))
                .then(body => fetch(`${baseUrl}/${url}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    body
                }))
                .then(resp => {
                    if (resp.ok) {
                        return resp.json();
                    }
                    return Promise.reject(resp);
                });
        },

        login: function (username, password) {
            return this._postEncodeURI('auth/login', { username, password, grant_type: 'password', client_id: null, client_secret: null })
                .then(resp => {
                    // set token and expiry time
                    oAuth2_access_token = resp.access_token;
                    const expiryDate = new Date();
                    expiryDate.setSeconds(expiryDate.getSeconds() + resp.expires_in - 60);
                    tokenExpiryDate = expiryDate;

                    return {
                        success: true
                    };
                });
        },

        // isAuthTokenValid: function () {
        //     return new Date() < tokenExpiryDate;
        // },

    };

    var _storage = {

        getAll: function (sNamespace) {
            var allItems = [];

            Object.keys(localStorage).forEach(function (eKey) {
                if (eKey.indexOf(_options.storage.namespace + '.' + sNamespace) > -1) {
                    allItems.push(JSON.parse(localStorage.getItem(eKey)));
                }
            });

            return allItems;
        },

        get: function (sKey) {
            return JSON.parse(localStorage.getItem(_options.storage.namespace + '.' + sKey));
        },

        set: function (sKey, sValue) {
            localStorage.setItem(_options.storage.namespace + '.' + sKey, JSON.stringify(sValue));
        },

        makeFile: function () {

            var allItems = [];

            Object.keys(localStorage).forEach(function (eKey) {
                if (eKey.indexOf(_options.storage.namespace) > -1) {
                    allItems.push({
                        key: eKey,
                        value: JSON.parse(localStorage.getItem(eKey))
                    });
                }
            });

            return allItems;

        },

        insertFile: function (sData) {

            sData.forEach(function (eDataItem) {
                localStorage.setItem(eDataItem.key, JSON.stringify(eDataItem.value));
            });

        },

        remove: function (sKey) {
            localStorage.removeItem(_options.storage.namespace + '.' + sKey);
        },

        removeAll: function () {

            Object.keys(localStorage).forEach(function (eKey) {
                if (eKey.indexOf(_options.storage.namespace) > -1) {
                    localStorage.removeItem(eKey);
                }
            });

        }

    };

    var app = {};

    app.version = '1.1.0';

    // fullscreen

    app.fullscreen = {

        show: function () {

            var elem = document.documentElement;

            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }

        },

        hide: function () {

            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

        }

    };

    // navigation

    app.navigation = {

        _currentScreen: null,

        goTo: function (nScreenId) {

            if (_options.screens.indexOf(nScreenId) > -1) {
                $('.screen').hide();
                $('#' + nScreenId).show();
                this._currentScreen = nScreenId;
            }

        },

        getCurrent: function () {
            return this._currentScreen;
        }

    };

    // file

    app.file = {

        save: function () {

            var data = JSON.stringify(_storage.makeFile());

            var blob = new Blob([data], { type: 'application/json' });
            var url = URL.createObjectURL(blob);

            var elem = document.createElement('a');

            var now = new Date;

            var curr_date = now.getDate();
            var curr_month = now.getMonth();
            curr_month++;
            var curr_year = now.getFullYear();

            var date = curr_date + '_' + curr_month + '_' + curr_year;

            elem.download = 'looneytool_' + date + '.json';
            elem.href = url;

            elem.click();

        },

        load: function () {

            var files = document.getElementById('fileLoader').files;

            if (!files.length) {
                return;
            }

            var file = files[0];
            var reader = new FileReader();

            _storage.removeAll();

            reader.onloadend = function (evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    _storage.insertFile(JSON.parse(evt.target.result));
                    app.editor.init();
                    alert('Datei wurde erfolgreich eingelesen');
                    document.getElementById('fileLoader').value = null;
                }
            };

            reader.readAsText(file);

        }

    };

    // cloud

    app.cloud = {

        save: function () {
            const pw = prompt('Enter password');

            _requests.login('boss', pw)
                .then(() => {
                    const data = _storage.makeFile();

                    _requests.post('repertoire/backup', { data })
                        .then(response => {
                            if (!response?.success) {
                                alert(
                                    typeof response.error === 'string'
                                        ? response.error
                                        : 'A saving error occurred'
                                );
                                return;
                            }
                            alert('Everything is saved!');
                        });
                })
                .catch(() => {
                    alert('Wrong password');
                });
        },

        load: function () {
            return _requests.get('repertoire/backup')
                .then(result => {
                    if (!Array.isArray(result.data)) {
                        console.error('unexpected data from looney API');
                        return;
                    }
                    _storage.insertFile(result.data);
                    app.editor.init();
                });
        }

    };

    // songs storage

    app.songs = {

        getAll: function () {
            return _storage.getAll(_options.storage.songsNamespace);
        },

        get: function (sId) {
            return _storage.get(_options.storage.songsNamespace + '.' + sId);
        },

        set: function (sId, sTitle, sLyrics) {

            var song = {
                id: sId,
                title: sTitle,
                lyrics: sLyrics
            };

            return _storage.set(_options.storage.songsNamespace + '.' + sId, song);
        },

        add: function (sTitle, sLyrics) {

            var id = Math.round(Math.random() * LARGEST_INTEGER) + 1;

            var song = {
                id: id,
                title: sTitle,
                lyrics: sLyrics
            };

            _storage.set(_options.storage.songsNamespace + '.' + id, song);

            return song;
        },

        remove: function (sId) {
            return _storage.remove(_options.storage.songsNamespace + '.' + sId);
        }

    };

    // setlist storage

    app.setlists = {

        getAll: function () {
            return _storage.getAll(_options.storage.setlistNamespace);
        },

        get: function (sId) {
            return _storage.get(_options.storage.setlistNamespace + '.' + sId);
        },

        set: function (sId, sTitle, sSongIds) {

            var setlist = {
                id: sId,
                title: sTitle,
                songs: sSongIds
            };

            return _storage.set(_options.storage.setlistNamespace + '.' + sId, setlist);

        },

        add: function (sTitle) {

            var id = Math.round(Math.random() * LARGEST_INTEGER) + 1;

            var setlist = {
                id: id,
                title: sTitle,
                songs: []
            };

            _storage.set(_options.storage.setlistNamespace + '.' + id, setlist);

            return setlist;
        },

        remove: function (sId) {
            return _storage.remove(_options.storage.setlistNamespace + '.' + sId);
        }

    };

    // editor screen

    app.editor = {

        currentSongId: null,
        currentSetlistId: null,
        currentSetlistSongId: null,

        // private

        _statusSetlist: function (sDisabled) {

            if (sDisabled) {
                $('#setlist').html('');
                $('#setlist-title').val('');
            }

            $('#setlist').prop('disabled', sDisabled);
            $('#setlist-title').prop('disabled', sDisabled);

            $('#btn-setlist-addsong').prop('disabled', sDisabled);

            $('#btn-setlist-save').prop('disabled', sDisabled);
            $('#btn-setlist-delete').prop('disabled', sDisabled);

        },

        _statusSetlistSong: function (sDisabled) {

            $('#btn-setlist-removesong').prop('disabled', sDisabled);

            $('#btn-setlist-songup').prop('disabled', sDisabled);
            $('#btn-setlist-songdown').prop('disabled', sDisabled);

        },

        _statusSong: function (sDisabled) {

            if (sDisabled) {
                $('#song-title').val('');
                $('#song-lyrics').val('');
            }

            $('#song-title').prop('disabled', sDisabled);
            $('#song-lyrics').prop('disabled', sDisabled);

            $('#btn-song-save').prop('disabled', sDisabled);
            $('#btn-song-delete').prop('disabled', sDisabled);
            $('#btn-song-findsyllables').prop('disabled', sDisabled);

            $('#language').prop('disabled', sDisabled);

        },

        // init

        init: function () {

            var idx = 0;
            var songs = app.songs.getAll();

            var elem;

            songs.sort(function (a, b) {
                var textA = a.title.toUpperCase();
                var textB = b.title.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            $('#allSongs').html('');

            songs.forEach(function (eSong) {
                idx++;
                elem = $('<option />');
                $(elem).attr('value', eSong.id);
                $(elem).html(idx + '. ' + eSong.title);
                $('#allSongs').append(elem);
            });

            if (app.editor.currentSongId) {
                $('#allSongs').val(app.editor.currentSongId);
            } else {
                app.editor._statusSong(true);
            }

            var setlists = app.setlists.getAll();

            setlists.sort(function (a, b) {
                var textA = a.title.toUpperCase();
                var textB = b.title.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            $('#allSetlists').html('');
            $('#showSetlist').html('');

            idx = 0;

            setlists.forEach(function (eSetlist) {
                idx++;
                elem = $('<option />');
                $(elem).attr('value', eSetlist.id);
                $(elem).html(idx + '. ' + eSetlist.title);
                $('#allSetlists').append(elem);
                $('#showSetlist').append($(elem).clone());
            });

            $('#allSetlists').val(app.editor.currentSetlistId);

            if (app.editor.currentSetlistId) {

                var songs;
                var setlist = app.setlists.get(app.editor.currentSetlistId);

                $('#setlist').html('');
                $('#setlist-title').val(setlist.title);

                idx = 0;

                setlist.songs.forEach(function (eSong) {
                    idx++;
                    song = app.songs.get(eSong);
                    elem = $('<option />');
                    $(elem).attr('value', song.id);
                    $(elem).html(idx + '. ' + song.title);
                    $('#setlist').append(elem);
                });

                if (app.editor.currentSetlistSongId) {
                    $('#setlist').val(app.editor.currentSetlistSongId);
                } else {
                    app.editor._statusSetlistSong(true);
                }

            } else {
                app.editor._statusSetlist(true);
                app.editor._statusSetlistSong(true);
            }

        },

        // new

        newSetlist: function () {
            var setlist = app.setlists.add('Untitled');
            app.editor.currentSetlistId = setlist.id;
            app.editor._statusSetlist(false);
            app.editor._statusSetlistSong(true);
            app.editor.init();
        },

        newSong: function () {
            var song = app.songs.add('Untitled', '');
            app.editor.currentSongId = song.id;
            $('#song-title').val(song.title);
            $('#song-lyrics').val(song.lyrics);
            app.editor._statusSong(false);
            app.editor.init();
        },

        // select

        selectSong: function () {

            app.editor.currentSongId = $('#allSongs').val();

            if (app.editor.currentSongId) {
                var song = app.songs.get(app.editor.currentSongId);
                $('#song-title').val(song.title);
                $('#song-lyrics').val(song.lyrics);
            }

            app.editor._statusSong(false);

        },

        selectSetlist: function () {

            app.editor.currentSetlistId = $('#allSetlists').val();
            app.editor.init();

            app.editor._statusSetlist(false);

        },

        selectSetlistSong: function () {

            app.editor.currentSetlistSongId = $('#setlist').val();
            app.editor._statusSetlistSong(false);

        },

        // setlist operations

        addToSetlist: function () {

            var songId = app.editor.currentSongId;
            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var setlist = app.setlists.get(setlistId);

            if (setlist.songs.indexOf(songId) > -1) {
                alert('Error: Song ist schon in dieser Setlist vorhanden.');
                return false;
            }

            setlist.songs.push(songId);

            setlist.songs.sort(function (a, b) {
                var songA = app.songs.get(a);
                var songB = app.songs.get(b);
                var textA = songA.title.toUpperCase();
                var textB = songB.title.toUpperCase();
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
            });

            app.setlists.set(setlistId, setlist.title, setlist.songs);

            app.editor.init();

        },

        removeFromSetlist: function () {

            var songId = app.editor.currentSetlistSongId;
            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var setlist = app.setlists.get(setlistId);

            var idx = setlist.songs.indexOf(songId);

            setlist.songs.splice(idx, 1);
            app.setlists.set(setlistId, setlist.title, setlist.songs);

            app.editor.currentSetlistSongId = null;

            app.editor._statusSetlistSong(true);

            app.editor.init();

        },

        songUp: function () {

            var songId = app.editor.currentSetlistSongId;
            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var setlist = app.setlists.get(setlistId);

            var current = setlist.songs.indexOf(songId);
            var coming = current - 1;

            if (coming >= 0) {
                var buffer = setlist.songs[coming];
                setlist.songs[coming] = setlist.songs[current];
                setlist.songs[current] = buffer;
            }

            app.setlists.set(setlistId, setlist.title, setlist.songs);

            app.editor.init();

        },

        songDown: function () {

            var songId = app.editor.currentSetlistSongId;
            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var setlist = app.setlists.get(setlistId);

            var current = setlist.songs.indexOf(songId);
            var coming = current + 1;

            if (coming < setlist.songs.length) {
                var buffer = setlist.songs[coming];
                setlist.songs[coming] = setlist.songs[current];
                setlist.songs[current] = buffer;
            }

            app.setlists.set(setlistId, setlist.title, setlist.songs);

            app.editor.init();

        },

        // save

        saveSong: function () {

            var songId = app.editor.currentSongId;

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var song = app.songs.get(songId);

            song.lyrics = $('#song-lyrics').val();
            song.title = $('#song-title').val();

            app.songs.set(song.id, song.title, song.lyrics);

            app.editor.init();

        },

        saveSetlist: function () {

            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            var setlist = app.setlists.get(setlistId);

            setlist.title = $('#setlist-title').val();

            app.setlists.set(setlist.id, setlist.title, setlist.songs);

            app.editor.init();

        },

        // delete

        deleteSetlist: function () {

            var setlistId = app.editor.currentSetlistId;

            if (!setlistId) {
                alert('Error: Es wurde keine Setlist ausgewählt.');
                return false;
            }

            app.setlists.remove(setlistId);

            app.editor.currentSetlistId = null;
            app.editor.currentSetlistSongId = null;

            app.editor._statusSetlistSong(true);
            app.editor._statusSetlist(true);

            app.editor.init();

        },

        deleteSong: function () {

            var songId = app.editor.currentSongId;

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            app.songs.remove(songId);

            var setlists = app.setlists.getAll();
            var idx;

            setlists.forEach(function (eSetlist) {
                idx = eSetlist.songs.indexOf(songId);
                if (idx > -1) {
                    eSetlist.songs.splice(idx, 1);
                    app.setlists.set(eSetlist.id, eSetlist.title, eSetlist.songs);
                }
            });

            app.editor.currentSongId = null;

            app.editor.init();

            app.editor._statusSong(true);

        },

        // automatic magic

        findSyllables: function () {

            var songId = app.editor.currentSongId;

            if (!songId) {
                alert('Error: Es wurde kein Song ausgewählt.');
                return false;
            }

            var lyrics = $('#song-lyrics').val();

            if (!lyrics || lyrics.length === 0) {
                alert('Error: Es sind keine Lyrics vorhanden.');
                return false;
            }

            lyrics = lyrics.replace(new RegExp(SYLLABLE_CHAR, 'g'), '');
            lyrics = Hyphenator.hyphenate(lyrics, $('#language').val());

            $('#song-lyrics').val(lyrics);

        }

    };

    // showtime

    app.showtime = {

        init: function () {

            var setlistId = $('#showSetlist').val();

            if (!setlistId) {
                return false;
            }

            var setlist = app.setlists.get(setlistId);
            var song, prepared = [];

            setlist.songs.forEach(function (eSongId) {
                song = app.songs.get(eSongId);
                prepared.push(song);
            });

            _looneyTool.init(prepared);

        }

    };

    // ready

    $(document).ready(function () {

        // async load data from cloud

        app.cloud.load()
            .finally(() => {
                app.editor.init();
                app.showtime.init();
            });

        // init

        var teleprompterElem = document.getElementById('teleprompter');
        var previousLyricsElem = document.getElementById('show-previous');
        var currentLyricsElem = document.getElementById('show-current');
        var nextLyricsElem = document.getElementById('show-next');
        var titleElem = document.getElementById('show-title');

        var teleprompter = [previousLyricsElem, currentLyricsElem, nextLyricsElem];

        var mainLineIndex = 1;

        _looneyTool = new window.LooneyTool(teleprompter, mainLineIndex, titleElem);

        _looneyTool.onTeleprompterChange(function (tPercentage) {

            $(teleprompterElem).css('transform', 'translate3d(0, -' + (tPercentage / 3) + '%, 0)');

            if (tPercentage > 0) {
                $(teleprompterElem).addClass('show__teleprompter__scroller--animated');
            } else {
                $(teleprompterElem).removeClass('show__teleprompter__scroller--animated');
            }

        });

        _looneyTool.onStatusChange(function (tStatus) {

            if (tStatus.isFirstLine) {
                $(titleElem).addClass('show__title--visible');
            } else {
                $(titleElem).removeClass('show__title--visible');
            }

        });

        app.navigation.goTo('screen-settings');

        // Hypenator configuration

        Hyphenator.config({
            hyphenchar: SYLLABLE_CHAR,
            minwordlength: 0,
            enablecache: false
        });

        // keyboard events

        $(document).on('keydown', function (event) {

            if (event.shiftKey) {

                // maintenance

                if (event.keyCode === 49) {
                    app.navigation.goTo('screen-settings');
                } else if (event.keyCode === 50 || event.keyCode === 222) {
                    app.navigation.goTo('screen-editor');
                } else if (event.keyCode === 51) {
                    app.navigation.goTo('screen-show');
                }

            } else {

                if (app.navigation.getCurrent() === 'screen-show') {
                    event.preventDefault();


                    // showtime

                    if (event.keyCode === 37) {
                        _looneyTool.previousSyllable();
                    } else if (event.keyCode === 39) {
                        _looneyTool.nextSyllable();
                    } else if (event.keyCode === 33) {
                        _looneyTool.previousSong();
                    } else if (event.keyCode === 34) {
                        _looneyTool.nextSong();
                    } else {

                        // song search mode

                        _looneyTool.findSong(String.fromCharCode(event.which));

                    }

                }

            }

        });

        // mouse events

        $(document).on('mousedown', function (event) {

            if (app.navigation.getCurrent() === 'screen-show') {
                event.preventDefault();
                _looneyTool.nextSyllable();
            }

        });

        // before leave prompt

        window.addEventListener('beforeunload', (event) => {
            event.returnValue = `Are you sure you want to leave?`;
        });

        // version number

        $('#version').html('looneytool version ' + app.version + ' with looney-lib ' + _looneyTool.version);

    });

    window.app = app;

})(window, document);
