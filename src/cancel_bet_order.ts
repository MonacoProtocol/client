import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getCancellableBetOrdersByMarketForProviderWallet } from "./bet_order_query";
import { findEscrowPda } from "./utils";
import { getBetOrder } from "./bet_order";
import { getMarket } from "./markets";
import { getWalletTokenAccount } from "../src/wallet_tokens";
import {
  ClientResponse,
  ResponseFactory,
  CancelBetOrderResponse,
  CancelBetOrdersResponse,
} from "../types";
import { findMarketPositionPda } from "./market_position";
import { findMarketMatchingPoolPda } from "./market_matching_pools";
import { NoCancellableBetOrdersFound } from "../types";

/**
 * For the provided betOrder publicKey, cancel the betOrder if the program provider owns the betOrder.BetOrders can be cancelled if they:
 *
 * - Have the status of BetOrderStatus.OPEN
 * - Are partially matched (only unmatched stake will be cancelled)
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param betOrderPk {PublicKey} publicKey of the betOrder to cancel
 * @returns {CancelBetOrderResponse} the provided betOrder publicKey and the transactionId for the request, this ID can be used to confirm the success of the transaction
 *
 * @example
 *
 * const betOrderPk = new PublicKey('Fy7WiqBy6MuWfnVjiPE8HQqkeLnyaLwBsk8cyyJ5WD8X')
 * const cancelledBetOrder = await cancelBetOrder(program, betOrderPk)
 */
export async function cancelBetOrder(
  program: Program,
  betOrderPk: PublicKey,
): Promise<ClientResponse<CancelBetOrderResponse>> {
  const response = new ResponseFactory({} as CancelBetOrderResponse);

  const provider = program.provider as AnchorProvider;
  const betOrderResponse = await getBetOrder(program, betOrderPk);
  const betOrder = betOrderResponse.data.account;

  const marketResponse = await getMarket(program, betOrder.market);
  const market = marketResponse.data.account;
  const marketTokenPk = new PublicKey(market.mintAccount);

  const [
    marketPositionPda,
    marketMatchingPool,
    escrowPda,
    purchaserTokenAccount,
  ] = await Promise.all([
    findMarketPositionPda(program, betOrder.market, provider.wallet.publicKey),
    findMarketMatchingPoolPda(
      program,
      betOrder.market,
      market.marketOutcomes[betOrder.marketOutcomeIndex],
      betOrder.expectedOdds,
      betOrder.backing,
    ),
    findEscrowPda(program, betOrder.market),
    getWalletTokenAccount(program, marketTokenPk),
  ]);

  const tnxID = await program.methods
    .cancelBet()
    .accounts({
      betOrder: betOrderPk,
      marketPosition: marketPositionPda.data.pda,
      purchaser: provider.wallet.publicKey,
      purchaserTokenAccount: purchaserTokenAccount.data.associatedTokenAccount,
      marketMatchingPool: marketMatchingPool.data.pda,
      market: betOrder.market,
      marketEscrow: escrowPda.data.pda,
      mint: market.mintAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
    .catch((e) => {
      response.addError(e);
    });

  response.addResponseData({
    betOrderPk: betOrderPk,
    tnxID: tnxID,
  });
  return response.body;
}

/**
 * For the provided market publicKey, attempt to cancel all cancellable betOrders owned by the program provider wallet. BetOrders can be cancelled if they:
 *
 * - Have the status of BetOrderStatus.OPEN
 * - Are partially matched (only unmatched stake will be cancelled)
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of a market
 * @returns {CancelBetOrdersResponse} list of all the successfully submitted transactionIDs, list of all the failed-to-cancel betOrder publicKeys
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const cancelledBetOrders = await cancelBetOrdersForMarket(program, marketPk)
 */
export async function cancelBetOrdersForMarket(
  program: Program,
  marketPk: PublicKey,
): Promise<ClientResponse<CancelBetOrdersResponse>> {
  const response = new ResponseFactory({} as CancelBetOrdersResponse);

  const provider = program.provider as AnchorProvider;
  const marketResponse = await getMarket(program, marketPk);
  const market = marketResponse.data.account;
  const marketTokenPk = new PublicKey(market.mintAccount);

  const [
    marketPositionPda,
    escrowPda,
    purchaserTokenAccount,
    betOrdersResponse,
  ] = await Promise.all([
    findMarketPositionPda(program, marketPk, provider.wallet.publicKey),
    findEscrowPda(program, marketPk),
    getWalletTokenAccount(program, marketTokenPk),
    getCancellableBetOrdersByMarketForProviderWallet(program, marketPk),
  ]);

  const betOrders = betOrdersResponse.data.betOrderAccounts;

  if (betOrders.length < 1) {
    response.addError(NoCancellableBetOrdersFound);
    return response.body;
  }

  const results = await Promise.all(
    betOrders.map(async (bet) => {
      const marketMatchingPool = await findMarketMatchingPoolPda(
        program,
        bet.account.market,
        market.marketOutcomes[bet.account.marketOutcomeIndex],
        bet.account.expectedOdds,
        bet.account.backing,
      );
      try {
        const tnxID = await program.methods
          .cancelBet()
          .accounts({
            betOrder: bet.publicKey,
            marketPosition: marketPositionPda.data.pda,
            purchaser: provider.wallet.publicKey,
            purchaserTokenAccount:
              purchaserTokenAccount.data.associatedTokenAccount,
            marketMatchingPool: marketMatchingPool.data.pda,
            market: bet.account.market,
            marketEscrow: escrowPda.data.pda,
            mint: market.mintAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        return tnxID;
      } catch (e) {
        response.addError(e);
        return bet.publicKey;
      }
    }),
  );

  const tnxIDs = results.filter(function (value) {
    return typeof value === "string";
  }) as string[];
  const failedCancellationBetOrders = results.filter(function (value) {
    return value instanceof PublicKey;
  }) as PublicKey[];

  response.addResponseData({
    failedCancellationBetOrders: failedCancellationBetOrders,
    tnxIDs: tnxIDs,
  });
  return response.body;
}
