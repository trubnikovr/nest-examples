import { DateUtils } from '@infrastructure/date-utils/date.utils';
import type { IFindAllResponse } from '@interfaces/findAll.response.interface';
import { Langs } from '@interfaces/langs';
import { TypeOrder } from '@interfaces/order/order.interface';
import type { IPageAndLimitQuery } from '@interfaces/page.limit.query.interface';
import type { ITransaction } from '@interfaces/payments/transacion.interface';
import type { ITransactionsFilterQueryDto } from '@interfaces/transactions/transactions.filter-query.iterface';
import type { ICinemaTransactionsResponse } from '@interfaces/transactions/transactions.responses.interface';
import { TransactionRepository } from '@modules/payments/repositories/transaction.repository';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Between, Like } from 'typeorm';

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionRepository, private dateUtils: DateUtils) {}

  async getTransactionsByType(type: TypeOrder, query: IPageAndLimitQuery): Promise<IFindAllResponse<ITransaction>> {
    const { page = 1, limit = 10 } = query;

    if (!Object.values(TypeOrder).includes(type)) {
      throw new BadRequestException(`invalid type: [${Object.values(TypeOrder)}]`);
    }

    const [transactions, count] = await this.transactionsRepository.findAndCount({
      where: {
        order: {
          type,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const meta = {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    };

    return {
      meta,
      data: transactions,
    };
  }

  async getCinemaTransactions(
    txFilterQuery: ITransactionsFilterQueryDto,
  ): Promise<IFindAllResponse<ICinemaTransactionsResponse>> {
    const {
      page = 1,
      limit = 10,
      date = undefined,
      status = undefined,
      cinemaId = undefined,
      hallId = undefined,
      userPhoneNumber = undefined,
    } = txFilterQuery;

    const isValidDate = date ? this.dateUtils.isValidDate(date) : true;

    if (!isValidDate) {
      throw new BadRequestException('invalid date');
    }

    const fromDate = date ? new Date(date) : undefined;
    const toDate = date ? new Date(date) : undefined;

    if (toDate) {
      toDate.setHours(23, 59, 59);
    }

    const [transactions, count] = await this.transactionsRepository.findAndCount({
      where: {
        state: status,
        order: {
          cinemaOrderDetails: {
            cinemaSession: {
              hall: {
                id: hallId ? Number(hallId) : undefined,
                cinemaId: cinemaId ? Number(cinemaId) : undefined,
              },
            },
          },
          user: {
            phoneNumber: userPhoneNumber ? Like(`%${userPhoneNumber}`) : undefined,
          },
        },
        createdAt: date ? Between(fromDate, toDate) : undefined,
      },
      order: { createdAt: 'DESC' },
      relations: {
        order: {
          user: true,
          cinemaOrderDetails: {
            cinemaSession: {
              movie: {
                translates: true,
              },
              hall: {
                cinema: {
                  translates: true,
                },
              },
            },
          },
        },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    const data = this.adaptCinemaTransactionsResponse(transactions);

    const meta = {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    };

    return {
      meta,
      data,
    };
  }

  async exportToCsv(txFilterQuery: any) {
    const transactions = await this.getCinemaTransactions({
      ...txFilterQuery,
      limit: 1000,
    });
    const result = [];
    // Определение заголовков CSV и соответствующих ключей объекта транзакции
    const headers = [
      { title: 'Num', key: 'id' },
      { title: 'Phone', key: 'user_phone_number' },
      { title: 'Movie Name', key: 'movie_name' },
      { title: 'Cinema Name', key: 'cinema_name' },
      { title: 'Date', key: 'session_start_date' },
      { title: 'Time Status', key: 'session_start_time' },
      { title: 'State', key: 'state' },
      { title: 'Price', key: 'amount_in_tiyin' },
      { title: 'Count', key: 'number_of_places_reserved' },
      { title: 'OFD State', key: 'ofd_state' },
      { title: 'OFD URL', key: 'ofd_url' },
    ];

    // Функция для создания строки CSV из объекта транзакции
    const csvWriter = transaction => headers.map(({ key }) => transaction[key]).join(';');

    // Добавляем строку заголовков в результат
    result.push(headers.map(({ title }) => title).join(';'));

    // Добавляем строки с данными каждой транзакции
    for (const transaction of transactions.data) {
      result.push(csvWriter(transaction));
    }

    // Соединяем все строки в одну строку, разделенную переводами строк
    return result.join('\n');
  }

  private adaptCinemaTransactionsResponse(transactions: ITransaction[]): ICinemaTransactionsResponse[] {
    return transactions.map((tx: ITransaction) => ({
      id: tx.id,
      user_phone_number: tx.order.user.phoneNumber,
      movie_name: tx.order.cinemaOrderDetails[0]?.cinemaSession?.movie?.translates?.find(
        tr => tr?.language === Langs.ru,
      )?.name,
      cinema_name: tx.order.cinemaOrderDetails[0]?.cinemaSession?.hall?.cinema?.translates?.find(
        tr => tr?.language === Langs.ru,
      )?.name,
      session_start_date: tx.order.cinemaOrderDetails[0]?.cinemaSession?.date,
      session_start_time: tx.order.cinemaOrderDetails[0]?.cinemaSession?.startTime,
      state: tx.state,
      amount_in_tiyin: tx.amountCents,
      number_of_places_reserved: tx.order.cinemaOrderDetails.length,
      ofd_state: tx.ofdState,
      ofd_url: tx.ofd_url,
      hall_name: tx.order.cinemaOrderDetails[0]?.cinemaSession?.hall?.name,
      payment_type: tx.paymentSystem,
      order_status: tx.order.status,
      transaction_create_time: this.dateUtils.formatDate(new Date(tx.create_time)),
    }));
  }
}
