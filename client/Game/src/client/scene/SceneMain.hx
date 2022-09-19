package client.scene;

import client.network.RestProtocol.PlayerData;
import client.network.RestProtocol.CaptainEntity;
import client.network.RestProtocol.ShipEntity;
import client.network.RestProtocol.IslandEntity;
import client.network.Rest;
import client.ui.UiIsland;
import client.ui.UiToken;
import client.ui.UiAvatar;
import client.entity.ship.ShipTemplate;
import engine.entity.EngineShipEntity;
import h3d.Engine;
import h2d.Scene;

class SceneMain extends Scene {
	public final hud:SceneMainHud;

	private final baseShipX:Float;
	private final baseShipY:Float;

	private var currentCaptain:UiAvatar;
	private var currentCaptainIndex = 0;

	private var currentShip:ShipTemplate;
	private var currentShipIndex = 0;

	private var currentIsland:UiIsland;
	private var currentIslandIndex = 0;

	private var nvyTokens:UiToken;
	private var aksTokens:UiToken;

	private var miningAnimation:h2d.Anim;

	// Collections info
	private var captains = new Array<CaptainEntity>();
	private var ships = new Array<ShipEntity>();
	private var islands = new Array<IslandEntity>();

	public function new(startCallback:Void->Void) {
		super();

		scaleMode = LetterBox(1920, 1080, false, Left, Center);

		// Init moralis
		hud = new SceneMainHud(function metamaskLoginCallback(address:String) {
			client.Player.instance.ethAddress = address;
			hud.initiateWeb3(address);
			initiateBalances();
			signInOrUp();
		}, function unloggedInitCallback() {
			signInOrUp();
		}, function startGameCallback() {
			if (startCallback != null) {
				startCallback();
			}
		}, function refreshNFTsCallback() {
			trace('refreshNFTsCallback');
		}, function collectRewardCallback() {
			if (islands[currentIslandIndex].mining) {
				// TODO send request
			}
			trace('collectRewardCallback');
		}, function startMining() {
			if (islands[currentIslandIndex].mining) {
				// TODO send request
			}
			trace('startMining');
		});

		// Basic ship position
		baseShipX = Main.ScreenWidth / 2 - 230 + 200;
		baseShipY = Main.ScreenHeight / 2 + 30;

		initiateBalances();
	}

	public override function render(e:Engine) {
		hud.render(e);
		super.render(e);
	}

	public function getHud() {
		return hud;
	}

	public function start() {
		if (hud != null) {
			hud.addOrUpdateDailyTasks();
			updateBalances();
		}
	}

	public function updateBalances() {
		if (nvyTokens != null && aksTokens != null && client.Player.instance.playerData != null) {
			nvyTokens.setText(Std.string(client.Player.instance.playerData.nvy));
			aksTokens.setText(Std.string(client.Player.instance.playerData.aks));
		}
	}

	private function signInOrUp() {
		Rest.instance.signInOrUp(client.Player.instance.ethAddress, function callback(player:PlayerData) {
			client.Player.instance.playerData = player;

			currentCaptainIndex = 0;
			currentShipIndex = 0;
			currentIslandIndex = 0;

			captains = player.ownedCaptains;
			ships = player.ownedShips;
			islands = player.ownedIslands;

			hud.initiate();

			initiateCaptains();
			initiateShips();
			initiateIslands();
		});
	}

	private function changeCaptain(dir:Int) {
		if (captains.length > 1 || dir == 0) {
			if (dir > 0) {
				currentCaptainIndex += 1;
				if (currentCaptainIndex == captains.length) {
					currentCaptainIndex = 0;
				}
			} else if (dir < 0) {
				currentCaptainIndex -= 1;
				if (currentCaptainIndex < 0) {
					currentCaptainIndex = captains.length - 1;
				}
			} else {
				currentCaptainIndex = 0;
			}
			final newCaptainInfo = captains[currentCaptainIndex];
			currentCaptain.setVisuals(newCaptainInfo.head, newCaptainInfo.haircutOrHat, newCaptainInfo.clothes, newCaptainInfo.bg, newCaptainInfo.acc);

			hud.updateCaptainUi(newCaptainInfo);
		}
	}

	private function changeShip(dir:Int) {
		if (ships.length > 1 || dir == 0) {
			if (dir > 0) {
				currentShipIndex += 1;
				if (currentShipIndex == ships.length) {
					currentShipIndex = 0;
				}
			} else if (dir < 0) {
				currentShipIndex -= 1;
				if (currentShipIndex < 0) {
					currentShipIndex = ships.length - 1;
				}
			} else {
				currentShipIndex = 0;
			}

			final newShipInfo = ships[currentShipIndex];
			final shipSize = newShipInfo.size == 1 ? SMALL : MEDIUM;

			var shipCannons = ShipGuns.ONE;
			if (newShipInfo.cannons == 2) {
				shipCannons = ShipGuns.TWO;
			} else if (newShipInfo.cannons == 3) {
				shipCannons = ShipGuns.THREE;
			} else if (newShipInfo.cannons == 4) {
				shipCannons = ShipGuns.FOUR;
			}

			var shipWindows = ShipWindows.NONE;
			if (newShipInfo.windows == 1) {
				shipWindows = ShipWindows.ONE;
			} else if (newShipInfo.windows == 2) {
				shipWindows = ShipWindows.TWO;
			}

			if (currentShip != null) {
				removeChild(currentShip);
			}
			currentShip = new ShipTemplate(shipSize, shipWindows, shipCannons);
			if (currentShip.shipSize == SMALL) {
				currentShip.setPosition(1150, 260);
			} else {
				currentShip.setPosition(1190, 260);
			}
			currentShip.setScale(1.5);
			addChild(currentShip);

			hud.updateShipUi(newShipInfo);

			client.Player.instance.currentShipId = newShipInfo.type == 1 ? 'free' : newShipInfo.id;
		}
	}

