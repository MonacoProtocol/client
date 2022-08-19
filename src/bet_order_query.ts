import { PublicKey, MemcmpFilter } from "@solana/web3.js";
import {
  Program,
  BorshAccountsCoder,
  AnchorProvider,
} from "@project-serum/anchor";
import bs58 from "bs58";
import { GetAccount } from "../types/get_account";
import {
  BetOrder,
  BetOrderStatus,
  ClientResponse,
  ResponseFactory,
  GetPublicKeys,
  BetOrderAccounts,
} from "../types";
import { Markets } from "./market_query";

/**
 * Base betOrder query builder allowing to filter by set fields. Returns publicKeys or accounts mapped to those publicKeys; filtered to remove any accounts closed during the query process.
 *
 * Some preset queries are available for convenience:
 * - getBetOrdersByStatusForProviderWallet
 * - getBetOrdersByMarketForProviderWallet
 * - getBetOrdersByEventForProviderWallet
 *
 * @param program {program} anchor program initialized by the consuming client
 * @returns {GetPublicKeys || BetOrderAccounts} publicKeys or accounts meeting query requirements
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const purchaserPk = new PublicKey('5BZWY6XWPxuWFxs2jagkmUkCoBWmJ6c4YEArr83hYBWk')
 * const betOrders = await BetOrders.betOrderQuery(program)
 *       .filterByMarket(marketPk)
 *       .filterByPurchaser(purchaserPk)
 *       .filterByStatus(BetOrderStatus.Open)
 *       .fetch();
 *
 * // Returns all open betOrder accounts for the specified market and purchasing wallet.
 */
export class BetOrders {
  public static betOrderQuery(program: Program) {
    return new BetOrders(program);
  }

  private program: Program;
  private _filter: MemcmpFilter[] = [];

  constructor(program: Program) {
    this.program = program;
    this._filter.push(
      this.toFilter(
        0,
        bs58.encode(BorshAccountsCoder.accountDiscriminator("bet_order")),
      ),
    );
  }

  filterByPurchaser(purchaser: PublicKey): BetOrders {
    this._filter.push(this.toFilter(8, purchaser.toBase58()));
    return this;
  }

  filterByMarket(market: PublicKey): BetOrders {
    this._filter.push(this.toFilter(8 + 32, market.toBase58()));
    return this;
  }

  filterByStatus(status: BetOrderStatus): BetOrders {
    this._filter.push(
      this.toFilter(8 + 32 + 32 + 2 + 1, bs58.encode([status])),
    );
    return this;
  }

  private toFilter(offset: number, bytes: string): MemcmpFilter {
    return { memcmp: { offset: offset, bytes: bytes } };
  }

  /**
   *
   * @returns {GetPublicKeys} list of all fetched betOrder publicKeys
   */
  async fetchPublicKeys(): Promise<ClientResponse<GetPublicKeys>> {
    const response = new ResponseFactory({} as GetPublicKeys);
    const connection = this.program.provider.connection;

    try {
      const accounts = await connection.getProgramAccounts(
        this.program.programId,
        {
          dataSlice: { offset: 0, length: 0 }, // fetch without any data.
          filters: this._filter,
        },
      );
      const publicKeys = accounts.map((account) => account.pubkey);
      response.addResponseData({
        publicKeys: publicKeys,
      });
    } catch (e) {
      response.addError(e);
    }

    return response.body;
  }

  /**
   *
   * @returns {BetOrderAccounts} fetched betOrder accounts mapped to their publicKey
   */
  async fetch(): Promise<ClientResponse<BetOrderAccounts>> {
    const response = new ResponseFactory({} as BetOrderAccounts);
    const accountPublicKeys = await this.fetchPublicKeys();

    if (!accountPublicKeys.success) {
      response.addErrors(accountPublicKeys.errors);
      return response.body;
    }

    try {
      const accountsWithData =
        (await this.program.account.betOrder.fetchMultiple(
          accountPublicKeys.data.publicKeys,
          "confirmed",
        )) as BetOrder[];

      const result = accountPublicKeys.data.publicKeys
        .map((accountPublicKey, i) => {
          return { publicKey: accountPublicKey, account: accountsWithData[i] };
        })
        .filter((o) => o.account);

      response.addResponseData({
        betOrderAccounts: result,
      });
    } catch (e) {
      response.addError(e);
    }

    return response.body;
  }
}

