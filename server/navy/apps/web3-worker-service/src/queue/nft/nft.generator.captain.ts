import { GenerateCaptainTraitsRequest, GetRandomCaptainTraitRequest, GetRandomCaptainTraitResponse } from "@app/shared-library/gprc/grpc.entity.service";
import { Collection } from "@app/shared-library/schemas/marketplace/schema.collection";
import { NftType, Rarity } from "@app/shared-library/shared-library.main";
import { NftSubPartDetails } from "@app/shared-library/workers/workers.marketplace";
import { Contract } from "ethers";
import { NftGenerator } from "./nft.generator";
import { CollectionItemDocument, MarketplaceState } from "@app/shared-library/schemas/marketplace/schema.collection.item";
import { Model } from "mongoose";
import { Logger } from "@nestjs/common";
import { SharedLibraryService } from "@app/shared-library";
import { CaptainSettingsDocument } from "@app/shared-library/schemas/entity/schema.captain.settings";
import { CaptainTraitDocument } from "@app/shared-library/schemas/entity/schema.captain.trait";

export interface CaptainStats {
    currentLevel: number;
    maxLevel: number;
    traits: any;
    rarity: number;
    // staking: boolean,
    // stakingRewardNVY: number;
    // stakingStartedAt: number;
    // stakingDurationSeconds: number;
}

export class NftCaptainGenerator extends NftGenerator {

    private metadataObject: any;

    private traitsCount = 0;
    private commonCaptainTraits = 0;
    private rareCaptainTraits = 0;
    private epicCaptainTraits = 0;
    private legendaryCaptainTraits = 0;

    private static readonly BackgroundVisualsMap = new Map<number, string>();
    private static readonly BodyVisualsMap = new Map<number, string>();
    private static readonly ClothesVisualsMap = new Map<number, string>();
    private static readonly FaceVisualsMap = new Map<number, string>();
    private static readonly AccessoryVisualsMap = new Map<number, string>();
    private static readonly HeadgearVisualsMap = new Map<number, string>();

