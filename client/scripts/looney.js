// marmorkuchen.net

(function (window, document, undefined) {

    var VERSION = '0.0.3';

    var SYLLABLE_CHAR = '-';
    var SPACE_CHAR = ' ';

    var BASIC_DOM_ELEMENT = 'span';
    var SYLLABLE_CLASS_NAME = 'looney-syllable';
    var SYLLABLE_VISITED_CLASS_NAME = 'looney-syllable--visited';
    var SPACE_CLASS_NAME = 'looney-space';

    // private

    var _index = {
        song: 0,
        line: 0,
        word: 0,
        syllable: 0
    };

    var _sizes = {
        line: 0,
        word: 0,
        syllable: 0
    };

    var _position = {
        totalSyllables: 0,
        current: 0
    };

    var _setlist;

    var _elem = {
        title: null
    };

    var _callback = {
        teleprompterPercentage: null,
        status: null
    };

    var _teleprompter = {
        mainLineIndex: 0,
        viewElems: [],
        lines: [],
        currentPercentage: 0
    };

    // view

    function __renderTeleprompterElement(tIndex) {

        var elem;

        if (!_teleprompter.viewElems[tIndex]) {
            return false;
        }

        _teleprompter.viewElems[tIndex].innerHTML = '';

        if (!_teleprompter.lines[tIndex] || !_teleprompter.lines[tIndex].words) {
            return false;
        }

        _teleprompter.lines[tIndex].words.forEach(function (eWord, eWordIndex) {

            eWord.syllables.forEach(function (eSyllable, eSyllableIndex) {

                elem = document.createElement(BASIC_DOM_ELEMENT);
                elem.innerText = eSyllable.letters;
                elem.className = SYLLABLE_CLASS_NAME;

                if (tIndex === _teleprompter.mainLineIndex) {

                    if (eWordIndex < _index.word ||
                        (eWordIndex == _index.word && eSyllableIndex <= _index.syllable)) {
                        elem.className += ' ' + SYLLABLE_VISITED_CLASS_NAME;
                    }

                }

                _teleprompter.viewElems[tIndex].appendChild(elem);

            });

            elem = document.createElement(BASIC_DOM_ELEMENT);
            elem.className = SPACE_CLASS_NAME;
            _teleprompter.viewElems[tIndex].appendChild(elem);

        });

    }

    function _updateView() {

        var lineIndex, lyricsLine;

        if (_setlist.length === 0) {
            return false;
        }

        // render title

        if (_elem.title) {

            if (_isFirst('line') && _isFirst('word')) {
                _elem.title.innerText = '';
                elem = document.createElement(BASIC_DOM_ELEMENT);
                elem.innerText = _setlist[_index.song].title;
                _elem.title.appendChild(elem);
            }

        }

        if (_callback.status) {
            _callback.status({
                isFirstLine: _isFirst('line') && !_isThirdOrHigher('word')
            });
        }

        // render teleprompter

        _teleprompter.viewElems.forEach(function (eViewElem, eViewIndex) {

            lineIndex = _index.line - (_teleprompter.mainLineIndex - eViewIndex);

            if (lineIndex > -1 && lineIndex < _sizes.line) {
                lyricsLine = _setlist[_index.song].lines[lineIndex];
            } else {
                lyricsLine = [];
            }

            _teleprompter.lines[eViewIndex] = lyricsLine;

            __renderTeleprompterElement(eViewIndex);

        });

        // calculate percentage of position

        _teleprompter.currentPercentage = (_position.current / _position.totalSyllables) * 100;

        if (_callback.teleprompterPercentage) {
            _callback.teleprompterPercentage(_teleprompter.currentPercentage);
        }

    }

    // parser

    function _parse(tSongLyrics) {

        var parsed = [];

        // remove multiple newlines and replace \r by \n

        var lyricStr = tSongLyrics.replace(/\r/g, '\n');
        lyricStr = lyricStr.replace(/\n\s*\n/g, '\n');

        // lines in array

        var lines = lyricStr.split('\n');

        // create lyric-objects

        var words, syllables;

        var newLine, newWord, newSyllable;

        lines.forEach(function (eLine) {

            newLine = new LooneyTool.Line;

            words = eLine.split(SPACE_CHAR);

            words.forEach(function (eWord) {

                newWord = new LooneyTool.Word;

                syllables = eWord.split(SYLLABLE_CHAR);

                syllables.forEach(function (eSyllable) {

                    newSyllable = new LooneyTool.Syllable;
                    newSyllable.letters = eSyllable;
                    newWord.addSyllable(newSyllable);

                });

                newLine.addWord(newWord);

            });

            parsed.push(newLine);

        });

        return parsed;
    }

    // state machine

    function _reset() {

        _index.song = 0;
        _index.line = 0;
        _index.word = 0;
        _index.syllable = 0;

        _sizes.song = 0;
        _sizes.line = 0;
        _sizes.word = 0;
        _sizes.syllable = 0;

        _setlist = [];

        _syllablesInLine = 0;

        _teleprompter.lines = [null, null, null],
            _teleprompter.currentPercentage = 0;

    }

    function _calculate() {

        var countSyllablesInLine;

        if (_setlist.length === 0) {
            return false;
        }

        _sizes.song = _setlist.length;
        _sizes.line = _setlist[_index.song].lines.length;
        _sizes.word = _setlist[_index.song].lines[_index.line].words.length;
        _sizes.syllable = _setlist[_index.song].lines[_index.line].words[_index.word].syllables.length;

        countSyllablesInLine = 0;

        _setlist[_index.song].lines[_index.line].words.forEach(function (eWord, eWordIndex) {

            if (_index.word >= eWordIndex) {
                _position.current = countSyllablesInLine + _index.syllable;
            }

            countSyllablesInLine = countSyllablesInLine + eWord.syllables.length;

        });

        _position.totalSyllables = countSyllablesInLine - 1;

    }

    function _isFirst(tKey) {
        return _index[tKey] === 0;
    }

    function _isThirdOrHigher(tKey) {
        return _index[tKey] >= 2;
    }

    function _isLast(tKey) {
        return _index[tKey] >= _sizes[tKey] - 1;
    }

    function _goToSong(tSongIndex) {
        _index.song = tSongIndex;
        _index.line = 0;
        _index.word = 0;
        _index.syllable = 0;

        _calculate();
    }

    function _nextSong() {
        if (_isLast('song')) {
            return false;
        }

        _index.song++;
        _index.line = 0;
        _index.word = 0;
        _index.syllable = 0;

        _calculate();
    }

    function _previousSong() {
        if (_isFirst('song')) {
            _index.song = 0;
        } else {
            _index.song--;
        }

        _index.line = 0;
        _index.word = 0;
        _index.syllable = 0;

        _calculate();
    }

    function _nextLine() {
        if (_isLast('line')) {
            return false;
        }

        _index.line++;
        _index.word = 0;
        _index.syllable = 0;

        _calculate();
    }

    function _previousLine() {
        if (_isFirst('line')) {
            return false;
        }

        _index.line--;
        _index.word = _setlist[_index.song].lines[_index.line].words.length - 1;
        _index.syllable = _setlist[_index.song].lines[_index.line].words[_index.word].syllables.length - 1;

        _calculate();
    }

    function _nextWord() {
        if (_isLast('word')) {
            return false;
        }

        _index.word++;
        _index.syllable = 0;

        _calculate();
    }

    function _previousWord() {
        if (_isFirst('word')) {
            return false;
        }

        _index.word--;
        _index.syllable = _setlist[_index.song].lines[_index.line].words[_index.word].syllables.length - 1;

        _calculate();
    }

    function _nextSyllable() {
        if (_isLast('syllable')) {
            return false;
        }

        _index.syllable++;
        _calculate();
    }

    function _previousSyllable() {
        if (_isFirst('syllable')) {
            return false;
        }

        _index.syllable--;
        _calculate();
    }

    // constructor

    var LooneyTool = function (tTeleprompterElems, tMainLineIndex, tElementTitle) {

        _reset();

        if (tMainLineIndex && typeof tMainLineIndex === 'number') {
            _teleprompter.mainLineIndex = tMainLineIndex;
        }

        if (tTeleprompterElems && typeof tTeleprompterElems === 'object') {
            tTeleprompterElems.forEach(function (tElem) {
                if (tElem instanceof HTMLElement) {
                    _teleprompter.viewElems.push(tElem);
                }
            });
        }

        if (tElementTitle && tElementTitle instanceof HTMLElement) {
            _elem.title = tElementTitle;
        }

    };

    // version

    LooneyTool.prototype.version = VERSION;

    // lyric classes

    LooneyTool.Syllable = function () {
        this.letters = '';
    };

    LooneyTool.Word = function () {
        this.syllables = [];
    };

    LooneyTool.Word.prototype.addSyllable = function (tSyllable) {
        if (!tSyllable || !tSyllable instanceof LooneyTool.Syllable) {
            return false;
        }
        this.syllables.push(tSyllable);
    };

    LooneyTool.Line = function () {
        this.words = [];
    };

    LooneyTool.Line.prototype.addWord = function (tWord) {
        if (!tWord || !tWord instanceof LooneyTool.Word) {
            return false;
        }
        this.words.push(tWord);
    };

    LooneyTool.Lyrics = function (sTitle, sLines) {
        if (!sTitle || !sLines || sLines.length === 0 || !sLines[0] instanceof LooneyTool.Line) {
            return false;
        }

        this.lines = sLines;
        this.title = sTitle;
    };

    // public

    LooneyTool.prototype.init = function (tSongList) {

        var lyrics;

        if (!tSongList || tSongList.length === 0) {
            return false;
        }

        _reset();

        tSongList.forEach(function (tSong) {

            if (!tSong || !'title' in tSong || !'lyrics' in tSong || tSong.lyrics.length === 0) {
                return false;
            }

            lyrics = new LooneyTool.Lyrics(tSong.title, _parse(tSong.lyrics));
            _setlist.push(lyrics);

        });

        _setlist.sort(function (sSongA, sSongB) {
            var titleA = sSongA.title.toUpperCase();
            var titleB = sSongB.title.toUpperCase();
            return (titleA < titleB) ? -1 : (titleA > titleB) ? 1 : 0;
        });

        _calculate();
        _updateView();

    };

    LooneyTool.prototype.onTeleprompterChange = function (tCallback) {

        if (tCallback && typeof tCallback === 'function') {
            _callback.teleprompterPercentage = tCallback;
        }

    };

    LooneyTool.prototype.onStatusChange = function (tCallback) {

        if (tCallback && typeof tCallback === 'function') {
            _callback.status = tCallback;
        }

    };

    LooneyTool.prototype.hasSongs = function () {
        return _sizes.song > 0;
    };

    LooneyTool.prototype.nextSong = function () {
        _nextSong();
        _updateView();
    };

    LooneyTool.prototype.previousSong = function () {
        _previousSong();
        _updateView();
    };

    LooneyTool.prototype.findSong = function (tQuery) {

        if (!tQuery || typeof tQuery !== 'string') {
            return false;
        }

        var query = tQuery.toUpperCase();
        var resultIndex = -1;

        _setlist.some(function (eSong, eSongIndex) {
            if (eSong.title.length > 0 && eSong.title[0].toUpperCase() === query) {
                resultIndex = eSongIndex;
                return true;
            } else {
                return false;
            }
        });

        if (resultIndex > -1) {
            _goToSong(resultIndex);
            _updateView();
        }

    };

    LooneyTool.prototype.nextSyllable = function () {

        if (_isLast('syllable')) {

            if (_isLast('word')) {

                if (_isLast('line')) {
                    // _nextSong();
                } else {
                    _nextLine();
                }

            } else {
                _nextWord();
            }

        } else {
            _nextSyllable();
        }

        _updateView();

    };

    LooneyTool.prototype.previousSyllable = function () {

        if (_isFirst('syllable')) {

            if (_isFirst('word')) {

                if (_isFirst('line')) {
                    // _previousSong();
                } else {
                    _previousLine();
                }

            } else {
                _previousWord();
            }

        } else {
            _previousSyllable();
        }

        _updateView();

    };

    // public

    window.LooneyTool = LooneyTool;

})(window, document);
