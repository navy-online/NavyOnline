import { WorldServiceGrpcClientName, WorldServiceGrpcClientOptions } from '@app/shared-library/gprc/grpc.world.service';
import { CollectionItem, CollectionItemSchema } from '@app/shared-library/schemas/marketplace/schema.collection.item';
// import { Captain, CaptainSchema } from '@app/shared-library/schemas/schema.captain';
// import { Island, IslandSchema } from '@app/shared-library/schemas/schema.island';
// import { Ship, ShipSchema } from '@app/shared-library/schemas/schema.ship';
import { UserAvatar, UserAvatarSchema } from '@app/shared-library/schemas/schema.user.avatar';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { MoralisService } from './moralis.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: WorldServiceGrpcClientName,
        ...WorldServiceGrpcClientOptions,
      },
    ]),
    MongooseModule.forFeature([
      // { name: Captain.name, schema: CaptainSchema },
      // { name: Ship.name, schema: ShipSchema },
      // { name: Island.name, schema: IslandSchema },
      { name: UserAvatar.name, schema: UserAvatarSchema },
      { name: CollectionItem.name, schema: CollectionItemSchema },
    ]),
  ],
  providers: [MoralisService],
  exports: [MoralisService]
})
export class MoralisModule { }