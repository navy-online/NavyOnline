import { EthersConstants } from "@app/shared-library/ethers/ethers.constants";
import { Collection, CollectionDocument } from "@app/shared-library/schemas/marketplace/schema.collection";
import { CollectionItem, CollectionItemDocument, MarketplaceState } from "@app/shared-library/schemas/marketplace/schema.collection.item";
import { Mint, MintDocument } from "@app/shared-library/schemas/marketplace/schema.mint";
import { UserProfile } from "@app/shared-library/schemas/schema.user.profile";
import { Converter } from "@app/shared-library/shared-library.converter";
import { Utils } from "@app/shared-library/utils";
import { BadGatewayException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Document } from "mongoose";
import { AppService } from "../app.service";
import { AuthApiService } from "./api.auth";
import { FavouriteApiService } from "./api.favourite";
import { GeneralApiService } from "./api.general";

@Injectable()
export class CollectionApiService {

    constructor(
        private readonly generalApiService: GeneralApiService,
        private readonly favouriteService: FavouriteApiService,
        private readonly authService: AuthApiService,
        @InjectModel(Mint.name) private mintModel: Model<MintDocument>,
        @InjectModel(Collection.name) private collectionModel: Model<CollectionDocument>,
        @InjectModel(CollectionItem.name) private collectionItemModel: Model<CollectionItemDocument>,
    ) {
    }

    async getCollection(contractAddress: string) {
        const collection = await this.collectionModel.findOne({ contractAddress }).select(['-_id', '-__v']);
        if (!collection) {
            throw new BadGatewayException();
        }
        return collection;
    }

    async getCollectionItems(
        authToken: string | undefined,
        marketplaceState: MarketplaceState,
        contractAddress: string,
        page?: number,
        size?: number,
        rarity?: string
    ) {
        let userProfile = undefined;
        if (authToken) {
            userProfile = await this.authService.checkTokenAndGetProfile(authToken);
        }

        let initialPage = page;
        if (!page) {
            page = 1;
            initialPage = 1;
        }
        const pageSize = size ? size : AppService.DefaultPaginationSize;

        // ----------------------------------
        // Query collection items count
        // ----------------------------------

        const query = {
            contractAddress: contractAddress.toLowerCase()
        };

        const rarityCheck = rarity && (rarity == 'Legendary' || rarity == 'Epic' || rarity == 'Rare' || rarity == 'Common');
        if (rarityCheck) {
            query['rarity'] = rarity;
        }

        let nftType = 'all';
        if (marketplaceState == MarketplaceState.LISTED) {
            nftType = 'listed';
            query['marketplaceState'] = marketplaceState;
        } else if (marketplaceState == MarketplaceState.SOLD) {
            nftType = 'sold';
            query['marketplaceState'] = marketplaceState;
        }

        const count = await this.collectionItemModel.countDocuments(query);

        // ----------------------------------
        // Query collection items
        // ----------------------------------

        const self = this;
        async function databaseQuery(sortCriteria: string) {
            const criteria = {
                contractAddress: contractAddress.toLowerCase()
            };
            if (rarityCheck) {
                criteria['rarity'] = rarity;
            }
            return await self.collectionItemModel
                .find(criteria)
                .select(['-_id', '-__v', '-id', '-needUpdate', '-visuals', '-traits'])
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .sort([['marketplaceState', 1], [sortCriteria, -1]]);
        }

        const result = await databaseQuery(marketplaceState == MarketplaceState.NONE ? 'tokenId' : 'lastUpdated');

        // ----------------------------------
        // Prepare paginated response
        // ----------------------------------

        const resultItems = this.convertCollectionItems(result, true);

        let pages = Math.ceil(count / pageSize);
        let next = null;
        let prev = null;

        if (pages < 1) {
            pages = 1;
        }
        if (pages > 1) {
            const getUrl = (p: number) => {
                let url = '';
                url = `https://navy.online/marketplace/collection/${contractAddress}/${nftType}?page=${p}`;
                if (size) {
                    url += '&size=' + size;
                }
                if (rarity) {
                    url += '&rarity=' + size;
                }
                return url;
            };

            next = ((page - 1) * pageSize) + result.length < (count) ? getUrl(Number(initialPage) + 1) : null;
            prev = page > 1 ? getUrl(page - 1) : null;
        }

        const response = {
            info: {
                count,
                pages,
                next,
                prev
            },
            result: resultItems
        };

        // ----------------------------------
        // Fill user favourite items 
        // ----------------------------------

        if (userProfile) {
            await this.fillCollectionItemsFavourites(response.result, userProfile);
        }

        return response;
    }

    async getFavouriteCollectionItemsByOwner(authToken: string) {
        const userProfile = await this.authService.checkTokenAndGetProfile(authToken);
        if (userProfile.ethAddress && userProfile.ethAddress.length > 0) {
            const userFavourites = await this.favouriteService.getFavoutireNftByUserProfile(userProfile);
            const result = await this.collectionItemModel
                .find({ '_id': { $in: userFavourites } })
                .select(['-_id', '-__v', '-id', '-needUpdate', '-visuals', '-traits'])
                .sort([['marketplaceState', 1], ['tokenId', -1]]);
            const collectionItems = result.map(f => {
                const collectionItem = Converter.ConvertCollectionItem(f, true);
                return collectionItem;
            });
            return collectionItems;
        } else {
            return [];
        }
    }

