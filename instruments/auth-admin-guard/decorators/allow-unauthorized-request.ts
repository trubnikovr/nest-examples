import { SetMetadata } from '@nestjs/common';
import { UNAUTHORIZED_REQUEST } from '../constants';

export const AllowUnauthorizedRequest = () => SetMetadata(UNAUTHORIZED_REQUEST, true);