	private function changeIsland(dir:Int) {
		function newIslandByIndex(index:Int) {
			var terrainType = IslandTerrainType.GREEN;
			if (islands[index].terrain == 'Dark') {
				terrainType = IslandTerrainType.DARK;
			} else if (islands[index].terrain == 'Snow') {
				terrainType = IslandTerrainType.SNOW;
			}
			currentIsland = new UiIsland(terrainType);
			// miningAnimation.alpha = islands[index].mining ? 1 : 0;
		}

		if (islands.length > 1 || dir == 0) {
			if (currentIsland != null) {
				removeChild(currentIsland);
				removeChild(miningAnimation);
			}
			if (dir == 0) {
				newIslandByIndex(0);
			} else {
				if (dir == 1) {
					currentIslandIndex += 1;
					if (currentIslandIndex == islands.length) {
						currentIslandIndex = 0;
					}
				} else {
					currentIslandIndex -= 1;
					if (currentIslandIndex < 0) {
						currentIslandIndex = islands.length - 1;
					}
				}
				newIslandByIndex(currentIslandIndex);
			}
			currentIsland.setPosition(1700, 100);
			addChild(currentIsland);
			addChild(miningAnimation);
			hud.updateIslandUi(islands[currentIslandIndex]);
		}
	}

	// ---------------------------------
	// UI parts
	// ---------------------------------

	private function initiateBalances() {
		nvyTokens = new UiToken(TokenType.NVY, hud.widePlate(2));
		aksTokens = new UiToken(TokenType.AKS, hud.widePlate(2));

		nvyTokens.setPosition(Main.ScreenWidth + 30, 16);
		aksTokens.setPosition(Main.ScreenWidth + 30, 134);

		addChild(nvyTokens);
		addChild(aksTokens);

		updateBalances();
	}

	private function initiateCaptains() {
		currentCaptain = new UiAvatar();
		currentCaptain.setPosition(510, 180);
		addChild(currentCaptain);

		final arrowCaptainLeft = hud.buttonArrowLeft(function callback() {
			changeCaptain(-1);
		}, true);
		final arrowCaptainRight = hud.buttonArrowRight(function callback() {
			changeCaptain(1);
		}, true);

		arrowCaptainLeft.setPosition(400, 200);
		arrowCaptainRight.setPosition(660, 200);

		addChild(arrowCaptainLeft);
		addChild(arrowCaptainRight);

		changeCaptain(0);
	}

	private function initiateShips() {
		final arrowLeftShip = hud.buttonArrowLeft(function callback() {
			changeShip(-1);
		}, false);
		final arrowRightShip = hud.buttonArrowRight(function callback() {
			changeShip(1);
		}, false);

		arrowLeftShip.setPosition(800, 200);
		arrowRightShip.setPosition(1430, 200);

		addChild(arrowLeftShip);
		addChild(arrowRightShip);

		changeShip(0);
	}

	private function initiateIslands() {
		if (islands.length > 0) {
			final miningAnimation1 = hxd.Res.mine_anims._1.toTile();
			final miningAnimation2 = hxd.Res.mine_anims._2.toTile();
			final miningAnimation3 = hxd.Res.mine_anims._3.toTile();
			final miningAnimation4 = hxd.Res.mine_anims._4.toTile();
			final miningAnimation5 = hxd.Res.mine_anims._5.toTile();
			final miningAnimation6 = hxd.Res.mine_anims._6.toTile();
			final miningAnimation7 = hxd.Res.mine_anims._7.toTile();
			final miningAnimation8 = hxd.Res.mine_anims._8.toTile();

			miningAnimation = new h2d.Anim([
				miningAnimation1,
				miningAnimation2,
				miningAnimation3,
				miningAnimation4,
				miningAnimation5,
				miningAnimation6,
				miningAnimation7,
				miningAnimation8
			]);
			miningAnimation.setScale(5);
			miningAnimation.setPosition(1764, 230);
			miningAnimation.alpha = 1;

			final arrowLeftIsland = hud.buttonArrowLeft(function callback() {
				changeIsland(-1);
			}, false);
			final arrowRightIsland = hud.buttonArrowRight(function callback() {
				changeIsland(1);
			}, false);
			arrowLeftIsland.setPosition(Main.ScreenWidth - 340, 200);
			arrowRightIsland.setPosition(Main.ScreenWidth + 100, 200);

			changeIsland(0);
		}
	}
}
