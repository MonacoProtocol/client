import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { BetOrders } from "./bet_order_query";
import { getMarket } from "./markets";
import {
  findMarketMatchingPoolPda,
  getMarketMatchingPoolAccounts,
} from "./market_matching_pools";
import {
  BetOrderStatus,
  MarketPrice,
  MarketPrices,
  ClientResponse,
  ResponseFactory,
} from "../types";

/**
 * For the provided market publicKey return:
 *
 * - The market account
 * - The pending betOrders for the market (unmatched/partially matched orders)
 * - The market prices for the market
 *
 *  Market prices are all unique pending betOrder combinations (OUTCOME, ODDS, BACKING) and their corresponding matching pool accounts.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @returns {MarketPrices} Market account, pending betOrders and marketPrices with matching pools
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketPrices = await getMarketPrices(program, marketPK)
 */
export async function getMarketPrices(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<MarketPrices>> {
  const response = new ResponseFactory({} as MarketPrices);
  const [matchedBetOrders, openBetOrders, market] = await Promise.all([
    await new BetOrders(program)
      .filterByMarket(marketPk)
      .filterByStatus(BetOrderStatus.Matched)
      .fetch(),
    await new BetOrders(program)
      .filterByMarket(marketPk)
      .filterByStatus(BetOrderStatus.Open)
      .fetch(),
    await getMarket(program, marketPk),
  ]);

  if (!matchedBetOrders.success || !openBetOrders.success || !market.success) {
    response.addErrors(matchedBetOrders.errors);
    response.addErrors(openBetOrders.errors);
    response.addErrors(market.errors);
    return response.body;
  }

  const partiallyMatchedBetOrders =
    matchedBetOrders.data.betOrderAccounts.filter(
      (betOrder) => betOrder.account.stakeUnmatched.toNumber() > 0,
    );

  const pendingBetOrders = partiallyMatchedBetOrders.concat(
    openBetOrders.data.betOrderAccounts,
  );

  const marketPricesSet = new Set();
  pendingBetOrders.map((pendingBetOrder) => {
    const account = pendingBetOrder.account;
    const price = {
      marketOutcome:
        market.data.account.marketOutcomes[account.marketOutcomeIndex],
      odds: account.expectedOdds,
      backing: account.backing,
    };
    marketPricesSet.add(JSON.stringify(price));
  });

  const marketPrices = Array.from(marketPricesSet).map(function (price) {
    return JSON.parse(price as string) as MarketPrice;
  });

  const marketMatchingPoolPdas = [] as PublicKey[];
  await Promise.all(
    marketPrices.map(async function (price) {
      const matchingPoolPDA = await findMarketMatchingPoolPda(
        program,
        market.data.publicKey,
        price.marketOutcome,
        price.odds,
        price.backing,
      );
      if (!matchingPoolPDA.success) {
        response.addErrors(matchingPoolPDA.errors);
      } else {
        price.matchingPoolPda = matchingPoolPDA.data.pda;
        marketMatchingPoolPdas.push(matchingPoolPDA.data.pda);
      }
    }),
  );

  const marketMatchingPoolAccounts = await getMarketMatchingPoolAccounts(
    program,
    marketMatchingPoolPdas,
  );

  if (!marketMatchingPoolAccounts.success) {
    response.addErrors(marketMatchingPoolAccounts.errors);
    return response.body;
  }

  marketPrices.map((price) => {
    const matchingPool =
      marketMatchingPoolAccounts.data.marketMatchingPools.find(
        (matchingPool) => matchingPool.publicKey === price.matchingPoolPda,
      );
    if (matchingPool) {
      price.matchingPool = matchingPool.account;
    }
  });

  response.addResponseData({
    market: market.data.account,
    pendingBetOrders: pendingBetOrders,
    marketPrices: marketPrices,
  });

  return response.body;
}
