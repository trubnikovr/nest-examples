import { EncryptorFacade } from '@infrastructure/encrypt/facades/encryptor.facade';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: EncryptorFacade,
      //@toDo - move to environment-config
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>('AES_SECRET_KEY');

        return new EncryptorFacade(secretKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EncryptorFacade],
})
export class EncryptModule {}
