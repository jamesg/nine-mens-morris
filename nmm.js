// Determine the equality of two arrays by comparing each element.
Array.prototype.equals = function (array) {
    if(!array)
        return false;
    if(this.length != array.length)
        return false;
    return this.map(
        function(x, i) {
            if(x instanceof Array && array[i] instanceof Array) {
                if(!x.equals(array[i]))
                    return false;
            } else if(x != array[i]) {
                return false;
            }
            return true;
        }
        ).reduce(function(p, c) { return p && c; }, true);
};

// Determine the equality of two arrays by comparing each element, except that
// the elements may be in different orders in each array.
Array.prototype.setEquals = function(array) {
    if(!array)
        return false;
    if(this.length != array.length)
        return false;
    var cmp = function(x, y) {
        if(x instanceof Array && y instanceof Array)
            return x.equals(y);
        return x == y;
    };
    for(var i = 0, l = this.length; i < l; ++i) {
        if(array.filter(cmp.bind(this, this[i])).length != 1)
            return false;
    }
    return true;
};

// Create a copy of the array that does not contain eny element in 'array'.
// Arrays within 'array' are compared with Array.equals.
Array.prototype.without = function(array) {
    return this.filter(function(e) { return !array.has(e); });
};

// Determine the equality of two sets of sets.
Array.prototype.nestedSetEquals = function(array) {
    if(!array)
        return false;
    if(this.length != array.length)
        return false;
    var cmp = function(x, y) {
        if(x instanceof Array && y instanceof Array)
            return x.setEquals(y);
        return x == y;
    };
    for(var i = 0, l = this.length; i < l; ++i) {
        if(array.filter(cmp.bind(this, this[i])).length != 1)
            return false;
    }
    return true;
};

// Deep clone an array.
Array.prototype.clone = function() {
    return this.map(function(x) { return (x instanceof Array)?x.clone():x; });
};

// Determine whether or not an array contains a value.  Performs a deep
// comparison of array members.
Array.prototype.has = function(x) {
    return this.some(
            function(y) {
                return (x instanceof Array && y instanceof Array)?
                    (x.equals(y)):(x === y);
            }
            );
};

// Get the last element in the array.
Array.prototype.last = function() {
    if(this.length == 0)
        return undefined;
    return this[this.length-1];
};

var Colour = {
    line: '#777',
    point: '#777',
    hover: 'green',
    from: 'blue',
    player: ['red', 'yellow']
};

var Dimension = {
    empty: 0.2,
    man: 0.25,
    from: 0.3,
    hover: 0.35
};

var Player = ['Red', 'Yellow'];

// Create an empty board, or, if 'pieces' is provided, use it as a nested array
// addressed by (shell, angle).
// Boards are immutable.  'Modifiers' return a new board.
var Board = function(pieces) {
    this._discards = [0, 0];

    if(arguments.length == 1) {
        this._pieces = pieces;
        this._discards = [0, 0];
        var counts =
            pieces.reduce(function(p, c) { return p.concat(c); }).reduce(
                function(p, c) {
                    if(!p[c])
                        p[c] = 0;
                    ++p[c];
                    return p;
                },
                {}
                );
        console.log('counts',counts);
        this._unplaced = [9 - counts['0'], 9 - counts['1']];
    } else {
        this._pieces = [
            [null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null]
            ];
        // Players have nine pieces each.
        this._unplaced = [9, 9];
    }
};

Board.PLACING = 0;
Board.MOVING = 1;
Board.END = 2;

