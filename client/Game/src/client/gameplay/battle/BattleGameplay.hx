package client.gameplay.battle;

import h2d.col.Point;
import h2d.Scene;
import hxd.Key in K;
import client.entity.ClientShell;
import client.entity.ClientShip;
import client.network.SocketProtocol;
import client.network.Socket;
import client.gameplay.BasicGameplay.GameState;
import client.manager.EffectsManager;
import game.engine.BaseEngine;
import game.engine.GameEngine;
import game.engine.MathUtils;
import game.engine.entity.EngineBaseGameEntity;
import game.engine.entity.EngineShellEntity;
import game.engine.entity.EngineShipEntity;
import game.engine.entity.TypesAndClasses;
import game.engine.geometry.Line;

enum InputType {
	Game;
	DebugCamera;
	DebugPlayerShip;
}

class BattleGameplay extends BasicGameplay {
	public static var CurrentSectorX = 0;
	public static var CurrentSectorY = 0;

	private final clientShells = new Map<String, ClientShell>();
	private final effectsManager:EffectsManager;

	// UI
	public final hud:BattleHud;
	public final waterScene:WaterScene;

	private var inputType = InputType.Game;

	private var leaveCallback:Void->Void;

	public function new(scene:h2d.Scene, engineMode:EngineMode, leaveCallback:Void->Void, diedCallback:Void->Void) {
		super(scene, new GameEngine(engineMode));

		this.leaveCallback = leaveCallback;

		// --------------------------------------
		// Game managers and services init
		// --------------------------------------

		final gameEngine = cast(baseEngine, GameEngine);

		gameEngine.createMainEntityCallback = function callback(engineShipEntity:EngineBaseGameEntity) {}
		gameEngine.createShellCallback = function callback(engineShellEntities:Array<EngineShellEntity>) {
			if (gameState == GameState.Playing) {
				final ownerEntity = clientMainEntities.get(engineShellEntities[0].getOwnerId());
				final shotParams = new Array<ShotParams>();
				if (ownerEntity != null) {
					final ownerShip = cast(ownerEntity, ClientShip);
					for (engineShell in engineShellEntities) {
						final clientShell = new ClientShell(engineShell, ownerShip);
						clientShells.set(engineShell.getId(), clientShell);
						addGameEntityToScene(clientShell);

						shotParams.push({
							speed: engineShell.getShellRnd().speed,
							dir: engineShell.getShellRnd().dir,
							rotation: engineShell.getShellRnd().rotation
						});
					}
				}
				if (gameEngine.engineMode == EngineMode.Server && !engineShellEntities[0].serverSide) {
					Socket.instance.shoot({
						playerId: playerId,
						left: engineShellEntities[0].getSide() == Side.Left ? true : false,
						shotParams: shotParams
					});
				}
				if (ownerEntity.getId() == playerEntityId) {
					// TODO update UI
				}
			}
		};

		gameEngine.deleteShellCallback = function callback(engineShellEntity:EngineShellEntity) {
			// clientShells.get(engineShellEntity.)
		};

		gameEngine.deleteMainEntityCallback = function callback(engineShipEntity:EngineBaseGameEntity) {
			if (gameState == GameState.Playing) {
				final clientEntity = clientMainEntities.get(engineShipEntity.getId());
				if (clientEntity != null) {
					final clientShip = cast(clientEntity, ClientShip);

					for (i in 0...7) {
						final dirX = Std.random(2);
						final dirY = Std.random(2);
						final offsetX = Std.random(50);
						final offsetY = Std.random(50);
						effectsManager.addShipExplosion(clientShip.x + (dirX == 1 ? offsetX : -offsetX), clientShip.y + (dirY == 1 ? offsetY : -offsetY));
					}

					clientShip.clearDebugGraphics(scene);
					scene.removeChild(clientShip);

					clientMainEntities.remove(engineShipEntity.getId());
					clientMainEntitiesCount--;

					if (engineShipEntity.getOwnerId() == playerId) {
						gameState = GameState.Died;
						hud.show(false);
						hud.showDieDialog(client.Player.instance.isCurrentShipIsFree);
						clearObjects();
					}
				}
			}
		};

		gameEngine.shipHitByShellCallback = function callback(params:ShipHitByShellCallbackParams) {
			if (gameState == GameState.Playing) {
				final clientShip = clientMainEntities.get(params.ship.getId());
				if (clientShip != null) {
					effectsManager.addDamageText(clientShip.x, clientShip.y, params.damage);
				}
			}
		};

		effectsManager = new EffectsManager(scene);

		// --------------------------------------
		// UI
		// --------------------------------------

		hud = new BattleHud(function callbackLeave() {
			destroy();
			Socket.instance.leaveGame({playerId: playerId});
			if (leaveCallback != null) {
				clearObjects();
				leaveCallback();
			}
		}, function callbackDied() {
			if (diedCallback != null) {
				clearObjects();
				diedCallback();
			}
		});

		waterScene = new WaterScene();

		maxDragX = 200;
		maxDragY = 200;
	}

