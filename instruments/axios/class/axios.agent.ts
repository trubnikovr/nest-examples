import type { IAgent } from '@infrastructure/axios/interfaces/agent.interfaces';
import type { AxiosRequestConfig, AxiosStatic } from 'axios';
import axios from 'axios';
import { isString } from 'util';


// eslint-disable-next-line import/no-default-export
export default class AxiosAgent implements IAgent {
  private client: AxiosStatic;

  private header: Record<string, string>;

  baseUrl: string;

  constructor(baseURL: string, header?: Record<string, string>) {
    this.baseUrl = baseURL;
    this.client = axios;
    this.header = header;
  }

  getApi(): AxiosStatic {
    return this.client;
  }

  addHeader(header?: Record<string, string>) {
    this.header = {
      ...this.header,
      ...header,
    };
  }

  getHeaders() {
    return {
      ...this.header,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(url: string, options?: AxiosRequestConfig<any>): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      axios.defaults.headers.common = await this.getHeaders();
      //console.info(`${this.baseURL}${url}`)
      const { data = {} } = await this.client.get(`${this.baseUrl}${url}`, {
        ...options,
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  async post(url: string, params?: Record<string, any> | string | Buffer, config?: Record<string, any>): Promise<any> {
    try {
      // eslint-disable-next-line sonarjs/no-all-duplicated-branches
      const body = isString(params) ? params : params;
      console.info(`${this.baseUrl}${url}`);
      const data = await this.client.post(`${this.baseUrl}${url}`, body, {
        headers: {
          ...this.getHeaders(),
          ...((config && config.headers) || {}),
        },
      });

      return data;
    } catch (error) {
      throw error;
    }
  }
}