Board.prototype = {
    //
    // UTILITIES
    //

    // Copy the board.
    clone: function() {
        var board = new Board;
        board._pieces = this._pieces.clone();
        board._discards = this._discards.clone();
        board._unplaced = this._unplaced.clone();
        return board;
    },

    //
    // ACCESSORS
    //

    // Determine the stage of the game (placing, moving or end).
    stage: function() {
        // First stage, placing pieces.
        if(this._unplaced[0] + this._unplaced[1] > 0)
            return Board.PLACING;
        // Second stage, moving pieces.
        if(this._discards[0] < 7 || this._discards[1] < 7)
            return Board.MOVING;
        // Final stage, a player has won.
        return Board.END;
    },
    // Determine whether or not the game is finished.
    finished: function() {
        return (this._discards[0] >= 7 || this._discards[1] >= 7);
    },
    // Determine the winner, or throw if the game is not finished.
    winner: function() {
        if(!this.finished())
            throw 'the game is not yet finished';
        return (this._discards[0] > this._discards[1])?1:0;
    },
    // Determine the identity of the player with a piece at (shell, angle).
    player: function(point) {
        return this._pieces[point[0]][point[1]];
    },
    // Get the set of all mills on the board.
    mills: function() {
        var out = [];
        // Mills along a shell.
        for(var i = 0; i < 3; ++i)
            for(var j = 0; j < 4; ++j)
                if(
                    this.player([i, j*2]) == this.player([i, j*2+1]) &&
                    this.player([i, j*2+1]) == this.player([i, j*2+2]) &&
                    this.player([i, j*2]) != null
                  )
                    out.push([
                        [i, j*2], [i, j*2+1], [i, j*2+2], this.player([i, j*2])
                        ]);
        // Mills perpendicular to a shell.
        for(var i = 0; i < 4; ++i) {
            var angle = i*2+1;
            if(
                this.player([0, angle]) == this.player([1, angle]) &&
                this.player([1, angle]) == this.player([2, angle]) &&
                this.player([0, angle]) != null
              )
                out.push([
                    [0, angle], [1, angle], [2, angle], this.player([0, angle])
                    ]);
        }
        return out;
    },
    // Compute a set of valid placements for the player.
    validPlacements: function(player) {
        if(this._unplaced[player] == 0)
            // The player has placed all their men.
            return [];
        var valid = [];
        for(shell = 0; shell < 3; ++shell)
            for(angle = 0; angle < 8; ++angle)
                if(this.player([shell, angle]) == null)
                    valid.push([shell, angle]);
        return valid;
    },
    placementFormsMill: function(player, point) {
        if(this.validPlacements(player).has(point)) {
            var newBoard = this.place(player, point);
            var newMills = newBoard.mills().without(this.mills());
            return (newMills.length == 1);
        }
        return false;
    },
    // Compute a set of valid moves.
    // Returns an array of moves in the form
    // [ [fromShell, fromAngle ], [toShell, toAngle] ].
    validMoves: function(player) {
        var valid = [];
        for(shell = 0; shell < 3; ++shell) {
            for(angle = 0; angle < 8; ++angle) {
                // Moves available from the current point.
                var moves = [];
                if(this.player([shell, angle]) != player)
                    continue;
                if(angle%2 == 1) {
                    // Can move between shells at this angle.
                    if(shell == 1) {
                        moves.push([0, angle]);
                        moves.push([2, angle]);
                    } else {
                        moves.push([1, angle]);
                    }
                }
                if(this.player([shell, (angle+7)%8]) == null)
                    moves.push([shell, (angle+7)%8]);
                if(this.player([shell, (angle+9)%8]) == null)
                    moves.push([shell, (angle+9)%8]);
                moves.forEach(
                    function(move) { valid.push([[shell, angle], move]); }
                    );
            }
        }
        // Include only moves that lead to a null point.
        return valid.filter(
            function(move) { return this.player(move[1]) == null; },
            this
            );
    },
    moveFormsMill: function(movement) {
        var player = this.player(movement[0]);
        if(this.validMoves(player).has(movement)) {
            var newBoard = this.move(movement);
            var newMills = newBoard.mills().without(this.mills());
            return (newMills.length == 1);
        }
        return false;
    },
    validTakes: function(player) {
        var out = [];
        var otherPlayer = (player==0)?1:0;
        for(var shell = 0; shell < 3; ++shell)
            for(var angle = 0; angle < 8; ++angle)
                if(this.player([shell, angle]) == otherPlayer)
                    out.push(this.remove([shell, angle]));
        return out;
    },
    validTurns: function(player) {
        var out = [];
        switch(this.stage()) {
            case Board.PLACING:
                this.validPlacements(player).forEach(
                    function(placement) {
                        var newBoard = this.place(player, placement);
                        if(this.placementFormsMill(player, placement))
                            out = out.concat(newBoard.validTakes(player));
                        else
                            out.push(newBoard);
                    },
                    this
                    );
                break;
            case Board.MOVING:
                this.validMoves(player).forEach(
                    function(movement) {
                        var newBoard = this.move(movement);
                        if(this.moveFormsMill(movement))
                            out = out.concat(newBoard.validTakes(player));
                        else
                            out.push(newBoard);
                    },
                    this
                    );
                break;
        };
        return out;
    },

    //
    // MODIFIERS - these functions return a modified copy of the board.
    //

    // Place a piece at (shell, angle).
    place: function(player, point) {
        var shell = point[0], angle = point[1];
        if(this.player(point) != null)
            throw 'player ' + this.player(point)+
                ' has already played here';
        var board = this.clone();
        if(this._unplaced[player] == 0)
            throw 'player ' + player + ' has used all their pieces';
        board._pieces[point[0]][point[1]] = player;
        board._unplaced[player]--;
        return board;
    },
    // Move a piece already on the board.
    // 'movement' is an array of the form
    // [[fromShell, fromAngle], [toShell, toAngle]].
    move: function(movement) {
        var board = this.clone();
        if(board.player(movement[1]) != null)
            throw 'there is already a man at this point';
        board._pieces[movement[1][0]][movement[1][1]] = board.player(movement[0]);
        board._pieces[movement[0][0]][movement[0][1]] = null;
        return board;
    },
    // Remove the piece at (shell, angle).
    remove: function(point) {
        var board = this.clone();
        player = this.player(point);
        board._pieces[point[0]][point[1]] = null;
        board._discards[player]++;
        return board;
    }
};

