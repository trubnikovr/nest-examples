import IMetadataParams from '@interfaces/guard/metadata.params';
import { SetMetadata } from '@nestjs/common';
import { METADATA_PERMISSION_PARAM_KEY } from '@infrastructure/auth-admin-guard/constants';

export const HasAccess = (params: IMetadataParams) => SetMetadata(METADATA_PERMISSION_PARAM_KEY, params);
