import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  ClientResponse,
  ResponseFactory,
  MarketMatchingPoolAccounts,
  MarketMatchingPoolAccount,
} from "../types";
import { FindPdaResponse } from "../types";

/**
 * For the provided market publicKey, outcome, odds and backing, return the PDA (publicKey) of the matching account.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @param marketOutcome {string} string representation of a market outcome
 * @param odds {number} odds for the matching pool
 * @param backing {boolean} bool representing backing or laying a market outcome
 * @returns {FindPdaResponse} PDA of the market matching pool account
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcome = "Monaco"
 * const odds = 1.5
 * const backing = true
 * const marketMatchingPoolPda = await findMarketMatchingPoolPda(program, marketPK, marketOutcome, odds, backing)
 */
export async function findMarketMatchingPoolPda(
  program: Program,
  marketPk: PublicKey,
  marketOutcome: string,
  odds: number,
  backing: boolean,
): Promise<ClientResponse<FindPdaResponse>> {
  const response = new ResponseFactory({} as FindPdaResponse);
  const oddsDecimalPlaces = 3;
  const [pda, _] = await PublicKey.findProgramAddress(
    [
      marketPk.toBuffer(),
      Buffer.from(marketOutcome),
      Buffer.from(odds.toFixed(oddsDecimalPlaces).toString()),
      Buffer.from(backing.toString()),
    ],
    program.programId,
  );

  response.addResponseData({
    pda: pda,
  });
  return response.body;
}

/**
 * For the provided marketMatchingPool PDAs, return the market matching pool accounts for those PDAs.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketMatchingPoolPDAs {PublicKey[]} PDAs of market matching pools
 * @returns {MarketMatchingPoolAccounts}
 *
 * @example
 *
 * const marketMatchingPoolPDA1 = new PublicKey('DdBdS1EgatrdJXbqxVbZCzsErTXApyVyrJdaDGTiY56R')
 * const marketMatchingPoolPDA2 = new PublicKey('3rTcT9Fe1xPM7x2iQKBPT6b6nPPuUWa9s2p3WxEMV1P1')
 * const marketMatchingPoolPDAs = [marketMatchingPoolPDA1, marketMatchingPoolPDA2]
 * const marketMatchingPools = await getMarketMatchingPoolAccounts(program, marketMatchingPoolPDAs)
 */
export async function getMarketMatchingPoolAccounts(
  program: Program,
  marketMatchingPoolPDAs: PublicKey[],
): Promise<ClientResponse<MarketMatchingPoolAccounts>> {
  const response = new ResponseFactory({} as MarketMatchingPoolAccounts);
  try {
    const matchingPools =
      (await program.account.marketMatchingPool.fetchMultiple(
        marketMatchingPoolPDAs,
      )) as MarketMatchingPoolAccount[];
    const result = marketMatchingPoolPDAs
      .map((pda, i) => {
        return { publicKey: pda, account: matchingPools[i] };
      })
      .filter((o) => o.account);
    response.addResponseData({ marketMatchingPools: result });
  } catch (e) {
    response.addErrors([e]);
  }
  return response.body;
}
