package client.entity.ship;

import haxe.Int32;
import h2d.Layers;
import h2d.col.Point;
import utils.ReverseIterator;
import game.engine.base.BaseTypesAndClasses;
import game.engine.navy.NavyTypesAndClasses;
import game.engine.navy.entity.NavyEntitiesConfig;

class ShipTemplate extends h2d.Object {
	public var layers:h2d.Layers;
	public var direction:GameEntityDirection;

	// Is it possible to reuse from engine entity ?
	public final shipSize:ShipHullSize;
	public final shipWindows:ShipWindows;
	public final shipCannons:ShipCannons;

	// Cannons
	public var cannonsTotal:Int32;
	public final rightSideCannons = new Array<ShipCannon>();
	public final leftSideCannons = new Array<ShipCannon>();

	// Hull
	private final hull:ShipHull;

	// Sail and mast
	private final sailAndMast:ShipSailAndMast;

	// Decorative parts
	private final shipDecorations:ShipDecorations;

	private final rightCannonsLayer = 4;
	private final leftCannonsLayer = 5;

	// 1 - 4 > 3 > 2 > 1
	// 2 - 1 > 2 > 3 > 4
	private var cannonsDrawingOrder = 1;

	private var decorationsChanged = false;

	public function new(direction:GameEntityDirection, shipSize:ShipHullSize, shipWindows:ShipWindows, shipCannons:ShipCannons) {
		super();

		this.direction = direction;
		this.shipSize = shipSize;
		this.shipWindows = shipWindows;
		this.shipCannons = shipCannons;

		switch (shipCannons) {
			case ONE:
				cannonsTotal = 1;
			case TWO:
				cannonsTotal = 2;
			case THREE:
				cannonsTotal = 3;
			case FOUR:
				cannonsTotal = 4;
			case ZERO:
				cannonsTotal = 0;
		}

		layers = new Layers(this);

		// Hull init
		hull = new ShipHull(direction, shipSize);
		layers.add(hull, 0);

		// Decor
		shipDecorations = new ShipDecorations(direction, shipSize);
		layers.add(shipDecorations, 6);

		// Sail and mast
		sailAndMast = new ShipSailAndMast(direction, shipSize);
		layers.add(sailAndMast, 10);

		final cannonsInitialPosRight = shipSize == SMALL ? NavyEntitiesConfig.RightCannonsOffsetByDirSm.get(direction) : NavyEntitiesConfig.RightCannonsOffsetByDirMid.get(direction);
		final cannonsInitialPosLeft = shipSize == SMALL ? NavyEntitiesConfig.LeftCannonsOffsetByDirSm.get(direction) : NavyEntitiesConfig.LeftCannonsOffsetByDirMid.get(direction);

		for (i in 0...cannonsTotal) {
			rightSideCannons.push(new ShipCannon(this, shipSize, direction, RIGHT, cannonsInitialPosRight.positions[i]));
			leftSideCannons.push(new ShipCannon(this, shipSize, direction, LEFT, cannonsInitialPosLeft.positions[i]));
		}

		for (i in new ReverseIterator(cannonsTotal - 1, 0)) {
			layers.add(rightSideCannons[i], rightCannonsLayer);
			layers.add(leftSideCannons[i], leftCannonsLayer);
		}
	}

	public function update() {
		for (i in 0...cannonsTotal) {
			rightSideCannons[i].update();
			leftSideCannons[i].update();
		}
	}

	public function updateVisualComponents() {
		for (i in 0...cannonsTotal) {
			// rightSideCannons[i].setPosition(cannonsInitialPosRight.positions[i].x, cannonsInitialPosRight.positions[i].y);
			// leftSideCannons[i].setPosition(cannonsInitialPosLeft.positions[i].x, cannonsInitialPosLeft.positions[i].y);
		}
		shipDecorations.update();
	}

	// --------------------------------------
	// Cannons management
	// --------------------------------------

