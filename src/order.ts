import { PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { Order, orderPdaResponse } from "../types/order";
import { ClientResponse, ResponseFactory } from "../types/client";
import { GetAccount } from "../types/get_account";

/**
 * For the provided market publicKey and wallet publicKey: add a date seed and return a Program Derived Address (PDA) and the seed used. This PDA is used for order creation.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @param purchaserPk {PublicKey} publicKey of the purchasing wallet
 * @returns {orderPdaResponse} publicKey (PDA) and the seed used to generate it
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const purchaserPk = new PublicKey('5BZWY6XWPxuWFxs2jagkmUkCoBWmJ6c4YEArr83hYBWk')
 * const OrderPda = await findOrderPda(program, marketPK, purchaserPk)
 */
export async function findOrderPda(
  program: Program,
  marketPk: PublicKey,
  purchaserPk: PublicKey,
): Promise<ClientResponse<orderPdaResponse>> {
  const response = new ResponseFactory({} as orderPdaResponse);

  const distinctSeed = Date.now().toString();
  try {
    const [orderPk, _] = await PublicKey.findProgramAddress(
      [marketPk.toBuffer(), purchaserPk.toBuffer(), Buffer.from(distinctSeed)],
      program.programId,
    );

    response.addResponseData({
      orderPk: orderPk,
      distinctSeed: distinctSeed,
    });
  } catch (e) {
    response.addError(e);
  }

  return response.body;
}

/**
 * For the provided order publicKey, get the order account.
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param orderPk {PublicKey} publicKey of an order
 * @returns {Order} order account details
 *
 * @example
 *
 * const orderPk = new PublicKey('Fy7WiqBy6MuWfnVjiPE8HQqkeLnyaLwBsk8cyyJ5WD8X')
 * const Order = await getOrder(program, orderPk)
 */
export async function getOrder(
  program: Program,
  orderPk: PublicKey,
): Promise<ClientResponse<GetAccount<Order>>> {
  const response = new ResponseFactory({} as GetAccount<Order>);
  try {
    const order = (await program.account.order.fetch(orderPk)) as Order;
    response.addResponseData({
      publicKey: orderPk,
      account: order,
    });
  } catch (e) {
    response.addError(e);
  }
  return response.body;
}
