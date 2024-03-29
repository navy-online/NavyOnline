import { SignUpRequest } from '@app/shared-library/gprc/grpc.user.service';
import { Utils } from '@app/shared-library/utils';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { AttachEmailDto, AttachWalletDto, UpdatePasswordDto } from 'apps/gateway-service/src/dto/app.dto';
import { AuthApiService } from './api/api.auth';
import { BidApiService } from './api/api.bid';
import { CollectionApiService } from './api/api.collection';
import { FavouriteApiService } from './api/api.favourite';
import { NotificationApiService } from './api/api.notification';
import { BidPlaceDto, BidDeleteDto } from './dto/dto.bids';
import { FavouriteDto } from './dto/dto.favourite';

@Controller('api/marketplace/auth')
export class AppControllerAuth {

  constructor(
    private readonly authService: AuthApiService,
    private readonly favouriteService: FavouriteApiService,
    private readonly bidService: BidApiService,
    private readonly notificationService: NotificationApiService,
    private readonly collectionService: CollectionApiService
  ) { }

  // --------------------------------
  // Auth
  // --------------------------------

  @Post('signUp')
  @HttpCode(200)
  async signUp(@Body() request: SignUpRequest) {
    return this.authService.signInOrUp(false, request);
  }

  @Post('signIn')
  @HttpCode(200)
  async signIn(@Body() request: SignUpRequest) {
    return this.authService.signInOrUp(true, request);
  }

  @Post('attachEmail')
  @HttpCode(200)
  async attachEmail(@Req() request: Request, @Body() dto: AttachEmailDto) {
    return this.authService.attachEmail(Utils.GetBearerTokenFromRequest(request), dto);
  }

  @Post('attachWallet')
  @HttpCode(200)
  async attachWallet(@Req() request: Request, @Body() dto: AttachWalletDto) {
    return this.authService.attachWallet(Utils.GetBearerTokenFromRequest(request), dto);
  }

  @Patch('updatePassword')
  @HttpCode(200)
  async updatePassword(@Req() request: Request, @Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(Utils.GetBearerTokenFromRequest(request), dto);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: Request) {
    return this.authService.logout(Utils.GetBearerTokenFromRequest(request));
  }

  // --------------------------------
  // Collection
  // --------------------------------

  @Get('favourites')
  favourites(@Req() request: Request) {
    return this.collectionService.getFavouriteCollectionItemsByOwner(Utils.GetBearerTokenFromRequest(request));
  }

  @Post('favourites')
  @HttpCode(200)
  favouritesAdd(@Req() request: Request, @Body() dto: FavouriteDto) {
    return this.favouriteService.favouritesAdd(Utils.GetBearerTokenFromRequest(request), dto);
  }

  @Delete('favourites')
  @HttpCode(200)
  favouritesRemove(@Req() request: Request, @Body() dto: FavouriteDto) {
    return this.favouriteService.favouritesRemove(Utils.GetBearerTokenFromRequest(request), dto);
  }

  @Get('myNft')
  myNFT(@Req() request: Request) {
    return this.collectionService.getCollectionItemsByOwner(Utils.GetBearerTokenFromRequest(request));
  }

  // --------------------------------
  // Bids api
  // --------------------------------

  @Get('bid/:contractAddress/:tokenId')
  bid(@Param('contractAddress') contractAddress: string, @Param('tokenId') tokenId: string) {
    return this.bidService.bids(contractAddress, tokenId);
  }

  @Post('bid/place')
  @HttpCode(200)
  bidPlace(@Body() dto: BidPlaceDto) {
    return this.bidService.bidPlace(dto);
  }

  @Delete('bid/delete')
  @HttpCode(200)
  bidDelete(@Body() dto: BidDeleteDto) {
    return this.bidService.bidDelete(dto);
  }

  // --------------------------------
  // Notifications
  // --------------------------------

  @Get('notifications')
  getNotifications(@Req() request: Request) {
    return this.notificationService.getNotifications(Utils.GetBearerTokenFromRequest(request));
  }

  @Post('notifications/read')
  @HttpCode(200)
  readNotifications(@Req() request: Request) {
    return this.notificationService.readNotifications(Utils.GetBearerTokenFromRequest(request));
  }
}
