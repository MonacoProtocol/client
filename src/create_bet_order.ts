import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getMarketAccounts, uiStakeToInteger } from "./utils";
import { getWalletTokenAccount } from "../src/wallet_tokens";
import {
  ClientResponse,
  CreateBetOrderResponse,
  ResponseFactory,
} from "../types";
import { findBetOrderPda } from "./bet_order";

/**
 * Create a betOrder account on the Monaco protocol using a UI stake value, the client calculates the actual stake value based on mintInfo.data.decimals using uiStakeToInteger()
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the betting market to place the betOrder against
 * @param marketOutcomeIndex {number} index of the chosen outcome
 * @param backing  {boolean} whether the betOrder is for or against the outcome
 * @param odds  {number} odds at which the betOrder should be placed, the odds should be present on the outcome pool for the market
 * @param stake  {number} UI value of the stake, the function will determine the raw value based on the market token type
 * @returns {CreateBetOrderResponse}  derived betOrder publicKey and transactionID for the request, this ID should be used to confirm the success of the transaction
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomeIndex = 0
 * const backing = true
 * const odds = 1.5
 * const stake = 20
 * const betOrder = await createBetOrderUiStake(program, marketPk, marketOutcomeIndex, backing, odds, 20)
 */
export async function createBetOrderUiStake(
  program: Program,
  marketPk: PublicKey,
  marketOutcomeIndex: number,
  backing: boolean,
  odds: number,
  stake: number,
): Promise<ClientResponse<CreateBetOrderResponse>> {
  const stakeInteger = await uiStakeToInteger(program, stake, marketPk);
  return await createBetOrder(
    program,
    marketPk,
    marketOutcomeIndex,
    backing,
    odds,
    stakeInteger.data.stakeInteger,
  );
}

/**
 * Create a betOrder account on the Monaco protocol using the raw token value for the betOrder stake
 *
 * @param program {program} anchor program initialized by the consuming client
 * @param marketPk {PublicKey} publicKey of the betting market to place the betOrder against
 * @param marketOutcomeIndex {number} index of the chosen outcome
 * @param backing  {boolean} whether the betOrder is for or against the outcome
 * @param odds  {number} odds at which the betOrder should be placed, the odds should be present on the outcome pool for the market
 * @param stake  {number} raw token value of the betOrder taking into account the decimal amount of the token associated with the market
 * @returns {CreateBetOrderResponse}  derived betOrder publicKey and transactionID for the request, this ID should be used to confirm the success of the transaction
 *
 * @example
 *
 * const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
 * const marketOutcomeIndex = 0
 * const backing = true
 * const odds = 1.5
 * const stake = 20,000,000,000
 * const betOrder = await createBetOrder(program, marketPk, marketOutcomeIndex, backing, odds, stake)
 */
export async function createBetOrder(
  program: Program,
  marketPk: PublicKey,
  marketOutcomeIndex: number,
  backing: boolean,
  odds: number,
  stake: BN,
): Promise<ClientResponse<CreateBetOrderResponse>> {
  const provider = program.provider as AnchorProvider;
  const MarketAccounts = await getMarketAccounts(
    program,
    marketPk,
    backing,
    marketOutcomeIndex,
    odds,
  );
  const response = new ResponseFactory({} as CreateBetOrderResponse);

  const marketTokenPk = new PublicKey(MarketAccounts.data.market.mintAccount);

  const [purchaserTokenAccount, betOrderPdaResponse] = await Promise.all([
    getWalletTokenAccount(program, marketTokenPk),
    findBetOrderPda(program, marketPk, provider.wallet.publicKey),
  ]);

  const betOrderPk = betOrderPdaResponse.data.betOrderPk;
  const distinctSeed = betOrderPdaResponse.data.distinctSeed;

  const tnxID = await program.methods
    .createBet(distinctSeed, {
      marketOutcomeIndex: marketOutcomeIndex,
      backing: backing,
      stake: stake,
      odds: odds,
    })
    .accounts({
      purchaser: provider.wallet.publicKey,
      betOrder: betOrderPk,
      marketPosition: MarketAccounts.data.marketPositionPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      market: marketPk,
      marketMatchingPool: MarketAccounts.data.marketOutcomePoolPda,
      marketOutcome: MarketAccounts.data.marketOutcomePda,
      purchaserToken: purchaserTokenAccount.data.associatedTokenAccount,
      marketEscrow: MarketAccounts.data.escrowPda,
    })
    .signers(provider.wallet instanceof Keypair ? [provider.wallet] : [])
    .rpc({ commitment: "confirmed" })
    .catch((e) => {
      response.addError(e);
    });

  response.addResponseData({
    betOrderPk: betOrderPk,
    tnxID: tnxID,
  });

  return response.body;
}
