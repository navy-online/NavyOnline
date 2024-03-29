package game.engine.base.entity;

import haxe.Int32;
import uuid.Uuid;
import game.engine.base.BaseTypesAndClasses;
import game.engine.base.geometry.Rectangle;

interface GameEntityCustomUpdate {
	public function onUpdate():Void;
	public function postUpdate():Void;
}

interface GameEntityCustomCollide {
	public function onCollide():Void;
}

abstract class EngineBaseGameEntity {
	// ----------------------
	// General
	// ----------------------
	private var baseObjectEntity:BaseObjectEntity;
	private var lastDeltaTime:Float;
	private var previousTickHash:Int32;
	private var currentTickHash:Int32;

	public var isAlive = true;
	public var isCollides = true;
	public var isMovable = true;

	public var killerId:String;

	// ----------------------
	// Movement
	// ----------------------
	private var lastMovementInputCheck = 0.0;
	private var lastLocalMovementInputCheck = 0.0;

	public var dx = 0.0;
	public var dy = 0.0;

	// ----------------------
	// Geom shape
	// ----------------------
	public final shape:EntityShape;

	public var customUpdate:GameEntityCustomUpdate;
	public var customCollide:GameEntityCustomCollide;

	public function new(baseObjectEntity:BaseObjectEntity, shape:EntityShape) {
		this.baseObjectEntity = baseObjectEntity;
		this.shape = shape;

		if (baseObjectEntity.id == null) {
			this.baseObjectEntity.id = Uuid.short();
		}
		if (baseObjectEntity.ownerId == null) {
			this.baseObjectEntity.ownerId = Uuid.short();
		}
	}

	// ------------------------------------------------
	// Abstract
	// ------------------------------------------------

	public abstract function canMove(playerInputType:PlayerInputType):Bool;

	public abstract function updateHashImpl():Int32;

	// ------------------------------------------------
	// General
	// ------------------------------------------------

	public function update(dt:Float) {
		lastDeltaTime = dt;
		if (customUpdate != null)
			customUpdate.onUpdate();
		move();
		if (customUpdate != null)
			customUpdate.postUpdate();
		updateHash();
	}

	public function getBodyRectangle() {
		final shapeWidth = shape.width;
		final shapeHeight = shape.height;
		final rectOffsetX = shape.rectOffsetX;
		final rectOffsetY = shape.rectOffsetY;
		final x = baseObjectEntity.x;
		final y = baseObjectEntity.y;
		final direction = baseObjectEntity.direction;
		return new Rectangle(x + rectOffsetX, y + rectOffsetY, shapeWidth, shapeHeight, MathUtils.dirToRad(direction) + shape.rotation);
	}

	public function getVirtualBodyRectangleInFuture(ticks:Int) {
		final cachedPositionX = baseObjectEntity.x;
		final cachedPositionY = baseObjectEntity.y;
		for (i in 0...ticks) {
			move();
		}
		final resultingRect = getBodyRectangle();
		baseObjectEntity.x = cachedPositionX;
		baseObjectEntity.y = cachedPositionY;
		return resultingRect;
	}

	public function getForwardLookingLine(lineLength:Int) {
		final rect = getBodyRectangle();
		final x = rect.getCenter().x;
		final y = rect.getCenter().y;
		return {
			p1: rect.getCenter(),
			p2: MathUtils.rotatePointAroundCenter(x + lineLength, y, x, y, baseObjectEntity.rotation)
		}
	}

	public function collides(isCollides:Bool) {
		this.isCollides = isCollides;
		if (customCollide != null)
			customCollide.onCollide();
	}

	public function isChanged() {
		return previousTickHash != currentTickHash;
	}

	function updateHash() {
		final hash = updateHashImpl();
		if (previousTickHash == null && currentTickHash == null) {
			previousTickHash = hash;
			currentTickHash = hash;
		} else {
			previousTickHash = currentTickHash;
			currentTickHash = hash;
		}
	}

	// ------------------------------------------------
	// Movement
	// ------------------------------------------------

	public function checkMovementInput() {
		final now = haxe.Timer.stamp();
		if (lastMovementInputCheck == 0 || lastMovementInputCheck + baseObjectEntity.movementDelay < now) {
			lastMovementInputCheck = now;
			return true;
		} else {
			return false;
		}
	}

	public function checkLocalMovementInput() {
		final now = haxe.Timer.stamp();
		if (lastLocalMovementInputCheck == 0 || lastLocalMovementInputCheck + baseObjectEntity.movementDelay < now) {
			lastLocalMovementInputCheck = now;
			return true;
		} else {
			return false;
		}
	}

	function moveStepInDirection(plainDirection:PlainDirection) {
		switch (plainDirection) {
			case UP:
				baseObjectEntity.y -= baseObjectEntity.acceleration * lastDeltaTime;
			case DOWN:
				baseObjectEntity.y += baseObjectEntity.acceleration * lastDeltaTime;
			case LEFT:
				baseObjectEntity.x -= baseObjectEntity.acceleration * lastDeltaTime;
			case RIGHT:
				baseObjectEntity.x += baseObjectEntity.acceleration * lastDeltaTime;
		}
	}

	private function move() {
		if (baseObjectEntity.currentSpeed != 0) {
			dx = baseObjectEntity.currentSpeed * Math.cos(baseObjectEntity.rotation) * lastDeltaTime;
			dy = baseObjectEntity.currentSpeed * Math.sin(baseObjectEntity.rotation) * lastDeltaTime;
			baseObjectEntity.x += dx;
			baseObjectEntity.y += dy;
		}
	}

	// ------------------------------------------------
	// Getters
	// ------------------------------------------------

	public function getX() {
		return baseObjectEntity.x;
	}

	public function getY() {
		return baseObjectEntity.y;
	}

	public function getId() {
		return baseObjectEntity.id;
	}

	public function getOwnerId() {
		return baseObjectEntity.ownerId;
	}

	public function getDirection() {
		return baseObjectEntity.direction;
	}

	public function getMaxSpeed() {
		return baseObjectEntity.maxSpeed;
	}

	public function getMinSpeed() {
		return baseObjectEntity.minSpeed;
	}

	public function getRotation() {
		return baseObjectEntity.rotation;
	}

	public function getCurrentSpeed() {
		return baseObjectEntity.currentSpeed;
	}

	// ------------------------------------------------
	// Setters
	// ------------------------------------------------

	public function setX(x:Float) {
		baseObjectEntity.x = x;
	}

	public function setY(y:Float) {
		baseObjectEntity.y = y;
	}

	public function setRotation(r:Float) {
		baseObjectEntity.rotation = r;
	}

	public function incrementRotation(r:Float) {
		baseObjectEntity.rotation += r;
	}

	public function decrementRotation(r:Float) {
		baseObjectEntity.rotation -= r;
	}

	public function setCurrentSpeed(speed:Int) {
		return baseObjectEntity.currentSpeed = speed;
	}
}