    constructor(
        collection: Collection,
        private captainTraitModel: Model<CaptainTraitDocument>,
        private captainSettingsModel: Model<CaptainSettingsDocument>,
        private collectionItemModel: Model<CollectionItemDocument>
    ) {
        super(NftType.CAPTAIN, collection);

        NftCaptainGenerator.BackgroundVisualsMap.set(0, 'Bg 1');
        NftCaptainGenerator.BackgroundVisualsMap.set(1, 'Bg 2');
        NftCaptainGenerator.BackgroundVisualsMap.set(2, 'Bg 3');
        NftCaptainGenerator.BackgroundVisualsMap.set(3, 'Bg 4');
        NftCaptainGenerator.BackgroundVisualsMap.set(4, 'Bg 5');
        NftCaptainGenerator.BackgroundVisualsMap.set(5, 'Bg 6');
        NftCaptainGenerator.BackgroundVisualsMap.set(6, 'Bg 7');
        NftCaptainGenerator.BackgroundVisualsMap.set(7, 'Bg 8');
        NftCaptainGenerator.BackgroundVisualsMap.set(8, 'Bg 9');
        NftCaptainGenerator.BackgroundVisualsMap.set(9, 'Bg 10');
        NftCaptainGenerator.BackgroundVisualsMap.set(10, 'Bg 11');
        NftCaptainGenerator.BackgroundVisualsMap.set(11, 'Bg 12');

        NftCaptainGenerator.BodyVisualsMap.set(0, 'Sloth');

        NftCaptainGenerator.ClothesVisualsMap.set(0, 'Jacket 1');
        NftCaptainGenerator.ClothesVisualsMap.set(1, 'Jacket 2');
        NftCaptainGenerator.ClothesVisualsMap.set(2, 'Jacket 3');
        NftCaptainGenerator.ClothesVisualsMap.set(3, 'Jacket 4');
        NftCaptainGenerator.ClothesVisualsMap.set(4, 'Jacket 5');
        NftCaptainGenerator.ClothesVisualsMap.set(5, 'Jacket 6');

        NftCaptainGenerator.FaceVisualsMap.set(0, 'Upset');
        NftCaptainGenerator.FaceVisualsMap.set(1, 'Funny');
        NftCaptainGenerator.FaceVisualsMap.set(2, 'Mysterious');
        NftCaptainGenerator.FaceVisualsMap.set(3, 'Surprized');

        NftCaptainGenerator.AccessoryVisualsMap.set(0, 'Scarf');
        NftCaptainGenerator.AccessoryVisualsMap.set(1, 'Monocle');
        NftCaptainGenerator.AccessoryVisualsMap.set(2, 'Sunglasses');
        NftCaptainGenerator.AccessoryVisualsMap.set(3, 'Sigar');
        NftCaptainGenerator.AccessoryVisualsMap.set(4, 'Pirate band');
        NftCaptainGenerator.AccessoryVisualsMap.set(5, 'Pirate band');
        NftCaptainGenerator.AccessoryVisualsMap.set(6, 'Pirate band');

        NftCaptainGenerator.HeadgearVisualsMap.set(1, 'Hair 1');
        NftCaptainGenerator.HeadgearVisualsMap.set(2, 'Hair 2');
        NftCaptainGenerator.HeadgearVisualsMap.set(3, 'Hair 3');
        NftCaptainGenerator.HeadgearVisualsMap.set(4, 'Hair 4');
        NftCaptainGenerator.HeadgearVisualsMap.set(5, 'Pirate hat');
        NftCaptainGenerator.HeadgearVisualsMap.set(6, 'Crown');
        NftCaptainGenerator.HeadgearVisualsMap.set(7, 'Bandana');
        NftCaptainGenerator.HeadgearVisualsMap.set(8, 'Hat');
        NftCaptainGenerator.HeadgearVisualsMap.set(9, 'Captain cap');
    }

    async init() {
        const captainSettings = await this.captainSettingsModel.findOne();
        this.traitsCount = await this.captainTraitModel.count();
        this.commonCaptainTraits = captainSettings.commonCaptainDefaultTraits;
        this.rareCaptainTraits = captainSettings.rareCaptainDefaultTraits;
        this.epicCaptainTraits = captainSettings.epicCaptainDefaultTraits;
        this.legendaryCaptainTraits = captainSettings.legendaryCaptainDefaultTraits;
    }

    public static GenerateVisuals(metadata: any) {
        const visuals = [];
        const attributes = metadata.attributes;

        visuals.push({ trait_type: 'Background', value: NftCaptainGenerator.BackgroundVisualsMap.get(attributes[4].background) });
        visuals.push({ trait_type: 'Body', value: NftCaptainGenerator.BodyVisualsMap.get(attributes[5].body) });
        visuals.push({ trait_type: 'Clothes', value: NftCaptainGenerator.ClothesVisualsMap.get(attributes[6].clothes) });
        visuals.push({ trait_type: 'Face', value: NftCaptainGenerator.FaceVisualsMap.get(attributes[7].face) });

        if (attributes.length == 10) {
            visuals.push({ trait_type: 'Accessory', value: NftCaptainGenerator.AccessoryVisualsMap.get(attributes[8].accessory) });
            visuals.push({ trait_type: 'Headgear', value: NftCaptainGenerator.HeadgearVisualsMap.get(attributes[9].headgear) });
        } else {
            visuals.push({ trait_type: 'Headgear', value: NftCaptainGenerator.HeadgearVisualsMap.get(attributes[8].headgear) });
        }

        return visuals;
    }

