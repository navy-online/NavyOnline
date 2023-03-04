import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameplayType } from './gameplay.base.service';
import { Logger } from '@nestjs/common';
import {
    NotifyPlayerEventMsg,
    AppEvents,
    NotifyEachPlayerEventMsg,
    PlayerDisconnectedEvent
} from '../app.events';
import {
    SocketClientMessageJoinGame,
    SocketServerMessageGameInit,
    WsProtocol,
    SocketServerMessageRemoveEntity,
    SocketClientMessageSync,
    SocketServerMessageSync,
    SocketClientMessageInput,
    SocketServerMessageEntityInput
} from '../ws/ws.protocol';
import { BaseGameObject } from '@app/shared-library/entities/entity.base';
import { Constants } from '../app.constants';

export abstract class BaseGameplayInstance {

    public readonly destroyEmptyInstanceTimeoutMS = 10000;
    public readonly worldStateUpdateIntervalMS = 2000;
    public readonly instanceId: string;

    readonly creationTime = new Date().getTime();
    readonly playerEntityMap = new Map<string, string>();
    readonly entityPlayerMap = new Map<string, string>();
    notifyGameWorldStateTimer: NodeJS.Timer;

    constructor(
        public eventEmitter: EventEmitter2,
        public gameplayType: GameplayType,
        public gameEngine: any,
        public x: number,
        public y: number) {
        switch (gameplayType) {
            case GameplayType.BattleTest:
                this.instanceId = Constants.BATTLE_TEST_INSTANCE_ID;
                break;
            case GameplayType.IslandTest:
                this.instanceId = Constants.ISLAND_TEST_INSTANCE_ID;
                break;
            default:
                this.instanceId = uuidv4();
        }
    }

    // -------------------------------------
    // Abstract
    // -------------------------------------

    public abstract initiateEngineEntity(playerId: string, entityid: string): any;

    // -------------------------------------
    // General
    // -------------------------------------

    async addPlayer(playerId: string, entityid: string) {
        const engineEntity = this.initiateEngineEntity(playerId, entityid);
        if (engineEntity) {
            this.playerEntityMap.set(playerId, entityid);
            this.entityPlayerMap.set(entityid, playerId);
            return engineEntity;
        } else {
            return undefined;
        }
    }

    public getPlayersCount() {
        return this.playerEntityMap.size;
    }

    protected notifyPlayer(playerId: string, message: object, event: string) {
        const notifyPlayerEventMsg = {
            playerId,
            socketEvent: event,
            message
        } as NotifyPlayerEventMsg;

        this.eventEmitter.emit(AppEvents.NotifyPlayer, notifyPlayerEventMsg);
    }

    protected notifyAllPlayers(message: object, event: string) {
        const notifyEachPlayerEventMsg = {
            instanceId: this.instanceId,
            socketEvent: event,
            message
        } as NotifyEachPlayerEventMsg;

        this.eventEmitter.emit(AppEvents.NotifyEachPlayer, notifyEachPlayerEventMsg);
    }

    public destroyByTimeIfNeeded() {
        if (this.gameplayType == GameplayType.BattleTest || this.gameplayType == GameplayType.IslandTest) {
            return false;
        }
        const now = new Date().getTime();
        if (this.creationTime + this.destroyEmptyInstanceTimeoutMS < now && this.getPlayersCount() == 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    public destroy() {
        try {
            clearInterval(this.notifyGameWorldStateTimer);
            this.playerEntityMap.clear();
            this.entityPlayerMap.clear();
            this.gameEngine.destroy();
            Logger.log('Destroy instance. Type: ' + GameplayType[this.gameplayType] + ', id: ' + this.instanceId);
        } catch (e) {
            Logger.error(e);
        }
    }

    // -------------------------------------
    // Player input events
    // -------------------------------------

    async handlePlayerJoinedEvent(data: SocketClientMessageJoinGame) {
        await this.addPlayer(data.playerId, data.entityId);

        const socketServerMessageGameInit = {
            instanceId: this.instanceId,
            tickRate: this.gameEngine.gameLoop.targetFps,
            worldStateSyncInterval: this.worldStateUpdateIntervalMS,
            entities: this.collectEntities()
        } as SocketServerMessageGameInit;

        this.notifyPlayer(data.playerId, socketServerMessageGameInit, WsProtocol.SocketServerEventGameInit);
    }

    async handlePlayerDisconnected(data: PlayerDisconnectedEvent) {
        const entity = this.playerEntityMap.get(data.playerId);
        if (entity) {
            this.playerEntityMap.delete(data.playerId);
            this.entityPlayerMap.delete(entity);
            this.gameEngine.removeMainEntity(entity);

            const socketServerMessageRemoveEntity = {
                entityId: entity,
            } as SocketServerMessageRemoveEntity;

            this.notifyAllPlayers(socketServerMessageRemoveEntity, WsProtocol.SocketServerEventRemoveEntity);
        }
    }

    async handlePlayerInput(data: SocketClientMessageInput) {
        const playerEntityId = this.playerEntityMap.get(data.playerId);
        if (playerEntityId) {
            this.gameEngine.addInputCommand({
                index: data.index,
                inputType: data.playerInputType,
                entityId: playerEntityId,
                playerId: data.playerId
            });

            const socketServerMessageEntityInput = {
                entityId: playerEntityId,
                playerInputType: data.playerInputType
            } as SocketServerMessageEntityInput;
            this.notifyAllPlayers(socketServerMessageEntityInput, WsProtocol.SocketServerEventEntityInput);
        }
    }

    // async handlePlayerMove(data: SocketClientMessageMove) {
    //     const character = this.playerEntityMap.get(data.playerId);
    //     if (character) {
    //         if (data.up)
    //             this.gameEngine.entityMoveUp(character);
    //         if (data.down)
    //             this.gameEngine.entityMoveDown(character);
    //         if (data.left)
    //             this.gameEngine.entityMoveLeft(character);
    //         if (data.right)
    //             this.gameEngine.entityMoveRight(character);

    //         const socketServerMessageEntityMove = {
    //             entityId: character,
    //             up: data.up,
    //             down: data.down,
    //             left: data.left,
    //             right: data.right
    //         } as SocketServerMessageEntityMove;

    //         this.notifyAllPlayers(socketServerMessageEntityMove, WsProtocol.SocketServerEventEntityMove);
    //     }
    // }

    async handlePlayerSync(data: SocketClientMessageSync) {
        const ship = this.playerEntityMap.get(data.playerId);
        if (ship) {
            const socketServerMessageSync = {
                entities: this.collectEntities()
            } as SocketServerMessageSync;
            this.notifyPlayer(data.playerId, socketServerMessageSync, WsProtocol.SocketServerEventSync);
        }
    }

    // -------------------------------------
    // Data preparation
    // -------------------------------------

    private collectEntities() {
        const entities: BaseGameObject[] = [];
        for (const [key, value] of this.gameEngine.mainEntityManager.entities) {
            entities.push(this.converJsEntityToTypeScript(value));
        }
        return entities;
    }

    public abstract converJsEntityToTypeScript(jsEntity: any): BaseGameObject;
}