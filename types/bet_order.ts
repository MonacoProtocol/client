import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { GetAccount } from "./get_account";

export enum BetOrderStatus {
  Open = 0x00,
  Matched = 0x01,
  SettledWin = 0x02,
  SettledLose = 0x03,
  Cancelled = 0x04,
}

export type Match = {
  odds: number;
  stake: number;
};

export type BetOrder = {
  purchaser: PublicKey;
  market: PublicKey;
  marketOutcomeIndex: number;
  backing: boolean;
  betOrderStatus: BetOrderStatus;
  stake: BN;
  voidedStake: BN;
  expectedOdds: number;
  creationTimestamp: BN;
  stakeUnmatched: BN;
  payout: BN;
  matches: Match[];
};

export type BetOrderAccounts = {
  betOrderAccounts: GetAccount<BetOrder>[];
};

export type CancelBetOrderResponse = {
  betOrderPk: PublicKey;
  tnxID: string;
};

export type CancelBetOrdersResponse = {
  failedCancellationBetOrders: PublicKey[];
  tnxIDs: string[];
};

export type betOrderPdaResponse = {
  betOrderPk: PublicKey;
  distinctSeed: string;
};

export type StakeInteger = {
  stakeInteger: BN;
};
