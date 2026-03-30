class SudokuGenerator {
    constructor() {
        this.board = Array(81).fill(0);
        this.solution = Array(81).fill(0);
    }

    // Helper functions for 1D array representing 9x9 grid
    getRow(index) { return Math.floor(index / 9); }
    getCol(index) { return index % 9; }
    getBlock(index) {
        return Math.floor(this.getRow(index) / 3) * 3 + Math.floor(this.getCol(index) / 3);
    }

    isValid(board, index, num) {
        const row = this.getRow(index);
        const col = this.getCol(index);
        const block = this.getBlock(index);

        for (let i = 0; i < 81; i++) {
            if (i !== index && board[i] === num) {
                if (this.getRow(i) === row || this.getCol(i) === col || this.getBlock(i) === block) {
                    return false;
                }
            }
        }
        return true;
    }

    fillBoard(board) {
        for (let i = 0; i < 81; i++) {
            if (board[i] === 0) {
                // Try random numbers 1-9 to make generation unique
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (this.isValid(board, i, num)) {
                        board[i] = num;
                        if (this.fillBoard(board)) {
                            return true;
                        }
                        board[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    generate(difficulty = 'easy') {
        this.board = Array(81).fill(0);
        
        // Generate full solution
        this.fillBoard(this.board);
        this.solution = [...this.board];

        // Determine how many cells to remove
        let emptyCells = 30; // easy
        if (difficulty === 'medium') emptyCells = 45;
        if (difficulty === 'hard') emptyCells = 55;

        // Removing numbers randomly
        let removed = 0;
        while (removed < emptyCells) {
            let idx = Math.floor(Math.random() * 81);
            if (this.board[idx] !== 0) {
                this.board[idx] = 0;
                removed++;
            }
        }

        return {
            board: this.board,
            solution: this.solution
        };
    }
}
