import { Web3Service, Web3ServiceGrpcClientName, Web3ServiceName } from '@app/shared-library/gprc/grpc.web3.service';
import { NotificationService, NotificationServiceGrpcClientName, NotificationServiceName } from '@app/shared-library/gprc/grpc.notification.service';
import { Project, ProjectDocument, ProjectState } from '@app/shared-library/schemas/marketplace/schema.project';
import { Collection, CollectionDocument } from '@app/shared-library/schemas/marketplace/schema.collection';
import { CollectionItem, CollectionItemDocument, MarketplaceState } from '@app/shared-library/schemas/marketplace/schema.collection.item';
import { Mint, MintDocument } from '@app/shared-library/schemas/marketplace/schema.mint';
import { Bid, BidDocument } from '@app/shared-library/schemas/marketplace/schema.bid';
import { BadGatewayException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { caching, MemoryCache } from 'cache-manager';
import { ClientGrpc } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import { ProjectCollection, ProjectDto } from './dto/dto.projects';
import { BidPlaceDto, BidDeleteDto } from './dto/dto.bids';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketplaceNftsType } from '@app/shared-library/workers/workers.marketplace';
import { lastValueFrom } from 'rxjs';
import { EthersConstants } from '@app/shared-library/ethers/ethers.constants';

import fetch from 'node-fetch';

const fs = require('fs');

@Injectable()
export class AppService implements OnModuleInit {

  private static readonly DefaultPaginationSize = 24;

  private web3Service: Web3Service;
  private notificationService: NotificationService;

  private memoryCache: MemoryCache;

