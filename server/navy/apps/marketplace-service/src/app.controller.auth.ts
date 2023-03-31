import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { BidPlaceDto, BidDeleteDto } from './dto/dto.bids';
import { NotificationsReadDto } from './dto/dto.notifications.read';

@Controller('marketplace/auth')
export class AppControllerAuth {

  constructor(private readonly appService: AppService) { }

  // --------------------------------
  // Bids
  // --------------------------------

  @Post('bid')
  bidPlace(@Body() dto: BidPlaceDto) {
    return this.appService.bidPlace(dto);
  }

  @Delete('bid')
  bidDelete(@Body() dto: BidDeleteDto) {
    return this.appService.bidDelete(dto);
  }

  // --------------------------------
  // Notifications
  // --------------------------------

  @Get('notifications/:walletAddress')
  getNotifications(@Param('walletAddress') walletAddress: string) {
    return this.appService.getNotifications(walletAddress);
  }

  @Post('notifications/read')
  readNotifications(@Body() dto: NotificationsReadDto) {
    return this.appService.readNotifications(dto.walletAddress);
  }
}
