package client.network;

// -----------------------------------
// Common api
// -----------------------------------

class FounderCollections {
	public final captainsOnSale:Int;
	public final shipsOnSale:Int;
	public final islandsOnSale:Int;

	public function new(captainsOnSale:Int, shipsOnSale:Int, islandsOnSale:Int) {
		this.captainsOnSale = captainsOnSale;
		this.shipsOnSale = shipsOnSale;
		this.islandsOnSale = islandsOnSale;
	}
}

// -----------------------------------
// Moralis V2
// -----------------------------------

class MoralisNFTs {
	public final total:Int;
	public final nfts:Array<MoralisNFT>;

	public function new(total:Int, nfts:Array<MoralisNFT>) {
		this.total = total;
		this.nfts = nfts;
	}
}

class MoralisNFT {
	public final name:String;
	public final metadata:Dynamic;

	public function new(name:String, metadata:Dynamic) {
		this.name = name;
		this.metadata = metadata;
	}
}

// -----------------------------------
// Player
// -----------------------------------

class PlayerData {
	public final ethAddress:String;
	public final nickname:String;
	public var worldState:Int;
	public var worldX:Int;
	public var worldY:Int;

	public function new(ethAddress:String, nickname:String, worldX:Int, worldY:Int, worldState:Int) {
		this.ethAddress = ethAddress;
		this.nickname = nickname;
		this.worldX = worldX;
		this.worldY = worldY;
		this.worldState = worldState;
	}
}

// -----------------------------------
// World and sectors
// -----------------------------------

typedef Sector = {
	x:Int,
	y:Int,
	content:Int
}

class GameWorldData {
	public static final SectorEmptyType = 1;
	public static final SectorBaseType = 2;
	public static final SectorIslandType = 3;
	public static final SectorBossType = 4;
	public static final SectorPVEType = 5;
	public static final SectorPVPType = 6;

	public final size:Int;
	public final sectors:Array<Sector>;

	public function new(size:Int, sectors:Array<Sector>) {
		this.size = size;
		this.sectors = sectors;
	}
}

class JoinSectorResponse {
	public final result:Bool;
	public final reason:String;
	public final playersCount:Int;
	public final totalShips:Int;
	public final instanceId:String;
	public final sectorType:Int;

	public function new(result:Bool, reason:String, playersCount:Int, totalShips:Int, instanceId:String, sectorType:Int) {
		this.result = result;
		this.reason = reason;
		this.playersCount = playersCount;
		this.totalShips = totalShips;
		this.instanceId = instanceId;
		this.sectorType = sectorType;
	}
}