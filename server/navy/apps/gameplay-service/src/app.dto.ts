export interface CreateOrJoinGameRequestDto {
    user: string;
}

export interface AddBotRequestDto {
    x?: number;
    y?: number;
    instanceId?: string;
}

export interface KillBotsRequestDto {
    instanceId: string;
}

export interface KillInstanceRequestDto {
    instanceId: string;
}

export interface AddInstanceRequestDto {
    bots: number;
}

export interface EnableFeatureRequestDto {
    enable: boolean;
}