	// --------------------------------------
	// Multiplayer
	// --------------------------------------

	public function updateDailyTasks() {
		hud.updateDailyTasks();
	}

	public function dailyTaskComplete(message:SocketServerDailyTaskComplete) {
		hud.dailyTaskComplete(message);
	}

	public function shipShoot(message:SocketServerMessageShipShoot) {
		if (gameState == GameState.Playing && playerId != message.playerId) {
			final side = message.left ? Side.Left : Side.Right;
			final gameEngine = cast(baseEngine, GameEngine);
			final shipId = gameEngine.getMainEntityIdByOwnerId(message.playerId);
			gameEngine.shipShootBySide(side, shipId, true, 0, message.shotParams);
		}
	}

	// --------------------------------------
	// Singleplayer
	// --------------------------------------

	public override function startGameSingleplayer(playerId:String, entities:Array<EngineBaseGameEntity>) {
		super.startGameSingleplayer(playerId, entities);
		hud.show(true);
		// retryDialogComp.alpha = 0;
		// startGameDialogComp.alpha = 0;
	}

	public function addShipByClient(shipObjectEntity:ShipObjectEntity) {
		final gameEngine = cast(baseEngine, GameEngine);
		final shipEntity = new EngineShipEntity(shipObjectEntity);
		gameEngine.createMainEntity(shipEntity);
		return shipEntity;
	}

	// --------------------------------------
	// Impl
	// --------------------------------------

	public function customUpdate(dt:Float, fps:Float) {
		hud.update(dt);
		waterScene.update(dt);

		if (gameState == GameState.Playing) {
			hud.updateSystemInfo(fps);

			effectsManager.update();

			updateInput();

			for (ship in baseEngine.getMainEntities()) {
				if (clientMainEntities.exists(ship.getId())) {
					final clientShip = clientMainEntities.get(ship.getId());
					clientShip.update(dt);
				}
			}

			final shellsToDelete:Array<String> = [];

			for (shell in clientShells) {
				shell.update(dt);

				if (!shell.isAlive()) {
					shellsToDelete.push(shell.getId());
				}
			}

			for (i in 0...shellsToDelete.length) {
				final key = shellsToDelete[i];
				var shell = clientShells.get(key);
				if (shell != null) {
					final dieEffect = shell.getDieEffect();
					if (dieEffect == DieEffect.Splash) {
						effectsManager.addSplash(shell.x, shell.y);
					} else if (dieEffect == DieEffect.Explosion) {
						effectsManager.addExplosion(shell.x, shell.y);
					}
					scene.removeChild(shell);
					clientShells.remove(key);
				}
			}

			final playerShip = cast(getPlayerEntity(), ClientShip);

			if (playerShip != null) {
				waterScene.updatePlayerMovement(playerShip.isMoving, playerShip.isMovingForward, playerShip.localDirection, playerShip.currentSpeed);
			} else {
				waterScene.updatePlayerMovement(false);
			}

			hud.updatePlayerParams(playerShip);
		}
	}

