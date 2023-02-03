import { UserAuth, UserAuthDocument } from '@app/shared-library/schemas/schema.user.profile';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
    constructor(@InjectModel(UserAuth.name) private userAuthModel: Model<UserAuthDocument>) {

    }

    async findUserByEmail(email: string): Promise<UserAuth | undefined> {
        const user = await this.userAuthModel.findOne({
            email
        });
        return user;
    }
}