    async generateNftMetadata(index: number, maxIndex: number, imagePathOnMoralis: string, nftPartsToDraw: NftSubPartDetails[]) {
        const captainStats = {
            currentLevel: 0,
            maxLevel: 10,
            rarity: this.rarity,
        } as CaptainStats;

        const captainTraits = await this.generateCaptainTraits({ rarity: this.rarity });

        const attributes: any[] = [
            { traits: captainTraits.traits },
            { currentLevel: captainStats.currentLevel },
            { maxLevel: captainStats.maxLevel },
            { rarity: captainStats.rarity },
        ]

        attributes.push({ background: nftPartsToDraw[0].index });
        attributes.push({ body: nftPartsToDraw[1].index });
        attributes.push({ clothes: nftPartsToDraw[2].index });
        attributes.push({ face: nftPartsToDraw[3].index });

        if (nftPartsToDraw.length == 5) {
            attributes.push({ headgear: nftPartsToDraw[4].index });
        } else {
            attributes.push({ accessory: nftPartsToDraw[4].index });
            attributes.push({ headgear: nftPartsToDraw[5].index });
        }

        this.metadataObject = {
            name: `Captain (${index}/${maxIndex})`,
            index,
            description: 'Navy.online Gen1 captains collection',
            image: imagePathOnMoralis,
            attributes
        };
        this.metadata = JSON.stringify(this.metadataObject);
    }

    async mintNft(owner: string, contract: Contract, metadataUrl: string) {
        await contract.grantCaptain(owner, metadataUrl);

        let rarity = 'Common';
        switch (this.metadataObject.attributes[3].rarity) {
            case Rarity.LEGENDARY:
                rarity = 'Legendary';
                break;
            case Rarity.EPIC:
                rarity = 'Epic';
                break;
            case Rarity.RARE:
                rarity = 'Rare';
                break;
        }

        const newCollectionModel = new this.collectionItemModel;
        newCollectionModel.id = contract.address + '_' + this.metadataObject.index;
        newCollectionModel.tokenId = this.metadataObject.index;
        newCollectionModel.tokenUri = metadataUrl;
        newCollectionModel.image = this.metadataObject.image;
        newCollectionModel.owner = owner.toLowerCase();
        newCollectionModel.traits = this.metadataObject.attributes[0].traits;
        newCollectionModel.visuals = NftCaptainGenerator.GenerateVisuals(this.metadataObject);
        newCollectionModel.rarity = rarity;
        newCollectionModel.contractAddress = contract.address;
        newCollectionModel.collectionName = 'captains';
        newCollectionModel.lastUpdated = Number((Date.now() / 1000).toFixed(0));
        newCollectionModel.chainId = '338';
        newCollectionModel.marketplaceState = MarketplaceState.NONE;
        await newCollectionModel.save();

        Logger.log(`Captain ${newCollectionModel.tokenId} minted!`);
    }

    private async getRandomCaptainTrait(request: GetRandomCaptainTraitRequest) {
        const response = {
            traits: []
        } as GetRandomCaptainTraitResponse;
        const excludeIndexes: number[] = [];
        if (request.excludeIds && request.excludeIds.length > 0) {
            excludeIndexes.push(...request.excludeIds);
        }

        for (let i = 0; i < request.count; i++) {
            const index = SharedLibraryService.GetRandomIntInRangeExcept(1, this.traitsCount, excludeIndexes);
            const trait = await this.captainTraitModel.findOne({ index });
            response.traits.push({
                index: trait.index,
                description: trait.description,
                bonusType: trait.bonusType,
                shipStatsAffected: trait.shipStatsAffected
            });
            excludeIndexes.push(trait.index);
        }

        return response;
    }

    private async generateCaptainTraits(request: GenerateCaptainTraitsRequest) {
        let traits = this.commonCaptainTraits;
        switch (request.rarity) {
            case Rarity.LEGENDARY:
                traits = this.legendaryCaptainTraits;
                break;
            case Rarity.EPIC:
                traits = this.epicCaptainTraits;
                break;
            case Rarity.RARE:
                traits = this.rareCaptainTraits;
                break;
        }
        return await this.getRandomCaptainTrait({
            count: traits,
            excludeIds: []
        });
    }
}