// Start a new game.
// 'players' is an array describing the two players (whether they should be
// human or computer players).  It is of the form ['comp', 'human'].
// 'canvas' is the canvas to draw to.  The game will scale to any reasonable
// size (around 400x400 is ideal).
// 'statusElement' is a <p> or <span> element that information will be printed
// to.
var Game = function(players, canvas, statusElement) {
    this._canvas = canvas;
    this._status = statusElement;
    this._nextPlayer = 0;
    this._expectTake = false;
    this._board = new Board();
    this._hover = null;
    this._from = null;
    this._players = players;

    // Convert cartesian (x, y) coordinates to polar-style (shell, angle)
    // coordinates.
    var cartesianToPoint = function(x, y) {
        var xd = x - 4;
        var yd = y - 4;
        var shell = 3 - Math.max(Math.abs(xd), Math.abs(yd));
        var sign = function(x) {
            if(x > 0) return 1;
            if(x < 0) return -1;
            return 0;
        };
        var angle = [ [0, 1, 2], [7, null, 3], [6, 5, 4] ]
                [sign(yd)+1][sign(xd)+1];
        if(shell < 0 || shell > 2 || angle < 0 || angle > 7)
            return null;
        return [shell, angle];
    };

    var size = Math.min(canvas.width, canvas.height);
    var gs = size / 8;

    var pointCoordinates = function(evt) {
        var rect = canvas.getBoundingClientRect();
        var canvasX = evt.clientX - rect.left;
        var canvasY = evt.clientY - rect.top;
        var gX = Math.trunc((canvasX + (gs/2)) / gs);
        var gY = Math.trunc((canvasY + (gs/2)) / gs);
        var point = cartesianToPoint(gX, gY);
        return point;
    };
    this._mouseDownListener =
        (function(evt) {
            var point = pointCoordinates(evt);
            if(point == null)
                return;

            if(this.takeExpected()) {
                if(this._board.player(point) == (this._nextPlayer == 0)?1:0) {
                    this._board = this._board.remove(point);
                    this.render();
                    this.switchPlayer();
                } else {
                    console.log('the opponent does not have a man here');
                }
            } else if(this.placementExpected()) {
                this.place(this.nextPlayer(), point);
            } else if(this.moveExpected()) {
                if(this._from == null) {
                    if(this._board.player(point) == this._nextPlayer) {
                        this._from = point;
                        this.render();
                    } else {
                        console.log('invalid from point');
                    }
                } else {
                    var movement = [this._from, point];
                    this._from = null;
                    this.move(movement);
                }
            }
        }).bind(this)
    canvas.addEventListener('mousedown', this._mouseDownListener);
    this._mouseMoveListener =
            (function(evt) {
                var point = pointCoordinates(evt);
                if(point != null && !point.equals(this._hover)) {
                    this._hover = point;
                    this.render();
                }
            }).bind(this);
    canvas.addEventListener('mousemove', this._mouseMoveListener);
    this._mouseOutListener =
            (function(evt) {
                this._hover = null;
                this.render();
            }).bind(this);
    canvas.addEventListener('mouseout', this._mouseOutListener);

    this.setStatus('First player: ' + Player[this._nextPlayer]);
    if(this._players[this._nextPlayer] == 'comp')
        this.aiTurn(this._nextPlayer);
    this.render();
};
Game.prototype = {
    // Erase the canvas an clear event listeners.
    clear: function() {
        var context = this._canvas.getContext('2d');
        context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._canvas.removeEventListener('mousedown', this._mouseDownListener);
        this._canvas.removeEventListener('mousemove', this._mouseMoveListener);
        this._canvas.removeEventListener('mouseout', this._mouseOutListener);
    },
    // Draw the current state of the game to the canvas.
    render: function() {
        var context = this._canvas.getContext('2d');
        var size = Math.min(this._canvas.width, this._canvas.height);
        var gs = size / 8;

        // Convert (shell, angle) polar-style coordinates to cartesian
        // coordinates.
        var pointToCartesian = function(shell, angle) {
            return [
                1 + shell +
                    ((angle >= 1 && angle <= 5)?(3-shell):0) +
                    ((angle >= 2 && angle <= 4)?(3-shell):0),
                1 + shell +
                    ((angle >= 3)?(3-shell):0) +
                    ((angle >= 4 && angle <= 6)?(3-shell):0)
                ];
        };
        var drawPoint = (function(shell, angle) {
            var xy = pointToCartesian(shell, angle);
            if(this._board.player([shell, angle]) == null) {
                context.fillStyle = Colour.point;
                context.beginPath();
                context.arc(gs*xy[0], gs*xy[1], gs * Dimension.empty, 0, 2*Math.PI);
                context.fill();
            } else {
                context.fillStyle = Colour.player[this._board.player([shell, angle])];
                context.beginPath();
                context.arc(gs*xy[0], gs*xy[1], gs * Dimension.man, 0, 2*Math.PI);
                context.fill();
            }
        }).bind(this);
        var drawLine = function(fromX, fromY, toX, toY) {
            context.strokeStyle = Colour.line;
            context.beginPath();
            context.moveTo(gs*fromX, gs*fromY);
            context.lineTo(gs*toX, gs*toY);
            context.stroke();
        };

        context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        context.lineWidth = 2;

        var drawShell = function(shell) {
            context.strokeStyle = Colour.line;
            context.strokeRect(
                    (shell + 1) * gs, (shell + 1) * gs,
                    (3 - shell) * gs * 2, (3 - shell) * gs * 2
                    );
        };
        [0, 1, 2].forEach(drawShell);

        drawLine(4, 1, 4, 3);
        drawLine(7, 4, 5, 4);
        drawLine(4, 7, 4, 5);
        drawLine(1, 4, 3, 4);

        if(this._hover != null) {
            var xy = pointToCartesian(this._hover[0], this._hover[1]);
            context.fillStyle = Colour.hover;
            context.beginPath();
            context.arc(gs*xy[0], gs*xy[1], gs * Dimension.hover, 0, 2*Math.PI);
            context.fill();
        }

        if(this._from != null) {
            var xy = pointToCartesian(this._from[0], this._from[1]);
            context.fillStyle = Colour.from;
            context.beginPath();
            context.arc(gs*xy[0], gs*xy[1], gs * Dimension.from, 0, 2*Math.PI);
            context.fill();
        }

        for(shell = 0; shell < 3; ++shell)
            for(angle = 0; angle < 8; ++angle)
                drawPoint(shell, angle);
    },
    // Print a status message.
    setStatus: function(str) {
        this._status.innerHTML = str;
    },
    nextPlayer: function() {
        return this._nextPlayer;
    },
    switchPlayer: function() {
        this._expectTake = false;
        if(this._board.finished()) {
            this.setStatus('The game is finished, ' + Player[this._board.winner()] + ' wins.');
            return;
        }
        this._nextPlayer = (this.nextPlayer() + 1) % 2;
        switch(this._players[this._nextPlayer]) {
        case 'comp':
            this.setStatus('AI move: ' + Player[this._nextPlayer]);
            setTimeout(this.aiTurn.bind(this), 1);
            break;
        case 'human':
            this.setStatus('Next player: ' + Player[this.nextPlayer()]);
            break;
        }
    },
    expectTake: function() {
        this._expectTake = true;
        this.setStatus(
                Player[this._nextPlayer] + ', take a man from your opponent'
                );
    },
    moveExpected: function() {
        return !this._expectTake && (this._board.stage() == Board.MOVING);
    },
    placementExpected: function() {
        return !this._expectTake && (this._board.stage() == Board.PLACING);
    },
    takeExpected: function() {
        return this._expectTake;
    },
    place: function(player, point) {
        if(this._board.validPlacements(player).has(point)) {
            var oldBoard = this._board;
            this._board = this._board.place(player, point);
            if(oldBoard.placementFormsMill(player, point))
                this.expectTake();
            else
                this.switchPlayer();
            this.render();
            return true;
        }
        return false;
    },
    move: function(movement) {
        if(this._board.validMoves(this._board.player(movement[0])).has(movement)) {
            var oldBoard = this._board;
            this._board = this._board.move(movement);
            if(oldBoard.moveFormsMill(movement))
                this.expectTake();
            else
                this.switchPlayer();
            this.render();
            return true;
        }
        return false;
    },
    aiTurn: function(player) {
        var boards = this._board.validTurns(this._nextPlayer);
        var newBoard = boards[Math.floor(Math.random()*boards.length)];
        if(newBoard == undefined)
            return false;
        this._board = newBoard;
        this.switchPlayer();
        this.render();
    }
};