	public function updateCannonSightPos(side:Side, index:Int, point:Point) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		cannons[index].lastSightEndPointPos = point;
	}

	public function getCannonSightPos(side:Side, index:Int) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		return cannons[index].lastSightEndPointPos;
	}

	public function updateCannonFiringAreaAngle(side:Side, index:Int, angle:Float) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		cannons[index].lastSignAngle = angle;
	}

	public function getCannonFiringAreaAngle(side:Side, index:Int) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		return cannons[index].lastSignAngle;
	}

	public function updateCannonPositionOffset(side:Side, index:Int, x:Float, y:Float) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		cannons[index].positionOffset.x = x;
		cannons[index].positionOffset.y = y;
		cannons[index].updatePosition();
	}

	public function getCannonPositionOffset(side:Side, index:Int) {
		final cannons = side == LEFT ? leftSideCannons : rightSideCannons;
		return cannons[index].positionOffset;
	}

	// --------------------------------------

	public function changeDirRight() {
		switch (direction) {
			case EAST:
				direction = SOUTH_EAST;
				changeCannonsDrawingOrder();
			case SOUTH_EAST:
				direction = SOUTH;
			case SOUTH:
				direction = SOUTH_WEST;
			case SOUTH_WEST:
				direction = WEST;
			case WEST:
				direction = NORTH_WEST;
			case NORTH_WEST:
				direction = NORTH;
			case NORTH:
				direction = NORTH_EAST;
				changeCannonsDrawingOrder();
			case NORTH_EAST:
				direction = EAST;
		}
		hanldeDirectionChange();
	}

	public function changeDirLeft() {
		switch (direction) {
			case EAST:
				direction = NORTH_EAST;
			case NORTH_EAST:
				direction = NORTH;
			case NORTH:
				direction = NORTH_WEST;
			case NORTH_WEST:
				direction = WEST;
			case WEST:
				direction = SOUTH_WEST;
				changeCannonsDrawingOrder();
				shipDecorations.changeDrawingOrder();
				decorationsChanged = true;
			case SOUTH_WEST:
				direction = SOUTH;
			case SOUTH:
				direction = SOUTH_EAST;
			case SOUTH_EAST:
				direction = EAST;
				changeCannonsDrawingOrder();
				shipDecorations.changeDrawingOrder();
				decorationsChanged = true;
		}
		hanldeDirectionChange();
	}

	private function changeCannonsDrawingOrder() {
		var length = cannonsTotal;

		// Right side cannons
		final removedRightCannons = new Array<h2d.Object>();
		for (i in 0...length) {
			final rightCannon = layers.getChildAtLayer(0, rightCannonsLayer);
			removedRightCannons.push(rightCannon);
			layers.removeChild(rightCannon);
		}
		var i = length - 1;
		while (i >= 0) {
			layers.add(removedRightCannons[i], rightCannonsLayer);
			i--;
		}

		// Left side cannons
		final removedLeftCannons = new Array<h2d.Object>();
		for (i in 0...length) {
			final leftCannon = layers.getChildAtLayer(0, leftCannonsLayer);
			removedLeftCannons.push(leftCannon);
			layers.removeChild(leftCannon);
		}
		i = length - 1;
		while (i >= 0) {
			layers.add(removedLeftCannons[i], leftCannonsLayer);
			i--;
		}
	}

	private function hanldeDirectionChange() {
		hull.updateDirection(direction);
		sailAndMast.updateDirection(direction);
		shipDecorations.updateDirection(direction);

		final rightSideCannonsPos = shipSize == SMALL ? NavyEntitiesConfig.RightCannonsOffsetByDirSm.get(direction) : NavyEntitiesConfig.RightCannonsOffsetByDirMid.get(direction);
		final leftSideCannonsPos = shipSize == SMALL ? NavyEntitiesConfig.LeftCannonsOffsetByDirSm.get(direction) : NavyEntitiesConfig.LeftCannonsOffsetByDirMid.get(direction);

		for (i in 0...cannonsTotal) {
			rightSideCannons[i].updateDirection(direction);
			rightSideCannons[i].setPosition(rightSideCannonsPos.positions[i].x, rightSideCannonsPos.positions[i].y);

			leftSideCannons[i].updateDirection(direction);
			leftSideCannons[i].setPosition(leftSideCannonsPos.positions[i].x, leftSideCannonsPos.positions[i].y);
		}
	}

	public function shootRight() {
		for (cannon in rightSideCannons) {
			cannon.shoot();
		}
	}

	public function shootLeft() {
		for (cannon in leftSideCannons) {
			cannon.shoot();
		}
	}
}
