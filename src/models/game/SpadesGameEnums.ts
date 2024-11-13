// GameEnums.ts

export enum GameState {
    BIDDING = "bidding",
    TRICK_TAKING = "trick-taking",
    GAME_OVER = "game-over",
}

export enum PlayerAction {
    PLACE_BID = "PLACE_BID",
    PLAY_CARD = "PLAY_CARD",
    PASS_TURN = "PASS_TURN", // Example of other potential actions
}

export enum SocketEvent {
    ROOM_CREATED = "ROOM_CREATED",
    ROOM_STATE_UPDATED = "ROOM_STATE_UPDATED",
    GAME_STARTED = "GAME_STARTED",
    PLAYER_ACTION = "PLAYER_ACTION",
    GAME_STATE_UPDATE = "GAME_STATE_UPDATE",
    ERROR = "ERROR",
}
