import AxiosAgentProxy from '@infrastructure/axios/services/axios.agent';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [],
  providers: [AxiosAgentProxy],
  exports: [AxiosAgentProxy],
})
export class AxiosModule {}