// A wrapper class for test cases.
var Scenario = function(name, f) {
    this._name = name;
    this._test = {
        section: [
            {
                description: ('scenario: ' + name),
                part: 0,
                next: 0
            }
            ],
        passed: 0,
        failed: 0
    };
    this._f = f;
};

var AssertionFailure = function() {
};
var NextTestCase = function() {
};
Scenario.prototype = {
    // Run the test scenario, reporting any errors that occur.
    // The same scenario can be run multiple times.
    run: function() {
        console.log('begin scenario ' + this._name);
        try {
            this.when(this._name, this._f);
        } catch(e) {
            if(!(e instanceof NextTestCase))
                console.log('unexcepted exception from test case', e);
        }
        console.log('end scenario ' + this._name);
        console.log(
            '   ' + this._test.passed + ' assertions passed (out of ' +
            (this._test.passed + this._test.failed) + ')'
            );
    },
    // Introduce a new test case.
    // The test case should have a human-readable description which will be
    // printed if the test fails.
    // Test cases can be nested.
    when: function(description, f) {
        if(this._test.section.last().part != this._test.section.last().next) {
            ++this._test.section.last().part;
            return;
        }

        this._test.section.push(
            {
                description: ('when: ' + description),
                part: 0,
                next: 0
            }
            );
        while(true) {
            try {
                f.apply(this);
            } catch(e) {
                if(e instanceof NextTestCase)
                    continue;
                throw e;
            }
            break;
        }
        this._test.section.pop();

        this._test.section.last().part = 0;
        ++this._test.section.last().next;
        throw new NextTestCase();
    },
    // Check a condition is true.
    // The condition should have a human-readable description.
    check: function(description, truth) {
        if(truth) {
            ++this._test.passed;
        } else {
            ++this._test.failed;
            this._test.section.forEach(
                function(section) { console.log(section.description); }
                );
            console.log('check failed: ' + description);
        }
    },
    // Check that a function throws an exception.
    checkThrow: function(description, f) {
        var thrown = false;
        try {
            f();
        } catch(e) {
            thrown = true;
        }
        if(thrown) {
            ++this._test.passed;
        } else {
            ++this._test.failed;
            console.log('checkThrow failed: ' + description);
            this._test.section.forEach(
                function(section) { console.log('    ' + section.description); }
                );
        }
    },
    // Check a condition is true.
    // The condition should have a human-readable description.
    // If the condition is false, the surrounding test case will be terminated.
    require: function(description, truth) {
        if(truth) {
            ++this._test.passed;
        } else {
            ++this._test.failed;
            console.log('require failed: ' + description);
            this._test.section.forEach(
                function(section) { console.log('    ' + section); }
                );
            throw new AssertionFailure();
        }
    }
};