/**
 * Get all betOrders owned by the program provider wallet - by betOrder status
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param status {betOrderStatus} status of the betOrder, provided by the BetOrderStatus enum
 * @returns {BetOrderAccounts} fetched betOrder accounts mapped to their publicKey
 *
 * @example
 * const status = BetOrderStatus.Open
 * const betOrders = await getBetOrdersByStatusForProviderWallet(program, status)
 */
export async function getBetOrdersByStatusForProviderWallet(
  program: Program,
  status: BetOrderStatus,
): Promise<ClientResponse<BetOrderAccounts>> {
  const provider = program.provider as AnchorProvider;
  return await BetOrders.betOrderQuery(program)
    .filterByPurchaser(provider.wallet.publicKey)
    .filterByStatus(status)
    .fetch();
}

/**
 * Get all betOrders owned by the program provider wallet - for the given market account
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market
 * @returns {BetOrderAccounts} fetched betOrder accounts mapped to their publicKey
 *
 * @example
 * const marketPk = new PublicKey("5m5RyK82FQKNzMg3eDT5GY5KpbJQJhD4RhBHSG2ux4sk")
 * const betOrders = await getBetOrdersByMarketForProviderWallet(program, marketPk)
 */
export async function getBetOrdersByMarketForProviderWallet(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<BetOrderAccounts>> {
  const provider = program.provider as AnchorProvider;
  return await BetOrders.betOrderQuery(program)
    .filterByPurchaser(provider.wallet.publicKey)
    .filterByMarket(marketPk)
    .fetch();
}
/**
 * Get all cancellable betOrders owned by the program provider for the given market. BetOrders can be cancelled if they:
 *
 * - Have the status of BetOrderStatus.OPEN
 * - Are partially matched (only unmatched stake will be cancelled)
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market
 * @returns {BetOrderAccounts} fetched betOrder accounts mapped to their publicKey
 *
 * @example
 * const marketPk = new PublicKey("5m5RyK82FQKNzMg3eDT5GY5KpbJQJhD4RhBHSG2ux4sk")
 * const betOrders = await getCancellableBetOrdersByMarketForProviderWallet(program, marketPk)
 */
export async function getCancellableBetOrdersByMarketForProviderWallet(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<BetOrderAccounts>> {
  const provider = program.provider as AnchorProvider;
  const betOrders = await BetOrders.betOrderQuery(program)
    .filterByPurchaser(provider.wallet.publicKey)
    .filterByMarket(marketPk)
    .fetch();
  betOrders.data.betOrderAccounts = betOrders.data.betOrderAccounts.filter(
    (betOrder) => betOrder.account.stakeUnmatched.toNumber() > 0,
  );
  return betOrders;
}

/**
 * Get all betOrders owned by the program provider wallet - for all markets associated with the given event account
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param eventPk {PublicKey} publicKey of the event
 * @returns {BetOrderAccounts} fetched betOrder accounts mapped to their publicKey
 *
 * @example
 * const eventPk = new PublicKey("5gHfsqpTw6HQwQBc94mXEoFFrD9muKNmAnchJ376PRE4")
 * const betOrders = await getBetOrdersByEventForProviderWallet(program, eventPk)
 */
export async function getBetOrdersByEventForProviderWallet(
  program: Program,
  eventPk: PublicKey,
): Promise<ClientResponse<BetOrderAccounts>> {
  const response = new ResponseFactory({} as BetOrderAccounts);
  const provider = program.provider as AnchorProvider;
  const marketPks = await Markets.marketQuery(program)
    .filterByEvent(eventPk)
    .fetch();

  if (!marketPks.success) {
    response.addErrors(marketPks.errors);
    return response.body;
  }

  const betOrderAccounts = [] as GetAccount<BetOrder>[];

  await Promise.all(
    marketPks.data.markets.map(async function (market) {
      const betOrderResponse = await BetOrders.betOrderQuery(program)
        .filterByPurchaser(provider.wallet.publicKey)
        .filterByMarket(market.publicKey)
        .fetch();
      if (betOrderResponse.success) {
        betOrderAccounts.push(...betOrderResponse.data.betOrderAccounts);
      } else {
        response.addErrors(betOrderResponse.errors);
      }
    }),
  );

  response.addResponseData({
    betOrderAccounts: betOrderAccounts,
  });
  return response.body;
}