  private cronosTokenUsdPrice = 0;

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Mint.name) private mintModel: Model<MintDocument>,
    @InjectModel(Collection.name) private collectionModel: Model<CollectionDocument>,
    @InjectModel(CollectionItem.name) private collectionItemModel: Model<CollectionItemDocument>,
    @InjectModel(Bid.name) private bidModel: Model<BidDocument>,
    @Inject(Web3ServiceGrpcClientName) private readonly web3ServiceGrpcClient: ClientGrpc,
    @Inject(NotificationServiceGrpcClientName) private readonly notificationServiceGrpcClient: ClientGrpc) {
  }

  async onModuleInit() {
    function loadFixture(fixtureName: string, callback: Function) {
      try {
        fs.readFile(join(__dirname, '..', 'marketplace-service') + '/fixtures/' + fixtureName, async (error: any, data: any) => {
          if (error) {
            Logger.error('Unable to load ' + fixtureName + ' fixture!', error);
          } else {
            const fixture = JSON.parse(data);
            Logger.log(fixtureName + ' loaded!');
            callback(fixture);
          }
        });
      } catch (error) {
        Logger.error('Unable to load ' + fixtureName + ' fixture!', error);
      }
    }

    const projectDetails = await this.projectModel.findOne();
    if (!projectDetails) {
      loadFixture('1_projects.json', async (fixtures: any) => {
        const fixture = fixtures[0];
        const project = new this.projectModel();
        project.name = fixture.name;
        project.active = fixture.active;
        project.state = fixture.state;
        project.supportedChains = fixture.supportedChains;

        loadFixture('2_collections.json', async (fixtures: any) => {
          const collections = [new this.collectionModel(), new this.collectionModel()];

          for (let i = 0; i < fixtures.length; i++) {
            collections[i].name = fixtures[i].name;
            collections[i].description = fixtures[i].description;
            collections[i].chainId = fixtures[i].chainId;
            collections[i].contractAddress = fixtures[i].contractAddress.toLowerCase();
            collections[i].collectionSize = fixtures[i].collectionSize;
            collections[i].collectionItemsLeft = fixtures[i].collectionItemsLeft;
            collections[i].preview = fixtures[i].preview;
          }

          loadFixture('3_mints.json', async (fixtures: any) => {
            for (let i = 0; i < fixtures.length; i++) {
              const mint = new this.mintModel();

              fixtures[i].mintingDetails.forEach(mintingDetail => {
                mintingDetail.saleContractAddress = mintingDetail.saleContractAddress.toLowerCase();
                mintingDetail.tokenContractAddress = mintingDetail.tokenContractAddress.toLowerCase();
              });

              mint.mintingEnabled = fixtures[i].mintingEnabled;
              mint.mintingStartTime = fixtures[i].mintingStartTime;
              mint.mintingEndTime = fixtures[i].mintingEndTime;
              mint.mintingDetails = fixtures[i].mintingDetails;

              mint.collectionSize = fixtures[i].collectionSize;
              mint.collectionItemsLeft = fixtures[i].collectionItemsLeft;
              mint.collectionPreview = fixtures[i].collectionPreview;

              mint.descriptionTitle = fixtures[i].descriptionTitle;
              mint.descriptionDescription = fixtures[i].descriptionDescription;

              mint.profitability = fixtures[i].profitability;
              mint.profitabilityTitle = fixtures[i].profitabilityTitle;
              mint.profitabilityValue = fixtures[i].profitabilityValue;
              mint.profitabilityDescription = fixtures[i].profitabilityDescription;

              mint.rarity = fixtures[i].rarity;
              mint.rarityTitle = fixtures[i].rarityTitle;
              mint.rarityDescription = fixtures[i].rarityDescription;
              mint.rarityItems = fixtures[i].rarityItems;

              mint.nftParts = fixtures[i].nftParts;
              mint.nftPartsTitle = fixtures[i].nftPartsTitle;
              mint.nftPartsDescription = fixtures[i].nftPartsDescription;
              mint.nftPartsItems = fixtures[i].nftPartsItems;

              collections[i].mint = await mint.save();
              project.collections.push(await collections[i].save());
            }

            await project.save();
          });
        });
      });

      loadFixture('4_collection_items.json', async (fixtures: any) => {
        for (let i = 0; i < fixtures.length; i++) {
          const collectionItem = new this.collectionItemModel();
          collectionItem.id = fixtures[i].id;
          collectionItem.tokenId = fixtures[i].tokenId;
          collectionItem.tokenUri = fixtures[i].tokenUri;
          collectionItem.seller = fixtures[i].seller;
          collectionItem.owner = fixtures[i].owner;
          collectionItem.price = fixtures[i].price;
          collectionItem.image = fixtures[i].image;
          collectionItem.rarity = fixtures[i].rarity;
          collectionItem.lastUpdated = fixtures[i].lastUpdated;
          collectionItem.needUpdate = fixtures[i].needUpdate;
          collectionItem.contractAddress = fixtures[i].contractAddress;
          collectionItem.chainId = fixtures[i].chainId;
          collectionItem.chainName = fixtures[i].chainName;
          collectionItem.coinSymbol = fixtures[i].coinSymbol;
          collectionItem.marketplaceState = fixtures[i].marketplaceState;
          await collectionItem.save();
        }
      });
    }

    // ------------------------------
    // Top sales dummy data
    // ------------------------------

    await this.collectionItemModel.deleteMany({
      marketplaceState: MarketplaceState.SOLD
    });

    const nowTimeSeconds = Number(Number(Date.now() / 1000).toFixed(0));
    const daySeconds = 24 * 60 * 60;
    let nextId = 54;
    let nextTimeSeconds = nowTimeSeconds;
    const defaultCollectionItem = {
      needUpdate: false,
      id: "0x61a03eed4c0220bb6ee89b0cda10dc171f772577_",
      tokenId: 0,
      tokenUri: "https://ipfs.moralis.io:2053/ipfs/QmQmRiVEaAbBnF7rnGNfaTMya2UH7NyRu2HCjc8HvN88R5/nvy/e1b50bc2-37f1-409d-af6a-32ba0b730e6a.json",
      seller: "0xe6193b058bbd559e8e0df3a48202a3cdec852ab6",
      owner: "0xac256b90b14465c37f789e16eb5efe0233bafe87",
      price: "15.5",
      image: "https://ipfs.moralis.io:2053/ipfs/QmVVqX2G1Rct5oCXqmCw3SeG3fzR6moJgtEVJs2QBoCbXX/nvy/e1b50bc2-37f1-409d-af6a-32ba0b730e6a.png",
      rarity: "Common",
      lastUpdated: 0,
      contractAddress: "0x61a03eed4c0220bb6ee89b0cda10dc171f772577",
      marketplaceState: 1,
      chainId: "338"
    };

    // 24h 
    for (let i = 0; i < 10; i++) {
      defaultCollectionItem.id += nextId;
      defaultCollectionItem.tokenId = nextId;
      defaultCollectionItem.lastUpdated = nextTimeSeconds;
      await new this.collectionItemModel(defaultCollectionItem).save();
      nextId++;
      nextTimeSeconds += 60 * 5;
    }
    nextTimeSeconds = nowTimeSeconds + (daySeconds * 7);

    // 7d 
    for (let i = 0; i < 10; i++) {
      defaultCollectionItem.id += nextId;
      defaultCollectionItem.tokenId = nextId;
      defaultCollectionItem.lastUpdated = nextTimeSeconds;
      await new this.collectionItemModel(defaultCollectionItem).save();
      nextId++;
      nextTimeSeconds += 60 * 5;
    }
    nextTimeSeconds = nowTimeSeconds + (daySeconds * 30);

    // 30d 
    for (let i = 0; i < 10; i++) {
      defaultCollectionItem.id += nextId;
      defaultCollectionItem.tokenId = nextId;
      defaultCollectionItem.lastUpdated = nextTimeSeconds;
      await new this.collectionItemModel(defaultCollectionItem).save();
      nextId++;
      nextTimeSeconds += 60 * 5;
    }

    // ------------------------------
    // Services initalization
    // ------------------------------

    this.web3Service = this.web3ServiceGrpcClient.getService<Web3Service>(Web3ServiceName);
    this.notificationService = this.notificationServiceGrpcClient.getService<NotificationService>(NotificationServiceName);

    this.memoryCache = await caching('memory', {
      max: 100,
      ttl: 60 * 1000 * 15, // 15 mins cache
    });

    await this.updateCronosTokenUsdPrice();
  }

  // ------------------------------------
  // Api
  // ------------------------------------

  async getProjects() {
    const result: ProjectDto[] = [];

    const projects = await this.projectModel.find({
      projectState: {
        "$ne": ProjectState.DISABLED
      }
    });

    for (const p of projects) {
      const project: ProjectDto = {
        name: p.name,
        state: p.state,
        active: p.active,
        collections: []
      };

      for (const c of p.collections) {
        const collection = await this.collectionModel.findById(c);
        project.collections.push({
          name: collection.name,
          contractAddress: collection.contractAddress,
          chainId: collection.chainId,
        } as ProjectCollection);
      }

      result.push(project);
    }

    if (result.length == 0) {
      throw new BadGatewayException();
    }

    return result;
  }

  async dashboard(project?: string, days?: string) {
    const topSales = await this.topSales(project, days);

    let cronosTotal = 0;
    let captainsSold = 0;
    let islandsSold = 0;
    let shipsSold = 0;

    if (topSales) {
      topSales.forEach(sale => {
        cronosTotal += Number(sale.price);

        if (EthersConstants.CaptainContractAddress == sale.contractAddress) {
          captainsSold++;
        }
        if (EthersConstants.ShipContractAddress == sale.contractAddress) {
          shipsSold++;
        }
        if (EthersConstants.IslandContractAddress == sale.contractAddress) {
          islandsSold++;
        }
      });
    }

    return {
      tokenPerformance: {
        chainId: 25,
        chainName: 'Cronos',
        coinSymbol: 'CRO',
        performance: cronosTotal
      },
      captainsSold,
      islandsSold,
      shipsSold
    }
  }

  async topSales(project?: string, days?: string) {
    const response = [];
    const projects = await this.getProjects();
    if (projects) {
      const query = {
        contractAddress: [],
        marketplaceNftsType: MarketplaceNftsType.SOLD,
        lastUpdated: { $lte: this.getDaysSeconds(days) }
      };
      projects[0].collections.forEach(collection => {
        query.contractAddress.push(collection.contractAddress);
      });
      const topSaleResult = await this.collectionItemModel
        .find(query)
        .select(['-_id', '-__v', '-id', '-needUpdate'])
        .limit(9)
        .sort([['lastUpdated', -1]]);
      topSaleResult.forEach(f => {
        response.push({
          tokenId: f.tokenId,
          tokenUri: f.tokenUri,
          seller: f.seller,
          owner: f.owner,
          price: f.price,
          image: f.image,
          rarity: f.rarity,
          lastUpdated: f.lastUpdated,
          contractAddress: f.contractAddress,
          chainId: f.chainId,
          marketplaceState: f.marketplaceState,
          coinDetails: {
            chainId: 25,
            chainName: 'Cronos',
            coinSymbol: 'CRO'
          }
        });
      });

      return response;
    }
  }

  async getCollection(contractAddress: string) {
    const collection = await this.collectionModel.findOne({ contractAddress }).select(['-_id', '-__v']);
    if (!collection) {
      throw new BadGatewayException();
    }
    return collection;
  }

  async getCollectionItems(marketplaceNftsType: MarketplaceNftsType, address: string, page?: number, size?: number, rarity?: string) {
    let initialPage = page;
    if (!page) {
      page = 1;
      initialPage = 1;
    }
    const pageSize = size ? size : AppService.DefaultPaginationSize;

    const query = {
      contractAddress: address.toLowerCase()
    };
    const rarityCheck = rarity && (rarity == 'Legendary' || rarity == 'Epic' || rarity == 'Rare' || rarity == 'Common');
    if (rarityCheck) {
      query['rarity'] = rarity;
    }

    let nftType = 'all';
    if (marketplaceNftsType == MarketplaceNftsType.LISTED) {
      nftType = 'listed';
      query['marketplaceState'] = marketplaceNftsType;
    } else if (marketplaceNftsType == MarketplaceNftsType.SOLD) {
      nftType = 'sold';
      query['marketplaceState'] = marketplaceNftsType;
    }

    const count = await this.collectionItemModel.countDocuments(query);
    const getUrl = (p: number) => `https://navy.online/marketplace/collection/${address}/${nftType}?page=${p}`;

    const self = this;
    async function databaseQuery(marketplaceState: MarketplaceNftsType, sortCriteria: string) {
      const criteria = {
        contractAddress: address
      };
      if (rarityCheck) {
        criteria['rarity'] = rarity;
      }
      return await self.collectionItemModel
        .find(criteria)
        .select(['-_id', '-__v', '-id', '-needUpdate'])
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort([['marketplaceState', 1], [sortCriteria, -1]]);
    }

    const result = await databaseQuery(marketplaceNftsType, marketplaceNftsType == MarketplaceNftsType.ALL ? 'tokenId' : 'lastUpdated');

    result.forEach(r => {
      if (r.seller) {
        r.owner = r.seller;
        r.seller = undefined;
      }
    });

    let pages = Math.ceil(count / pageSize);
    let next = null;
    let prev = null;

    if (pages < 1) {
      pages = 1;
    }
    if (pages > 1) {
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
      result
    };

    return response;
  }

  async getCollectionItemsByOwner(address: string, owner: string) {
    const result = [];

    address = address.toLowerCase();
    owner = owner.toLowerCase();

    result.push(...(await this.collectionItemModel
      .find({
        contractAddress: address.toLowerCase(),
        marketplaceState: MarketplaceNftsType.LISTED,
        seller: owner
      })
      .select(['-_id', '-__v', '-id', '-needUpdate'])));

    result.push(...await this.collectionItemModel
      .find({
        contractAddress: address.toLowerCase(),
        marketplaceState: MarketplaceNftsType.ALL,
        owner: owner.toLocaleLowerCase()
      })
      .select(['-_id', '-__v', '-id', '-needUpdate']));

    return result;
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

  async bidPlace(dto: BidPlaceDto) {
    const contractAddress = dto.contractAddress;
    const tokenId = dto.tokenId;

    // Check if such collection and token exists
    if (await this.collectionModel.findOne({ contractAddress }) &&
      await this.collectionItemModel.findOne({ contractAddress, tokenId })) {
      // Check if there is no the same bid
      if (!await this.bidModel.findOne({
        contractAddress,
        tokenId,
        price: { $gte: dto.price }
      })) {
        const bid = new this.bidModel();
        bid.contractAddress = dto.contractAddress;
        bid.tokenId = dto.tokenId;
        bid.price = dto.price;
        bid.bidInitiatorAddress = dto.bidInitiatorAddress;
        const newBid = await bid.save();
        return {
          bidId: newBid.id
        }
      } else {
        throw new BadGatewayException('Ubale to place a bid');
      }
    } else {
      throw new BadGatewayException('No such collection or token');
    }
  }

  async bidDelete(dto: BidDeleteDto) {
    const bid = await this.bidModel.deleteOne({ id: dto.bidId });
    if (bid) {
      return {
        success: true
      }
    } else {
      return {
        success: false
      }
    }
  }

  async bids(contractAddress: string, tokenId: string) {
    return await this.bidModel.find({
      contractAddress,
      tokenId
    }).select(['-_id', '-__v']);
  }

  async getNotifications(walletAddress: string) {
    const signUpResult = await lastValueFrom(this.notificationService.GetUserNotifications({
      walletAddress
    }));
    return signUpResult;
  }

  async readNotifications(walletAddress: string) {
    const signUpResult = await lastValueFrom(this.notificationService.ReadUserNotifications({
      walletAddress
    }));
  }

  getCronosUsdPrice() {
    return {
      usd: this.cronosTokenUsdPrice
    };
  }

  // ------------------------------------

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateCronosTokenUsdPrice() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=crypto-com-chain&vs_currencies=usd');
      const body = await response.json();
      this.cronosTokenUsdPrice = body['crypto-com-chain'].usd;
    } catch (e) {
      Logger.error(e);
    }
  }


  private getDaysSeconds(days?: string) {
    const nowTimeSeconds = Number(Number(Date.now() / 1000).toFixed(0));
    const daySeconds = 24 * 60 * 60;
    let seconds = nowTimeSeconds + daySeconds;
    if (days) {
      if (days == '7d') {
        seconds = nowTimeSeconds + daySeconds * 7;
      } else if (days == '30d') {
        seconds = nowTimeSeconds + daySeconds * 30;
      }
    }
    return seconds;
  }
}