    async topSales(days?: string) {
        const response = [];
        const projects = await this.generalApiService.getProjects();
        if (projects) {
            const query = {
                contractAddress: [],
                marketplaceState: MarketplaceState.SOLD,
                lastUpdated: { $gte: Utils.GetDaysSeconds(days) }
            };

            projects[0].collections.forEach(collection => {
                query.contractAddress.push(collection.contractAddress);
            });

            const topSaleResult = await this.collectionItemModel
                .find(query)
                .select(['-_id', '-__v', '-id', '-needUpdate', '-visuals', '-traits'])
                .limit(9)
                .sort([['price', -1], ['lastUpdated', 1]]);
            topSaleResult.forEach(f => {
                response.push(Converter.ConvertCollectionItem(f, false));
            });
            return response;
        }
    }


    async getCollectionItemsByOwner(authToken: string) {
        const userProfile = await this.authService.checkTokenAndGetProfile(authToken);

        if (userProfile.ethAddress && userProfile.ethAddress.length > 0) {
            const owner = userProfile.ethAddress.toLowerCase();
            const collectionItems = [];

            collectionItems.push(...(await this.collectionItemModel
                .find({
                    marketplaceState: MarketplaceState.LISTED,
                    seller: owner
                })
                .select(['-_id', '-__v', '-id', '-needUpdate', '-visuals', '-traits'])));

            collectionItems.push(...await this.collectionItemModel
                .find({
                    marketplaceState: MarketplaceState.NONE,
                    owner: owner
                })
                .select(['-_id', '-__v', '-id', '-needUpdate', '-visuals', '-traits']));

            const resultItems = this.convertCollectionItems(collectionItems.sort(function (a, b) { return b.collectionAddress - a.collectionAddress }), false);
            await this.fillCollectionItemsFavourites(resultItems, userProfile);

            const result = {
                captains: {
                    total: 0,
                    items: []
                },
                ships: {
                    total: 0,
                    items: []
                },
                islands: {
                    total: 0,
                    items: []
                },
            };

            resultItems.forEach(f => {
                switch (f.contractAddress) {
                    case EthersConstants.CaptainContractAddress:
                        result.captains.total++;
                        result.captains.items.push(f);
                        break;
                    case EthersConstants.ShipContractAddress:
                        result.ships.total++;
                        result.ships.items.push(f);
                        break;
                    case EthersConstants.IslandContractAddress:
                        result.islands.total++;
                        result.islands.items.push(f);
                        break;
                }
            });

            return result;
        } else {
            return {};
        }
    }

    async getCollectionItem(authToken: string | undefined, address: string, tokenId: string) {
        const collectionItem = await this.collectionItemModel.findOne({
            contractAddress: address,
            tokenId
        }).select(['-_id', '-__v', '-needUpdate']);

        const traits = (collectionItem.traits as any).map(f => {
            if (f.value == '1') {
                f.value = 'Ship damage bonus'
            }
            return {
                trait_type: f.trait_type,
                value: f.value
            };
        });

        let favourite = false;
        if (authToken) {
            const userProfile = await this.authService.checkTokenAndGetProfile(authToken);
            const userFavourites = await this.favouriteService.getFavoutireNftIdsByUserProfile(userProfile);
            favourite = userFavourites.filter(f => f == collectionItem.tokenId).length > 0;
        }

        return Converter.ConvertCollectionItem(collectionItem, favourite);
    }

    async getMintByCollection(collectionAddress: string) {
        const collection = await this.getCollection(collectionAddress);
        if (!collection) {
            throw new BadGatewayException();
        }
        const mint = await this.mintModel.findOne({ _id: collection.mint }).select(['-_id', '-__v']);
        if (!mint) {
            throw new BadGatewayException();
        }
        return mint;
    }

    async fillCollectionItemsFavourites(collectionItems: any, userProfile: UserProfile & Document) {
        const userFavourites = await this.favouriteService.getFavoutireNftIdsByUserProfile(userProfile);
        const favouriteCollectionItemsIds = new Set<number>();
        userFavourites.forEach(f => {
            favouriteCollectionItemsIds.add(f);
        });
        collectionItems.forEach(f => {
            if (favouriteCollectionItemsIds.has(f.tokenId)) {
                f['favourite'] = true;
            } else {
                f['favourite'] = false;
            }
        });
    }

    private convertCollectionItems(collectionItems: any, swapSeller = false) {
        const resultItems = [];
        collectionItems.forEach(r => {
            const resultItem = {
                tokenId: r.tokenId,
                tokenUri: r.tokenUri,
                owner: r.owner,
                price: r.price,
                image: r.image,
                rarity: r.rarity,
                lastUpdated: r.lastUpdated,
                contractAddress: r.contractAddress,
                collectionName: r.collectionName,
                chainId: r.chainId,
                marketplaceState: r.marketplaceState
            };
            if (r.seller && swapSeller) {
                resultItem.owner = r.seller;
            }
            resultItems.push(resultItem);
        });
        return resultItems;
    }

}