import { MarketplaceState } from "@app/shared-library/schemas/marketplace/schema.collection.item";

export interface CollectionItemResponseObject {
    tokenId: number;
    tokenUri: string;
    seller: string;
    owner: string;
    price: number;
    image: string;
    visuals: object;
    traits: object;
    rarity: string;
    contractAddress: string;
    collectionName: string;
    chainId: string;
    marketplaceState: MarketplaceState;
    lastUpdated: number,
    chainName: string;
    tokenSymbol: string;
    favourite: boolean
}

export interface Pagination {
    count: number;
    pages: number;
    next: string;
    prev: string;
}

export interface PaginatedCollectionItemsResponse {
    info: Pagination;
    result: CollectionItemResponseObject[];
}