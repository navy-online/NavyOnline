import { Contract, ethers } from "ethers";
import { CronosConstants } from "./cronos.constants";

export interface CronosConfig {
    Nvy: any;
    Aks: any;
    Captain: any;
    Ship: any;
    Island: any;
    CollectionSale: any;
    Marketplace: any;
}

export class CronosProvider {
    // Contract events
    public static readonly EventNftMinted = 'NftMinted';
    public static readonly EventNftGenerated = 'NftGenerated';
    public static readonly EventNftListed = 'NftListed';
    public static readonly EventNftDelisted = 'NftDelisted';
    public static readonly EventNftSold = 'NftSold';

    // Token contracts
    public aksContract: Contract;
    public nvyContract: Contract;

    // NFT contracts
    public captainContract: Contract;
    public shipContract: Contract;
    public islandContract: Contract;

    // Sale contracts
    public captainCollectionSaleContract: Contract;
    public shipCollectionSaleContract: Contract;
    public islandCollectionSaleContract: Contract;

    // Marketplace contracts
    public captainMarketplaceContract: Contract;
    public shipMarketplaceContract: Contract;
    public islandMarketplaceContract: Contract;

    // Ship stats contracts
    public shipTemplateContract: Contract;

    private readonly ethersProvider = new ethers.providers.JsonRpcProvider('https://evm-t3.cronos.org');
    private readonly backendWallet = new ethers.Wallet('4378e658ba1f1e392b07582ad1e533bc55d606aaa22138cb08e83132cd3635e1', this.ethersProvider);

    // 0xd6d6EE855ADDBD0eC5591DdF3D1266EcaecD97B6
    // 4378e658ba1f1e392b07582ad1e533bc55d606aaa22138cb08e83132cd3635e1

    async init(config: CronosConfig) {
        const Aks = config.Aks;
        const Nvy = config.Nvy;
        const Captain = config.Captain;
        const Ship = config.Ship;
        const Island = config.Island;
        const CollectionSale = config.CollectionSale;
        const Marketplace = config.Marketplace;

        this.aksContract = new ethers.Contract(CronosConstants.AksContractAddress, Aks, this.ethersProvider).connect(this.backendWallet);
        this.nvyContract = new ethers.Contract(CronosConstants.NvyContractAddress, Nvy, this.ethersProvider).connect(this.backendWallet);

        this.captainContract = new ethers.Contract(CronosConstants.CaptainContractAddress, Captain, this.ethersProvider).connect(this.backendWallet);
        this.shipContract = new ethers.Contract(CronosConstants.ShipContractAddress, Ship, this.ethersProvider).connect(this.backendWallet);
        this.islandContract = new ethers.Contract(CronosConstants.IslandContractAddress, Island, this.ethersProvider).connect(this.backendWallet);

        this.captainCollectionSaleContract = new ethers.Contract(CronosConstants.CaptainCollectionSaleContractAddress, CollectionSale, this.ethersProvider);
        this.shipCollectionSaleContract = new ethers.Contract(CronosConstants.ShipCollectionSaleContractAddress, CollectionSale, this.ethersProvider);
        this.islandCollectionSaleContract = new ethers.Contract(CronosConstants.IslandCollectionSaleContractAddress, CollectionSale, this.ethersProvider);

        this.captainMarketplaceContract = new ethers.Contract(CronosConstants.CaptainMarketplaceContractAddress, Marketplace, this.ethersProvider);
        this.shipMarketplaceContract = new ethers.Contract(CronosConstants.ShipMarketplaceContractAddress, Marketplace, this.ethersProvider);
        this.islandMarketplaceContract = new ethers.Contract(CronosConstants.IslandMarketplaceContractAddress, Marketplace, this.ethersProvider);
    }
}