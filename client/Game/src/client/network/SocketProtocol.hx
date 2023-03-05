package client.network;

import game.engine.entity.TypesAndClasses;

// -------------------------------------
// WebSocket server messages
// -------------------------------------

typedef SocketServerDailyTaskChange = {
	dailyPlayersKilledCurrent:Int,
	dailyPlayersKilledMax:Int,
	dailyBotsKilledCurrent:Int,
	dailyBotsKilledMax:Int,
	dailyBossesKilledCurrent:Int,
	dailyBossesKilledMax:Int
}

typedef SocketServerDailyTaskComplete = {
	dailyTaskType:Int,
	rewardNVY:Int,
	rewardAKS:Int,
}

typedef EntityCharacter = {
	y:Int,
	x:Int,
	id:String,
	ownerId:String
}

typedef SocketServerMessageGameInit = {
	tickRate:Int,
	worldStateSyncInterval:Int,
	entities:Array<Dynamic>
}

typedef SocketServerMessageUpdateWorldState = {
	entities:Array<Dynamic>
}

typedef SocketServerMessageAddEntity = {
	entity:Dynamic
}

typedef SocketServerMessageRemoveEntity = {
	entityId:String
}

typedef SocketServerMessageEntityInput = {
	playerId:String,
	playerInputType:PlayerInputType,
	?shootDetails:ShootInputDetails
}

typedef SocketServerMessageSync = {
	entities:Array<Dynamic>
}

// -------------------------------------
// WebSocket client messages
// -------------------------------------

typedef SocketClientMessageJoinGame = {
	playerId:String,
	instanceId:String,
	sectorType:Int,
	?entityId:String
}

typedef SocketClientMessageLeaveGame = {
	playerId:String
}

typedef SocketClientMessageInput = {
	playerId:String,
	playerInputType:PlayerInputType,
	index:Int,
	?shootDetails:ShootInputDetails
}

typedef SocketClientMessageSync = {
	playerId:String
}

typedef SocketClientMessageRespawn = {
	playerId:String
}

class SocketProtocol {
	// Server -> Client events
	public static final SocketServerEventPong = 'SocketServerEventPong';
	public static final SocketServerEventGameInit = 'SocketServerEventGameInit';
	public static final SocketServerEventAddEntity = 'SocketServerEventAddEntity';
	public static final SocketServerEventRemoveEntity = 'SocketServerEventRemoveEntity';
	public static final SocketServerEventUpdateWorldState = 'SocketServerEventUpdateWorldState';
	public static final SocketServerEventEntityInput = 'SocketServerEventEntityInput';
	public static final SocketServerEventSync = 'SocketServerEventSync';

	public static final SocketServerEventDailyTaskUpdate = 'SocketServerEventDailyTaskUpdate';
	public static final SocketServerEventDailyTaskReward = 'SocketServerEventDailyTaskReward';

	// Client -> Server events
	public static final SocketClientEventPing = 'SocketClientEventPing';
	public static final SocketClientEventJoinGame = 'SocketClientEventJoinGame';
	public static final SocketClientEventLeaveGame = 'SocketClientEventLeaveGame';

	public static final SocketClientEventInput = 'SocketClientEventInput';

	// public static final SocketClientEventMove = 'SocketClientEventMove';
	// public static final SocketClientEventShoot = 'SocketClientEventShoot';
	public static final SocketClientEventSync = 'SocketClientEventSync';
	public static final SocketClientEventRespawn = 'SocketClientEventRespawn';
}
