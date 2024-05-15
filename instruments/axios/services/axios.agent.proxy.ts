import AxiosAgent from '@infrastructure/axios/class/axios.agent';
import { Injectable } from '@nestjs/common';

@Injectable()
// eslint-disable-next-line import/no-default-export
export default class AxiosAgentProxy extends AxiosAgent {}
