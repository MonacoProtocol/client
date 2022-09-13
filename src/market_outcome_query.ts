import { PublicKey, MemcmpFilter } from "@solana/web3.js";
import { Program, BorshAccountsCoder } from "@project-serum/anchor";
import bs58 from "bs58";
import {
  ResponseFactory,
  ClientResponse,
  GetPublicKeys,
  MarketOutcomeAccount,
  MarketOutcomeAccounts,
} from "../types";

/**
 * Base market outcome query builder allowing to filter by set fields. Returns publicKeys or accounts mapped to those publicKeys; filtered to remove any accounts closed during the query process.
 *
 * Some preset queries are available for convenience:
 * - getMarketOutcomesByMarket
 *
 * @param program {program} anchor program initialized by the consuming client
 * @returns {GetPublicKeys || MarketOutcomeAccounts} publicKeys or accounts meeting query requirements filtered to remove any accounts closed during the query process
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomes = await MarketOutcomes.marketOutcomeQuery(program)
 *      .filterByMarket(marketPk)
 *      .fetch();
 *
 * Returns all market outcomes created for the given market.
 */
export class MarketOutcomes {
  public static marketOutcomeQuery(program: Program) {
    return new MarketOutcomes(program);
  }

  private program: Program;
  private _filter: MemcmpFilter[] = [];

  constructor(program: Program) {
    this.program = program;
    this._filter.push(
      this.toFilter(
        0,
        bs58.encode(BorshAccountsCoder.accountDiscriminator("market_outcome")),
      ),
    );
  }

  filterByMarket(market: PublicKey): MarketOutcomes {
    this._filter.push(this.toFilter(8, market.toBase58()));
    return this;
  }

  private toFilter(offset: number, bytes: string): MemcmpFilter {
    return { memcmp: { offset: offset, bytes: bytes } };
  }

  /**
   *
   * @returns {GetPublicKeys} list of all fetched market outcome publicKeys
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
      response.addResponseData({ publicKeys: publicKeys });
    } catch (e) {
      response.addError(e);
    }

    return response.body;
  }

  /**
   *
   * @returns {MarketOutcomeAccounts} fetched market outcome accounts mapped to their publicKey
   */
  async fetch(): Promise<ClientResponse<MarketOutcomeAccounts>> {
    const response = new ResponseFactory({} as MarketOutcomeAccounts);
    const accountPublicKeys = await this.fetchPublicKeys();

    if (!accountPublicKeys.success) {
      response.addErrors(accountPublicKeys.errors);
      return response.body;
    }

    try {
      const accountsWithData =
        (await this.program.account.marketOutcome.fetchMultiple(
          accountPublicKeys.data.publicKeys,
          "confirmed",
        )) as MarketOutcomeAccount[];

      const result = accountPublicKeys.data.publicKeys
        .map((accountPublicKey, i) => {
          return { publicKey: accountPublicKey, account: accountsWithData[i] };
        })
        .filter((o) => o.account);

      response.addResponseData({ marketOutcomeAccounts: result });
    } catch (e) {
      response.addError(e);
    }
    return response.body;
  }
}

/**
 * Get all market outcome accounts for the provided market.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market
 * @returns { MarketOutcomeAccounts } fetched market outcome accounts mapped to their publicKey
 *
 * @example
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomes = await getMarketOutcomesByMarket(program, marketPk)
 */
export async function getMarketOutcomesByMarket(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<MarketOutcomeAccounts>> {
  return await MarketOutcomes.marketOutcomeQuery(program)
    .filterByMarket(marketPk)
    .fetch();
}

/**
 * Get all market outcome titles for the provided market.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market
 * @returns { string } fetched market outcome titles array ordered by index
 *
 * @example
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomeTitles = await getMarketOutcomeTitlesByMarket(program, marketPk)
 */
export async function getMarketOutcomeTitlesByMarket(
  program: Program,
  marketPk: PublicKey,
): Promise<string[]> {
  const result = [] as string[];

  const marketOutcomesResponse = await MarketOutcomes.marketOutcomeQuery(
    program,
  )
    .filterByMarket(marketPk)
    .fetch();

  const marketOutcomeAccounts =
    marketOutcomesResponse.data.marketOutcomeAccounts;
  marketOutcomeAccounts.forEach(
    (marketOutcomeAccount) =>
      (result[marketOutcomeAccount.account.index] =
        marketOutcomeAccount.account.title),
  );

  return result;
}