	public function customStartGame() {
		trace('customStartGame');
		hud.show(true);
	}

	public function customInput(mousePos:Point, mouseLeft:Bool, mouseRight:Bool) {
		final leftClick = K.isPressed(K.MOUSE_LEFT);
		if (leftClick) {
			final gameEngine = cast(baseEngine, GameEngine);
			final projectedMouseCoords = mouseCoordsToCamera();
			final playerShip = cast(getPlayerEntity(), ClientShip);
			final playerShipRect = playerShip.getBodyRectangle();
			final cursorToPlayerShipLine = new Line(projectedMouseCoords.x, projectedMouseCoords.y, playerShip.x, playerShip.y);

			// TODO
			final cannonsFiringRange = playerShip.getCannonsFiringAreaBySide(Left);

			// TODO refactor it by one event !!!
			for (cannonFiringRange in cannonsFiringRange) {
				final shootAngle = MathUtils.angleBetweenPoints(new Point(cannonFiringRange.center.x, cannonFiringRange.center.y),
					new Point(projectedMouseCoords.x, projectedMouseCoords.y));

				// trace('Shoot: ' + MathUtils.radsToDegree(shootAngle));

				// final shootAngle = MathUtils.degreeToRads(20);

				if (playerShipRect.getLines().lineA.intersectsWithLine(cursorToPlayerShipLine)) {
					gameEngine.shipShootBySide(Left, playerEntityId, false, shootAngle);
				} else if (playerShipRect.getLines().lineC.intersectsWithLine(cursorToPlayerShipLine)) {
					// gameEngine.shipShootBySide(Right, playerEntityId, false, shootAngle);
				}
			}
		}
	}

	public function customUpdateWorldState() {
		// if (clientShipStats.currentHull != ship.currentHull || clientShipStats.currentArmor != ship.currentArmor) {
		// 	clientShip.updateHullAndArmor(ship.currentHull, ship.currentArmor);
		// 	if (ship.currentHull == 0 && clientShipStats.currentHull != 0) {
		// 		gameEngine.removeMainEntity(ship.id);
		// 	}
		// }
	}

	public function customSync() {
		// clientShip.updateHullAndArmor(ship.currentHull, ship.currentArmor);
	}

	// Utils

	public function jsEntityToEngineEntity(message:Dynamic):EngineBaseGameEntity {
		return new EngineShipEntity(serverMessageToObjectEntity(message));
	}

	public function jsEntitiesToEngineEntities(entities:Dynamic):Array<EngineBaseGameEntity> {
		return entities.map(entity -> {
			return new EngineShipEntity(serverMessageToObjectEntity(entity));
		});
	}

	private function serverMessageToObjectEntity(message:Dynamic):ShipObjectEntity {
		var shipRole = Role.Player;
		if (message.role == 'Bot') {
			shipRole = Role.Bot;
		} else if (message.role == 'Boss') {
			shipRole = Role.Boss;
		}

		return {
			x: message.x,
			y: message.y,
			minSpeed: message.minSpeed,
			maxSpeed: message.maxSpeed,
			acceleration: message.acceleration,
			direction: GameEntityDirection.createByIndex(message.direction),
			id: null,
			ownerId: playerId,
			serverShipRef: "",
			free: true,
			role: shipRole,
			shipHullSize: ShipHullSize.createByIndex(message.shipHullSize),
			shipWindows: ShipWindows.createByIndex(message.shipWindows),
			shipCannons: ShipCannons.createByIndex(message.shipCannons),
			cannonsRange: message.cannonsRange,
			cannonsDamage: message.cannonsDamage,
			armor: message.armor,
			hull: message.hull,
			accDelay: message.accDelay,
			turnDelay: message.turnDelay,
			fireDelay: message.fireDelay
		}
	}

	private function clearObjects() {
		effectsManager.clear();
		scene.removeChildren();
	}
}
