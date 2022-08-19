import { PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { BetOrder, betOrderPdaResponse } from "../types/bet_order";
import { ClientResponse, ResponseFactory } from "../types/client";
import { GetAccount } from "../types/get_account";

/**
 * For the provided market publicKey and wallet publicKey: add a date seed and return a Program Derived Address (PDA) and the seed used. This PDA is used for betOrder creation.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @param purchaserPk {PublicKey} publicKey of the purchasing wallet
 * @returns {betOrderPdaResponse} publicKey (PDA) and the seed used to generate it
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const purchaserPk = new PublicKey('5BZWY6XWPxuWFxs2jagkmUkCoBWmJ6c4YEArr83hYBWk')
 * const BetOrderPda = await findBetOrderPda(program, marketPK, purchaserPk)
 */
export async function findBetOrderPda(
  program: Program,
  marketPk: PublicKey,
  purchaserPk: PublicKey,
): Promise<ClientResponse<betOrderPdaResponse>> {
  const response = new ResponseFactory({} as betOrderPdaResponse);

  const distinctSeed = Date.now().toString();
  try {
    const [betOrderPk, _] = await PublicKey.findProgramAddress(
      [marketPk.toBuffer(), purchaserPk.toBuffer(), Buffer.from(distinctSeed)],
      program.programId,
    );

    response.addResponseData({
      betOrderPk: betOrderPk,
      distinctSeed: distinctSeed,
    });
  } catch (e) {
    response.addError(e);
  }

  return response.body;
}

/**
 * For the provided betOrder publicKey, get the betOrder account.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param betOrderPk {PublicKey} publicKey of a betOrder
 * @returns {BetOrder} betOrder account details
 *
 * @example
 *
 * const betOrderPk = new PublicKey('Fy7WiqBy6MuWfnVjiPE8HQqkeLnyaLwBsk8cyyJ5WD8X')
 * const BetOrder = await getBetOrder(program, betOrderPk)
 */
export async function getBetOrder(
  program: Program,
  betOrderPk: PublicKey,
): Promise<ClientResponse<GetAccount<BetOrder>>> {
  const response = new ResponseFactory({} as GetAccount<BetOrder>);
  try {
    const betOrder = (await program.account.betOrder.fetch(
      betOrderPk,
    )) as BetOrder;
    response.addResponseData({
      publicKey: betOrderPk,
      account: betOrder,
    });
  } catch (e) {
    response.addError(e);
  }
  return response.body;
}