(new Scenario(
    'test tests',
    function() {
        var x = 1;
        this.when(
            'test case 1',
            function() {
                x = 2;
                this.check('x == 2', x == 2);

                var y = 'a';
                this.when(
                    'test case 1a',
                    function() {
                        y = 'b';
                        this.check('y == \'b\'', y == 'b');
                    }
                    );
                this.when(
                    'test case 1b',
                    function() {
                        this.check('y == \'a\'', y == 'a');
                    }
                    );
            }
            );
        this.when(
            'test case 2',
            function() {
                this.check('x == 1', x == 1);
            }
            );
    }
    )).run();

var arrayTests = new Scenario(
    'Array.prototype.equals',
    function() {
        var equalsTest = [[0,1],[2,3]];
        this.when(
            'an array is compared to some test arrays',
            function() {
                this.check(
                    'the array equals itself',
                    equalsTest.equals(equalsTest)
                    );
                this.check(
                    'the array does not equal the empty array',
                    !equalsTest.equals([])
                    );
                this.check(
                    'the array does not equal a same-sized array with different elements',
                    !equalsTest.equals([[0,1],[10,10]])
                    );
            }
            );
    }
    );
var boardTests = new Scenario(
    'Board',
    function() {
        this.when(
            'a board is empty',
            function() {
                var board = new Board;
                board.validTurns(0);
                this.check(
                    'player 0 has 24 valid turns',
                    (board.validTurns(0).length == 24)
                    );
            }
            );
        this.when(
            'a board has 18 pieces and one possible move would form a mill',
            function() {
                var board = new Board(
                        [
                        [0   , 0   , 0   , null, 1   , 1   , 1   , 0   ],
                        [0   , 1   , null, null, 1   , 1   , 0   , 0   ],
                        [1   , null, 1   , null, 1   , 0   , null, 0   ]
                        ]
                        );
                this.check(
                    'player 1 can make 16 moves (one allows player 1 to ' +
                    'remove one of 9 men)',
                    board.validTurns(1).length == 16
                    );
            }
            );
        this.when(
            'a board has 18 pieces',
            function() {
                var board = new Board(
                        [
                        [0   , 0   , 0   , null, 1   , 1   , 1   , 0   ],
                        [null, 1   , 1   , null, 1   , 1   , 0   , 0   ],
                        [1   , 0   , null, null, 1   , 0   , null, 0   ]
                        ]
                        );
                this.check(
                    'player 0 can make 5 moves',
                    board.validTurns(0).length == 5
                    );
                this.check(
                    'player 1 can make 5 moves',
                    board.validTurns(1).length == 5
                    );
                this.check(
                    'neither player has any unplaced pieces',
                    board._unplaced[0] == 0 && board._unplaced[1] == 0
                    );
                this.check(
                    'there are three mills',
                    board.mills().nestedSetEquals([
                        [[0, 0], [0, 1], [0, 2], 0],
                        [[0, 4], [0, 5], [0, 6], 1],
                        [[0, 7], [1, 7], [2, 7], 0]
                        ])
                    );
                this.checkThrow(
                    'trying to move to a taken point',
                    function() {
                        board.move([[1, 0], [0, 0]]);
                    }
                    );
            }
            );
        this.when(
            'a board has one piece',
            function() {
                var board = new Board(
                        [
                        [0   , null, null, null, null, null, null, null],
                        [null, null, null, null, null, null, null, null],
                        [null, null, null, null, null, null, null, null]
                        ]
                        );
                this.when(
                    'player 0 moves a man from (0, 0) to (0, 1)',
                    function() {
                        var newBoard = board.move([[0, 0], [0, 1]]);
                        this.check(
                            'the point moved from is empty',
                            newBoard.player([0, 0]) == null
                            );
                        this.check(
                            'there is a man at the point player 0 moved to',
                            newBoard.player([0, 1]) == 0
                            );
                    }
                    );
                this.check(
                    'player 0 has 8 unplaced pieces',
                    board._unplaced[0] == 8
                    );
                this.check(
                    'player 1 has 9 unplaced pieces',
                    board._unplaced[1] == 9
                    );
                this.check(
                    'player 0 can move from (0, 0) to (0, 1) or (0, 7)',
                    board.validMoves(0).setEquals(
                        [ [ [0, 0], [0, 1] ], [ [0, 0], [0, 7] ] ]
                        )
                    );
            }
            );
    }
    );

window.onload = function() {
    var canvas = document.getElementById('board');
    canvas.width = 400;
    canvas.height = 400;

    arrayTests.run();
    boardTests.run();
};

var game = null;

var startGame = function() {
    var canvas = document.getElementById('board');
    var statusElement = document.getElementById('status');
    var form = document.forms['start-form'];

    var radioValue = function(name) {
        var out;
        var list = document.getElementsByName(name);
        for(var i = 0; i < list.length; ++i)
            if(list[i].checked)
                out = list[i].value;
        return out;
    };
    var players = [radioValue('player0'), radioValue('player1')];

    game = new Game(players, canvas, statusElement);
    return false;
};

var stopGame = function() {
    if(game != null) {
        game.clear();
        game = null;
    }
};

