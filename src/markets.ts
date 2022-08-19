import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  MarketAccount,
  ClientResponse,
  ResponseFactory,
  MarketAccounts,
  GetAccount,
} from "../types";

/**
 * For the provided market publicKey, get the market account details.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market
 * @returns {MarketAccount} market account details
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const market = await getMarket(program, marketPK)
 */
export async function getMarket(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<GetAccount<MarketAccount>>> {
  const response = new ResponseFactory({} as GetAccount<MarketAccount>);
  try {
    const market = (await program.account.market.fetch(
      marketPk,
    )) as MarketAccount;
    response.addResponseData({
      publicKey: marketPk,
      account: market,
    });
  } catch (e) {
    response.addError(e);
  }
  return response.body;
}

/**
 * For the provided list of market publicKeys, get the market account details for each.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPks {PublicKey} publicKey of a market
 * @returns {MarketAccounts} list of market account details
 *
 * @example
 *
 * const marketPk1 = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketPk2 = new PublicKey('4JKcFnuBRH8YDnJDHqAn4MTQhCCqAHywB8hTceu4bc2h')
 * const marketPks = [marketPk1, marketPk2]
 * const markets = await getMarkets(program, marketPks)
 */
export async function getMarkets(
  program: Program,
  marketPks: PublicKey[],
): Promise<ClientResponse<MarketAccounts>> {
  const response = new ResponseFactory({} as MarketAccounts);

  const markets = await Promise.all(
    marketPks.map(async function (marketPk) {
      const market = await getMarket(program, marketPk);
      if (market.success) {
        return market.data;
      } else {
        response.addErrors(market.errors);
      }
    }),
  );

  response.addResponseData({
    markets: markets,
  });
  return response.body;
}
