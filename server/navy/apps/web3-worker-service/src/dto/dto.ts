export interface NftPart {
    name: string,
    index: number
}

export interface GenerateNftImageDto {
    chainName: string;
    collectionName: string,
    amount: number,
    nftParts?: NftPart[]
}

export interface MintCaptainDto {
    chainName: string;
    owner: string;
    tokenId: number;
}