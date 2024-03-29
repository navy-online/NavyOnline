
// import * as Captain from '../abi/Captain.json';
// import * as Aks from '../abi/Aks.json';
// import * as Nvy from '../abi/Nvy.json';
// import * as Ship from '../abi/Ship.json';
// import * as Island from '../abi/Island.json';
// import * as CollectionSale from '../abi/CollectionSale.json';
// import * as Marketplace from '../abi/Marketplace.json';
// import { NftType } from "@app/shared-library/shared-library.main";
// import { MintJob, WorkersMint } from "@app/shared-library/workers/workers.mint";
// import {
//     OnQueueActive,
//     OnQueueCompleted,
//     OnQueueError,
//     OnQueueFailed,
//     Process,
//     Processor
// } from "@nestjs/bull";
// import { Logger, OnModuleInit } from "@nestjs/common";
// import { NftGenerator } from "./nft/nft.generator";
// import { Job } from "bull";
// import { Collection, CollectionDocument } from "@app/shared-library/schemas/marketplace/schema.collection";
// import { InjectModel } from "@nestjs/mongoose";
// import { Model } from "mongoose";
// import { NftCaptainGenerator } from "./nft/nft.generator.captain.base";
// import { CronosProvider } from "@app/shared-library/blockchain/cronos/cronos.provider";
// import { Contract } from 'ethers';
// import {
//     BlockchainTransaction,
//     BlockchainTransactionDocument,
//     TransactionStatus,
//     BlockchainTransactionDto,
//     TransactionType
// } from '@app/shared-library/schemas/blockchain/schema.blockchain.transaction';
// import { CollectionItem, CollectionItemDocument } from '@app/shared-library/schemas/marketplace/schema.collection.item';
// import { CaptainSettings, CaptainSettingsDocument } from '@app/shared-library/schemas/entity/schema.captain.settings';
// import { CaptainTrait, CaptainTraitDocument } from '@app/shared-library/schemas/entity/schema.captain.trait';

// @Processor(WorkersMint.CronosMintQueue)
// export class QueueMintProcessor implements OnModuleInit {

//     private readonly logger = new Logger(QueueMintProcessor.name);
//     private readonly cronosProvider = new CronosProvider();
//     private nftCaptainGenerator: NftGenerator;

//     constructor(
//         @InjectModel(Collection.name) private collectionModel: Model<CollectionDocument>,
//         @InjectModel(CollectionItem.name) private collectionItemModel: Model<CollectionItemDocument>,
//         @InjectModel(BlockchainTransaction.name) private blockchainTransactionModel: Model<BlockchainTransactionDocument>,
//         @InjectModel(CaptainTrait.name) private captainTraitModel: Model<CaptainTraitDocument>,
//         @InjectModel(CaptainSettings.name) private captainSettingsModel: Model<CaptainSettingsDocument>
//     ) {
//     }

//     async onModuleInit() {
//         await this.cronosProvider.init({
//             Captain,
//             Aks,
//             Nvy,
//             Ship,
//             Island,
//             CollectionSale,
//             Marketplace
//         });

//         const captainsCollection = await this.collectionModel.findOne({ name: 'Captains' }).populate('mint');
//         this.nftCaptainGenerator = new NftCaptainGenerator(captainsCollection, this.captainTraitModel, this.captainSettingsModel, this.collectionItemModel);
//         await this.nftCaptainGenerator.init();
//     }

//     @Process()
//     async process(job: Job<MintJob>) {
//         let nftGenerator: NftGenerator;
//         let collectionContract: Contract;
//         let collectionSaleContract: Contract;

//         switch (job.data.nftType) {
//             case NftType.CAPTAIN:
//                 nftGenerator = this.nftCaptainGenerator;
//                 collectionContract = this.cronosProvider.captainContract;
//                 collectionSaleContract = this.cronosProvider.captainCollectionSaleContract;
//                 break;
//             case NftType.SHIP:
//                 collectionContract = this.cronosProvider.shipContract;
//                 collectionSaleContract = this.cronosProvider.shipCollectionSaleContract;
//                 break;
//             case NftType.ISLAND:
//                 collectionContract = this.cronosProvider.islandContract;
//                 collectionSaleContract = this.cronosProvider.islandCollectionSaleContract;
//                 break;
//         }

//         const tokensTotal = (await collectionSaleContract.tokensTotal()).toNumber();

//         let tokenIndex = (await collectionContract.totalSupply()).toNumber() + 1;
//         if (job.data.tokenId) {
//             tokenIndex = job.data.tokenId;
//         }

//         const metadataUrl = await nftGenerator.generateNft(tokenIndex, tokensTotal);

//         await nftGenerator.mintNft(job.data.owner, collectionContract, metadataUrl);
//     }

//     @OnQueueError()
//     onQueueError(error: Error) {
//         this.logger.error(error);
//     }

//     @OnQueueActive()
//     async onQueueActive(job: Job<MintJob>) {
//         this.logger.log(`Processing job ${this.jobInfo(job)}`);
//         await this.saveTransaction(job, TransactionStatus.CREATED);
//     }

//     @OnQueueCompleted()
//     async onQueueCompleted(job: Job<MintJob>, result: any) {
//         this.logger.log(`Job completed ${this.jobInfo(job)}`);
//         await this.saveTransaction(job, TransactionStatus.COMPLETED);
//     }

//     @OnQueueFailed()
//     async onQueueFailed(job: Job<MintJob>, error: Error) {
//         this.logger.error(`Job failed ${this.jobInfo(job)}`, error);
//         await this.saveTransaction(job, TransactionStatus.FAILED, error.message);
//     }

//     private jobInfo(job: Job<MintJob>) {
//         return `${job.id} ${NftType[job.data.nftType]} ${job.data.owner}`;
//     }

//     private async saveTransaction(job: Job<MintJob>, transactionStatus: TransactionStatus, errorMessage?: string) {
//         let transactionType: TransactionType;
//         switch (job.data.nftType) {
//             case NftType.CAPTAIN:
//                 transactionType = TransactionType.MINT_CAPTAIN;
//                 break;
//             case NftType.SHIP:
//                 transactionType = TransactionType.MINT_SHIP;
//                 break;
//             case NftType.ISLAND:
//                 transactionType = TransactionType.MINT_ISLAND;
//                 break;
//         }

//         const mintTransaction = new this.blockchainTransactionModel({
//             transactionType,
//             transactionStatus,
//             transactionDetails: {
//                 sender: job.data.owner,
//                 nftType: job.data.nftType,
//                 chainName: job.data.chainName,
//                 jobId: job.id
//             }
//         } as BlockchainTransactionDto);
//         if (errorMessage && transactionStatus == TransactionStatus.FAILED) {
//             mintTransaction.errorMessage = errorMessage;
//         }
//         await mintTransaction.save();
//     }
// }