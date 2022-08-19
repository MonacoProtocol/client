import { PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import {
  ClientResponse,
  ResponseFactory,
  MarketOutcomeAccounts,
  MarketOutcomePDAs,
  MarketOutcomeAccount,
} from "../types";
import { FindPdaResponse } from "../types";

/**
 * For the provided market publicKey and market outcome, return the PDA (publicKey) of the outcome account.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @param marketOutcome {string} string representation of a market outcome
 * @returns {FindPdaResponse} PDA of the market outcome account
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcome = "Monaco"
 * const marketOutcomePda = await findMarketOutcomePda(program, marketPK, marketOutcome)
 */
export async function findMarketOutcomePda(
  program: Program,
  marketPk: PublicKey,
  marketOutcome: string,
): Promise<ClientResponse<FindPdaResponse>> {
  const response = new ResponseFactory({} as FindPdaResponse);
  try {
    const [pda, _] = await PublicKey.findProgramAddress(
      [marketPk.toBuffer(), Buffer.from(marketOutcome)],
      program.programId,
    );

    response.addResponseData({
      pda: pda,
    });
  } catch (e) {
    response.addError(e);
  }
  return response.body;
}

/**
 * For the provided market and market outcomes, return the PDAs (publicKeys) of the outcome accounts.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market to get market outcome accounts for
 * @param marketOutcomes {string[]} string list of outcomes on the provided market
 * @returns {MarketOutcomePDAs}
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomes = ["Monaco", "Protocol"]
 * const marketOutcomePdas = await findMarketOutcomeAccountPDAs(program, marketPK, marketOutcomes)
 */
async function findMarketOutcomeAccountPDAs(
  program: Program,
  marketPk: PublicKey,
  marketOutcomes: string[],
): Promise<ClientResponse<MarketOutcomePDAs>> {
  const response = new ResponseFactory({} as MarketOutcomePDAs);
  try {
    const marketOutcomePDAs = await Promise.all(
      marketOutcomes.map(async function (outcome) {
        return await findMarketOutcomePda(program, marketPk, outcome);
      }),
    );
    response.addResponseData({ marketOutcomePDAs: marketOutcomePDAs });
  } catch (e) {
    response.addError(e);
  }

  return response.body;
}

/**
 * For the provided market and market outcomes, return the outcome accounts.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the market to get market outcome accounts for
 * @param marketOutcomes {string[]} string list of outcomes on the provided market
 * @returns {MarketOutcomeAccounts}
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomes = ["Monaco", "Protocol"]
 * const marketOutcomeAccounts = await getMarketOutcomeAccounts(program, marketPK, marketOutcomes)
 */
export async function getMarketOutcomeAccounts(
  program: Program,
  marketPk: PublicKey,
  marketOutcomes: string[],
): Promise<ClientResponse<MarketOutcomeAccounts>> {
  const response = new ResponseFactory({} as MarketOutcomeAccounts);

  const marketOutcomePDAs = await findMarketOutcomeAccountPDAs(
    program,
    marketPk,
    marketOutcomes,
  );

  if (marketOutcomePDAs.success) {
    try {
      const marketOutcomeAccounts =
        (await program.account.marketOutcome.fetchMultiple(
          marketOutcomePDAs.data.marketOutcomePDAs,
        )) as MarketOutcomeAccount[];
      response.addResponseData({
        marketOutcomeAccounts: marketOutcomeAccounts,
      });
    } catch (e) {
      response.addError(e);
    }
  } else response.addErrors(marketOutcomePDAs.errors);

  return response.body;
}
